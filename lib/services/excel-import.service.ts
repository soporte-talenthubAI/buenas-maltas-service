import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma/client";

interface ExcelRow {
  fecha: Date | null;
  tipoComprobante: string;
  nroComprobante: string;
  vendedor: string;
  codCliente: string;
  razonSocial: string;
  codArticulo: string;
  descripcion: string;
  precioNeto: number;
  umStock: string;
  cantidad: number;
  precioLista: number;
  total: number;
  descuentoPct: number;
  textosAdicionales: string;
  codDireccionEntrega: string;
  tipoComercio: string;
  condicionVta: string;
}

interface ImportResult {
  status: "completed" | "error";
  totalRows: number;
  ordersCreated: number;
  ordersSkipped: number;
  ordersFailed: number;
  customersCreated: number;
  customersMatched: number;
  productsCreated: number;
  unmatchedProducts: string[];
  errors: string[];
  duration: number;
}

function parseNumber(val: unknown): number {
  if (val == null || val === "") return 0;
  if (typeof val === "number") return val;
  const s = String(val).replace(/\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseDate(val: unknown): Date | null {
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  if (typeof val === "string" && val.trim()) {
    // Try "M/D/YY" format from the CSV output
    const parts = val.trim().split("/");
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(year, month - 1, day);
      }
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function parseExcelFile(buffer: Buffer): ExcelRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const sheetName = workbook.SheetNames.find((n) => n.toLowerCase().includes("datos")) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to array of arrays
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  // Find header row (contains "Nro. comprobante")
  let headerIdx = 2; // default
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const row = raw[i];
    if (row && row.some((cell) => String(cell).includes("Nro. comprobante"))) {
      headerIdx = i;
      break;
    }
  }

  const rows: ExcelRow[] = [];

  for (let i = headerIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || !r[3]) continue; // skip empty rows (no Nro comprobante)

    const nroComprobante = String(r[3] || "").trim();
    if (!nroComprobante || nroComprobante === "0") continue;

    rows.push({
      fecha: parseDate(r[1]),
      tipoComprobante: String(r[2] || "").trim(),
      nroComprobante,
      vendedor: String(r[4] || "").trim(),
      codCliente: String(r[5] || "").trim(),
      razonSocial: String(r[6] || "").trim(),
      codArticulo: String(r[7] || "").trim(),
      descripcion: String(r[8] || "").trim(),
      precioNeto: parseNumber(r[9]),
      umStock: String(r[10] || "").trim(),
      cantidad: parseNumber(r[11]),
      precioLista: parseNumber(r[12]),
      total: parseNumber(r[13]),
      descuentoPct: parseNumber(r[14]),
      textosAdicionales: String(r[15] || "").trim(),
      codDireccionEntrega: String(r[16] || "").trim(),
      tipoComercio: String(r[17] || "").trim(),
      condicionVta: String(r[18] || "").trim(),
    });
  }

  return rows;
}

// Group rows by invoice number
function groupByInvoice(rows: ExcelRow[]): Map<string, ExcelRow[]> {
  const map = new Map<string, ExcelRow[]>();
  for (const row of rows) {
    const key = row.nroComprobante;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return map;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

async function processImport(buffer: Buffer, userId: string): Promise<ImportResult> {
  const start = Date.now();
  const result: ImportResult = {
    status: "completed",
    totalRows: 0,
    ordersCreated: 0,
    ordersSkipped: 0,
    ordersFailed: 0,
    customersCreated: 0,
    customersMatched: 0,
    productsCreated: 0,
    unmatchedProducts: [],
    errors: [],
    duration: 0,
  };

  try {
    const rows = parseExcelFile(buffer);
    result.totalRows = rows.length;

    if (rows.length === 0) {
      result.status = "error";
      result.errors.push("No se encontraron datos en el Excel");
      result.duration = Date.now() - start;
      return result;
    }

    const invoices = groupByInvoice(rows);

    // Pre-fetch existing data for matching
    const existingCustomers = await prisma.customer.findMany({
      select: { id: true, code: true, commercial_name: true },
    });
    const customerByCode = new Map(existingCustomers.map((c) => [c.code, c]));
    const customerByName = new Map(existingCustomers.map((c) => [normalizeName(c.commercial_name), c]));

    const existingProducts = await prisma.product.findMany({
      select: { id: true, code: true, name: true },
    });
    const productByCode = new Map(existingProducts.map((p) => [p.code, p]));

    const existingTangoIds = new Set(
      (await prisma.order.findMany({ where: { tango_id: { not: null } }, select: { tango_id: true } }))
        .map((o) => o.tango_id!)
    );

    // Track newly created customers to avoid duplicates within import
    const newCustomerCache = new Map<string, string>(); // code → id

    // Process invoices in batches
    const invoiceEntries = Array.from(invoices.entries());
    const BATCH_SIZE = 50;

    for (let batch = 0; batch < invoiceEntries.length; batch += BATCH_SIZE) {
      const batchEntries = invoiceEntries.slice(batch, batch + BATCH_SIZE);

      for (const [nroComprobante, items] of batchEntries) {
        try {
          // Deduplication check
          if (existingTangoIds.has(nroComprobante)) {
            result.ordersSkipped++;
            continue;
          }

          const firstItem = items[0];

          // Match or create customer
          let customerId: string;
          const codCliente = firstItem.codCliente;
          const razonSocial = firstItem.razonSocial;

          const matchedByCode = customerByCode.get(codCliente);
          const matchedByName = customerByName.get(normalizeName(razonSocial));
          const matchedFromCache = newCustomerCache.get(codCliente);

          if (matchedByCode) {
            customerId = matchedByCode.id;
            result.customersMatched++;
          } else if (matchedByName) {
            customerId = matchedByName.id;
            result.customersMatched++;
          } else if (matchedFromCache) {
            customerId = matchedFromCache;
            result.customersMatched++;
          } else {
            // Create new customer
            const newCustomer = await prisma.customer.create({
              data: {
                code: codCliente || `IMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                commercial_name: razonSocial || "Sin nombre",
                street: "Sin especificar",
                street_number: "-",
                locality: "Córdoba",
                sales_channel: firstItem.tipoComercio || "Sin especificar",
              },
            });
            customerId = newCustomer.id;
            newCustomerCache.set(codCliente, customerId);
            customerByCode.set(codCliente, { id: customerId, code: codCliente, commercial_name: razonSocial });
            customerByName.set(normalizeName(razonSocial), { id: customerId, code: codCliente, commercial_name: razonSocial });
            result.customersCreated++;
          }

          // Track unmatched products
          for (const item of items) {
            if (item.codArticulo && !productByCode.has(item.codArticulo)) {
              const key = `${item.codArticulo} - ${item.descripcion}`;
              if (!result.unmatchedProducts.includes(key)) {
                result.unmatchedProducts.push(key);
              }
            }
          }

          // Calculate order totals
          const orderSubtotal = items.reduce((sum, item) => sum + Math.abs(item.total), 0);
          const orderDiscount = items.reduce((sum, item) => sum + item.descuentoPct, 0) / items.length;
          const orderTotal = orderSubtotal;

          const orderDate = firstItem.fecha || new Date();

          // Create order + items in transaction
          await prisma.$transaction(async (tx) => {
            const order = await tx.order.create({
              data: {
                order_number: `TANGO-${nroComprobante}`,
                customer_id: customerId,
                order_date: orderDate,
                status: "entregado",
                priority: "normal",
                subtotal: orderSubtotal,
                discount: orderDiscount,
                total: orderTotal,
                payment_method: firstItem.condicionVta || null,
                order_type: "tango_import",
                observations: `Importado desde Excel - Vendedor: ${firstItem.vendedor}`,
                origin: "excel_import",
                tango_id: nroComprobante,
                created_by_id: userId,
              },
            });

            for (const item of items) {
              await tx.orderItem.create({
                data: {
                  order_id: order.id,
                  product_code: item.codArticulo,
                  product_name: item.descripcion,
                  quantity: Math.abs(item.cantidad),
                  unit_price: item.precioNeto || item.precioLista,
                  subtotal: Math.abs(item.total),
                },
              });
            }
          });

          existingTangoIds.add(nroComprobante);
          result.ordersCreated++;
        } catch (error) {
          result.ordersFailed++;
          result.errors.push(`Error en factura ${nroComprobante}: ${(error as Error).message}`);
        }
      }
    }

    // Create products that don't exist yet
    if (result.unmatchedProducts.length > 0) {
      for (const entry of result.unmatchedProducts) {
        const [code, name] = entry.split(" - ");
        if (code && !productByCode.has(code.trim())) {
          try {
            await prisma.product.create({
              data: {
                code: code.trim(),
                name: name?.trim() || "Producto importado",
                unit_price: 0,
                brand: resolveBrandFromUM(rows.find((r) => r.codArticulo === code.trim())?.umStock || ""),
              },
            });
            productByCode.set(code.trim(), { id: "", code: code.trim(), name: name?.trim() || "" });
            result.productsCreated++;
          } catch {
            // Product may have been created by another concurrent import
          }
        }
      }
    }
  } catch (error) {
    result.status = "error";
    result.errors.push(`Error general: ${(error as Error).message}`);
  }

  result.duration = Date.now() - start;
  return result;
}

// Resolve brand from U.M. stock code in Excel
function resolveBrandFromUM(um: string): string {
  const umUpper = um.toUpperCase();
  if (umUpper === "LAT" || umUpper === "BID" || umUpper === "BAR") return "Träumer";
  if (umUpper === "BA") return "Vitea";
  if (umUpper === "GOL") return "Beermut";
  if (umUpper === "PAR") return "Mixology";
  if (umUpper === "UNI") return "Servicio";
  return "Buenas Maltas";
}

export const excelImportService = {
  parseExcelFile,
  processImport,
};
