import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { tangoService } from "@/lib/services/tango.service";

interface TangoPedidoRaw {
  ID_GVA21: number;
  NRO_PEDIDO: string;
  CODIGO_CLIENTE: string;
  RAZON_SOCIAL_CLIENTE: string;
  FECHA_PEDI: string;
  FECHA_ENTR: string | null;
  ESTADO: number; // 1=pendiente, 2=parcial, 3=finalizado
  TOTAL_PEDI: number;
  TOTAL: number;
  NOMBRE_VEN: string;
  COD_GVA23: string;
  DESCRIPCION_CONDICION_VENTA: string;
  NOMBRE_SUC: string;
  NOMBRE_LIS: string;
  N_REMITO: string | null;
  SIMBOLO_MONEDA: string;
  PORC_DESC: number;
  [key: string]: unknown;
}

const TANGO_STATUS_MAP: Record<number, string> = {
  1: "pendiente",
  2: "confirmado",
  3: "entregado",
};

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const maxPages = parseInt(searchParams.get("maxPages") || "200", 10);

    const systemUser = await prisma.user.findFirst({ where: { role: "admin" } });
    if (!systemUser) {
      return NextResponse.json({ error: "No hay usuario admin para asignar pedidos" }, { status: 400 });
    }

    const pedidos = await tangoService.getAllPages<TangoPedidoRaw>(19845, 50, maxPages);

    if (pedidos.length === 0) {
      return NextResponse.json({ error: "No se pudieron obtener pedidos de Tango" }, { status: 502 });
    }

    let created = 0;
    let skippedExisting = 0;
    let skippedNoCustomer = 0;
    let errors = 0;

    for (const ped of pedidos) {
      const tangoId = String(ped.ID_GVA21);
      const nroPedido = ped.NRO_PEDIDO?.trim();
      if (!nroPedido) { errors++; continue; }

      // Skip if already imported
      const existing = await prisma.order.findFirst({ where: { tango_id: tangoId } });
      if (existing) { skippedExisting++; continue; }

      // Find customer by code
      const customerCode = ped.CODIGO_CLIENTE?.trim();
      let customer = customerCode
        ? await prisma.customer.findUnique({ where: { code: customerCode } })
        : null;

      if (!customer && customerCode) {
        customer = await prisma.customer.create({
          data: {
            code: customerCode,
            commercial_name: ped.RAZON_SOCIAL_CLIENTE?.trim() || customerCode,
            street: "",
            street_number: "",
            locality: "Sin especificar",
          },
        });
      }

      if (!customer) { skippedNoCustomer++; continue; }

      const total = ped.TOTAL_PEDI || ped.TOTAL || 0;
      const estado = TANGO_STATUS_MAP[ped.ESTADO] || "pendiente";

      try {
        await prisma.order.create({
          data: {
            order_number: `TANGO-${nroPedido.replace(/\s/g, "")}`,
            customer: { connect: { id: customer.id } },
            created_by: { connect: { id: systemUser.id } },
            order_date: new Date(ped.FECHA_PEDI),
            delivery_date: ped.FECHA_ENTR ? new Date(ped.FECHA_ENTR) : null,
            status: estado as "pendiente" | "confirmado" | "entregado",
            subtotal: total,
            discount: Number(ped.PORC_DESC || 0),
            total: total,
            origin: "tango",
            tango_id: tangoId,
            tango_estado: ped.ESTADO,
            vendedor_nombre: ped.NOMBRE_VEN?.trim() || null,
            condicion_venta: ped.DESCRIPCION_CONDICION_VENTA?.trim() || null,
            deposito: ped.NOMBRE_SUC?.trim() || null,
            lista_precio: ped.NOMBRE_LIS?.trim() || null,
            remito_nro: ped.N_REMITO?.trim() || null,
            moneda: ped.SIMBOLO_MONEDA?.trim() || "$",
          },
        });
        created++;
      } catch (e) {
        console.error(`[Tango Sync] Error importing pedido ${nroPedido}:`, (e as Error).message);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      totalFromTango: pedidos.length,
      created,
      skippedExisting,
      skippedNoCustomer,
      errors,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
