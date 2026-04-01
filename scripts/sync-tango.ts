import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5433/buenas_maltas?schema=public";

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Import tango service dynamically
async function main() {
  // We need to load env vars
  const dotenv = await import("dotenv");
  dotenv.config({ path: ".env" });
  dotenv.config({ path: ".env.local" });

  const TANGO_URL = process.env.TANGO_API_URL || "http://cc400d745aa4.sn.mynetname.net:47000";
  const TANGO_TOKEN = process.env.TANGO_API_TOKEN || "";
  const TANGO_COMPANY = process.env.TANGO_COMPANY_ID || "5";

  if (!TANGO_TOKEN) {
    console.error("TANGO_API_TOKEN no configurado en .env");
    process.exit(1);
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ApiAuthorization: TANGO_TOKEN,
    Company: TANGO_COMPANY,
  };

  async function tangoGet(processId: number, pageIndex = 0, pageSize = 50) {
    const url = `${TANGO_URL}/api/Get?process=${processId}&pageSize=${pageSize}&pageIndex=${pageIndex}&view=`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Tango API error: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async function getAllPages(processId: number, pageSize = 50) {
    const all: Record<string, unknown>[] = [];
    let pageIndex = 0;
    while (true) {
      const data = await tangoGet(processId, pageIndex, pageSize);
      const rows = data?.resultData?.list || data?.Data || [];
      if (rows.length === 0) break;
      all.push(...rows);
      if (rows.length < pageSize) break;
      pageIndex++;
    }
    return all;
  }

  // ─── SYNC ARTICULOS ───────────────────────────────────────
  console.log("Sincronizando artículos...");
  const articulos = await getAllPages(87, 50);
  console.log(`  ${articulos.length} artículos de Tango`);

  let artCreated = 0, artUpdated = 0, artSkipped = 0;
  for (const art of articulos) {
    const code = (art.COD_STA11 as string)?.trim();
    if (!code || code.toLowerCase().startsWith("zzzzzz")) { artSkipped++; continue; }

    const name = (art.DESCRIPCIO as string)?.trim() || code;
    const tangoId = art.ID_STA11 as number;
    const hasStock = art.STOCK !== false;

    // Resolve brand from name
    const nameLower = name.toLowerCase();
    let brand = "Otro";
    if (nameLower.includes("träumer") || nameLower.includes("traumer") || nameLower.includes("golden") || nameLower.includes("wheat") || nameLower.includes("amber") || nameLower.includes("porter") || nameLower.includes("ipa") || nameLower.includes("apa") || nameLower.includes("tripel") || nameLower.includes("session") || nameLower.includes("lab ") || nameLower.includes("chopp") || nameLower.includes("barril")) {
      brand = "Träumer";
    } else if (nameLower.includes("vitea") || nameLower.includes("komb")) {
      brand = "Vitea";
    } else if (nameLower.includes("beermut")) {
      brand = "Beermut";
    } else if (nameLower.includes("mixology")) {
      brand = "Mixology";
    }

    const data = {
      name,
      brand,
      tango_id: tangoId,
      has_stock: hasStock,
      um_stock: (art.MEDIDA_STOCK_CODIGO as string)?.trim() || null,
      um_ventas: (art.MEDIDA_VENTAS_CODIGO as string)?.trim() || null,
      barcode: (art.COD_BARRA as string)?.trim() || null,
      synonym: (art.SINONIMO as string)?.trim() || null,
    };

    const existing = await prisma.product.findUnique({ where: { code } });
    if (existing) {
      await prisma.product.update({ where: { code }, data });
      artUpdated++;
    } else {
      await prisma.product.create({
        data: { code, ...data, unit_price: 0, category: "general", unit: "unidad" },
      });
      artCreated++;
    }
  }
  console.log(`  Artículos: ${artCreated} creados, ${artUpdated} actualizados, ${artSkipped} omitidos`);

  // ─── SYNC CLIENTES ────────────────────────────────────────
  console.log("\nSincronizando clientes...");
  const clientes = await getAllPages(2117, 50);
  console.log(`  ${clientes.length} clientes de Tango`);

  let cliCreated = 0, cliUpdated = 0, cliSkipped = 0;
  for (const cli of clientes) {
    const code = (cli.COD_GVA14 as string)?.trim();
    const razonSocial = (cli.RAZON_SOCI as string)?.trim();
    if (!code || !razonSocial) { cliSkipped++; continue; }

    const commercialName = (cli.NOM_COM as string)?.trim() || razonSocial;
    const cuit = (cli.CUIT as string)?.trim();

    const data = {
      commercial_name: commercialName,
      razon_social: razonSocial,
      phone: (cli.TELEFONO_1 as string)?.trim() || null,
      email: (cli.E_MAIL as string)?.trim() || null,
      cuit: cuit && cuit !== "00-00000000-0" ? cuit : null,
      iva_condition: (cli.COD_CATEGORIA_IVA as string) || null,
      street: (cli.DOMICILIO as string)?.trim() || "",
      street_number: "",
      locality: (cli.LOCALIDAD as string)?.trim() || "Sin especificar",
      province: (cli.GVA18_DESCRIPCION as string)?.trim() || "Córdoba",
      postal_code: (cli.C_POSTAL as string)?.trim() || null,
      delivery_address: (cli.DIR_COM as string)?.trim() || null,
      horario_cobranza: (cli.HORARIO_COBRANZA as string)?.trim() || null,
      sales_channel: (cli.CA_1096_TIPO_DE_COMERCIO as string)?.trim() || "Sin especificar",
      tango_id: cli.ID_GVA14 as number,
      condicion_venta: (cli.GVA01_DESC_COND as string)?.trim() || null,
      zona: (cli.GVA05_DESCRIPCION as string)?.trim() || null,
      vendedor_cod: (cli.COD_GVA23 as string)?.trim() || null,
      is_active: cli.HABILITADO !== false,
    };

    const existing = await prisma.customer.findUnique({ where: { code } });
    if (existing) {
      await prisma.customer.update({ where: { code }, data });
      cliUpdated++;
    } else {
      await prisma.customer.create({ data: { code, ...data } });
      cliCreated++;
    }
  }
  console.log(`  Clientes: ${cliCreated} creados, ${cliUpdated} actualizados, ${cliSkipped} omitidos`);

  // Get admin user for created_by
  const adminUser = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!adminUser) {
    console.error("No se encontró usuario admin. Ejecutá prisma db seed primero.");
    process.exit(1);
  }

  // ─── SYNC PEDIDOS ─────────────────────────────────────────
  console.log("\nSincronizando pedidos...");
  const pedidos = await getAllPages(19845, 50);
  console.log(`  ${pedidos.length} pedidos de Tango`);

  let ordCreated = 0, ordUpdated = 0, ordSkipped = 0;
  for (const ped of pedidos) {
    const tangoIdRaw = ped.ID_GVA21 as number;
    if (!tangoIdRaw) { ordSkipped++; continue; }
    const tangoId = String(tangoIdRaw);

    // Check if already exists
    const existing = await prisma.order.findFirst({ where: { tango_id: tangoId } });
    if (existing) { ordSkipped++; continue; }

    const nroComp = (ped.NRO_PEDIDO as string)?.trim() || String(tangoId);
    const codCliente = (ped.CODIGO_CLIENTE as string)?.trim() || (ped.COD_GVA14 as string)?.trim();
    const estado = ped.ESTADO as number;

    // Find customer
    let customerId: string | null = null;
    if (codCliente) {
      const customer = await prisma.customer.findUnique({ where: { code: codCliente } });
      if (customer) {
        customerId = customer.id;
      } else {
        // Create minimal customer
        const newCustomer = await prisma.customer.create({
          data: {
            code: codCliente,
            commercial_name: (ped.RAZON_SOCIAL_CLIENTE as string)?.trim() || codCliente,
            street: "",
            street_number: "",
            locality: "Sin especificar",
          },
        });
        customerId = newCustomer.id;
      }
    }

    if (!customerId) {
      if (ordSkipped < 3) console.log(`  [debug] skip: no customerId for tango_id=${tangoId} codCliente=${codCliente}`);
      ordSkipped++; continue;
    }

    // Map status: 1=pendiente, 2=confirmado/parcial, 3=entregado/finalizado
    let status: "pendiente" | "confirmado" | "entregado" = "pendiente";
    if (estado === 2) status = "confirmado";
    if (estado === 3) status = "entregado";

    const orderDate = ped.FECHA_PEDI ? new Date(ped.FECHA_PEDI as string) : new Date();
    const total = Number(ped.TOTAL_PEDI || ped.TOTAL || 0);
    const remito = (ped.N_REMITO as string)?.trim() || null;

    try {
      await prisma.order.create({
        data: {
          order_number: `TANGO-${nroComp}`,
          customer: { connect: { id: customerId } },
          created_by: { connect: { id: adminUser.id } },
          order_date: orderDate,
          status,
          subtotal: total,
          discount: Number(ped.PORC_DESC || 0),
          total,
          tango_id: tangoId,
          tango_estado: estado ?? null,
          vendedor_nombre: (ped.NOMBRE_VEN as string)?.trim() || null,
          condicion_venta: (ped.DESCRIPCION_CONDICION_VENTA as string)?.trim() || null,
          deposito: (ped.NOMBRE_SUC as string)?.trim() || null,
          lista_precio: (ped.NOMBRE_LIS as string)?.trim() || null,
          remito_nro: remito,
          moneda: (ped.SIMBOLO_MONEDA as string)?.trim() || "$",
          origin: "tango",
        },
      });
      ordCreated++;
    } catch (e) {
      if (ordSkipped < 1) console.log(`  [debug] FULL ERROR for order ${nroComp}:`, (e as Error).message);
      ordSkipped++;
    }
  }
  console.log(`  Pedidos: ${ordCreated} creados, ${ordUpdated} actualizados, ${ordSkipped} omitidos`);

  // ─── SYNC PEDIDO ITEMS (RENGLONES) ──────────────────────
  console.log("\nSincronizando renglones de pedidos...");
  const ordersWithoutItems = await prisma.order.findMany({
    where: { origin: "tango", tango_id: { not: null }, items: { none: {} } },
    select: { id: true, tango_id: true, order_number: true },
    take: 500,
  });
  console.log(`  ${ordersWithoutItems.length} pedidos sin items`);

  let itemsCreated = 0, itemsErrors = 0;
  for (let i = 0; i < ordersWithoutItems.length; i++) {
    const order = ordersWithoutItems[i];
    const tangoIdNum = parseInt(order.tango_id!, 10);
    if (isNaN(tangoIdNum)) continue;

    try {
      const url = `${TANGO_URL}/api/GetById?process=19845&id=${tangoIdNum}&view=`;
      const res = await fetch(url, { headers });
      if (!res.ok) { itemsErrors++; continue; }
      const data = await res.json();

      const pedidoDetail = data?.resultData || data;
      const renglones: Record<string, unknown>[] =
        (pedidoDetail?.Renglones || pedidoDetail?.renglones || pedidoDetail?.RENGLONES ||
         pedidoDetail?.Items || pedidoDetail?.items || pedidoDetail?.Detalle ||
         pedidoDetail?.detalle || []) as Record<string, unknown>[];

      if (renglones.length === 0) {
        if (i < 3) {
          const keys = Object.keys(pedidoDetail || {});
          console.log(`  [debug] Pedido ${order.order_number}: sin renglones. Keys: ${keys.join(", ")}`);
        }
        continue;
      }

      for (const renglon of renglones) {
        const productCode = String(renglon.COD_ARTICU || "").trim();
        const productName = String(renglon.DESCRIPCION_ARTICULO || renglon.DESCRIPCIO || productCode || "").trim();
        const quantity = Math.abs(Number(renglon.CANTIDAD || 0));
        const unitPrice = Number(renglon.PRECIO || 0);
        const subtotal = Math.abs(Number(renglon.IMPORTE || quantity * unitPrice));
        const discountPercent = Number(renglon.PORCENTAJE_BONIFICACION || renglon.PORC_BONIF || 0);

        if ((!productCode && !productName) || quantity === 0) continue;

        await prisma.orderItem.create({
          data: {
            order_id: order.id,
            product_code: productCode,
            product_name: productName,
            quantity,
            unit_price: unitPrice,
            discount_percent: discountPercent,
            subtotal,
          },
        });
        itemsCreated++;
      }

      if ((i + 1) % 100 === 0) console.log(`  Procesados ${i + 1}/${ordersWithoutItems.length}...`);
    } catch (e) {
      itemsErrors++;
      if (itemsErrors <= 3) console.log(`  [error] ${order.order_number}: ${(e as Error).message}`);
    }
  }
  console.log(`  Items: ${itemsCreated} creados, ${itemsErrors} errores`);

  // Summary
  const totalCustomers = await prisma.customer.count();
  const totalProducts = await prisma.product.count();
  const totalOrders = await prisma.order.count();

  const totalItems = await prisma.orderItem.count();

  console.log("\n=== Resumen DB ===");
  console.log(`Clientes: ${totalCustomers}`);
  console.log(`Productos: ${totalProducts}`);
  console.log(`Pedidos: ${totalOrders}`);
  console.log(`Items: ${totalItems}`);
  console.log("\nSincronización completada!");
}

main()
  .catch((e) => {
    console.error("Error:", e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
