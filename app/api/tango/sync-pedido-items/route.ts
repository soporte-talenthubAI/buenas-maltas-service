import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { tangoService } from "@/lib/services/tango.service";

/**
 * POST /api/tango/sync-pedido-items
 *
 * Fetches line items (renglones) for Tango orders that don't have items yet.
 * Uses GetById on each pedido to get its detailed renglones.
 *
 * Query params:
 *   - limit: max pedidos to process (default 100)
 *   - force: re-fetch items even if order already has items
 */

interface TangoRenglon {
  COD_ARTICU: string;
  DESCRIPCION_ARTICULO?: string;
  DESCRIPCIO?: string;
  CANTIDAD: number;
  PRECIO: number;
  IMPORTE: number;
  PORCENTAJE_BONIFICACION?: number;
  PORC_BONIF?: number;
  MEDIDA_STOCK?: string;
  MEDIDA_STOCK_CODIGO?: string;
  UM?: string;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const force = searchParams.get("force") === "true";

    // Find Tango orders that need items
    const ordersQuery = {
      where: {
        origin: "tango",
        tango_id: { not: null as string | null },
        ...(force ? {} : { items: { none: {} } }),
      },
      select: {
        id: true,
        tango_id: true,
        order_number: true,
        _count: { select: { items: true } },
      },
      take: limit,
      orderBy: { order_date: "desc" as const },
    };

    const orders = await prisma.order.findMany(ordersQuery);

    if (orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay pedidos Tango sin items para procesar",
        processed: 0,
        itemsCreated: 0,
        errors: 0,
      });
    }

    let processed = 0;
    let itemsCreated = 0;
    let errors = 0;
    let skipped = 0;
    const errorDetails: string[] = [];

    for (const order of orders) {
      try {
        const tangoId = parseInt(order.tango_id!, 10);
        if (isNaN(tangoId)) {
          skipped++;
          continue;
        }

        // Fetch detailed pedido from Tango API
        const response = await tangoService.getPedidoById(tangoId);

        if (!response.succeeded || !response.resultData) {
          errorDetails.push(`Pedido ${order.order_number}: Tango API error - ${response.message}`);
          errors++;
          continue;
        }

        const pedidoDetail = response.resultData;

        // Tango GetById returns renglones in various possible field names
        const renglones: TangoRenglon[] =
          (pedidoDetail.Renglones as TangoRenglon[]) ||
          (pedidoDetail.renglones as TangoRenglon[]) ||
          (pedidoDetail.RENGLONES as TangoRenglon[]) ||
          (pedidoDetail.Items as TangoRenglon[]) ||
          (pedidoDetail.items as TangoRenglon[]) ||
          (pedidoDetail.Detalle as TangoRenglon[]) ||
          (pedidoDetail.detalle as TangoRenglon[]) ||
          [];

        if (renglones.length === 0) {
          // Log the keys to help debug what field names Tango uses
          const keys = Object.keys(pedidoDetail);
          errorDetails.push(
            `Pedido ${order.order_number} (tango_id=${tangoId}): sin renglones. Keys: ${keys.join(", ")}`
          );
          skipped++;
          continue;
        }

        // If force mode, delete existing items first
        if (force && order._count.items > 0) {
          await prisma.orderItem.deleteMany({ where: { order_id: order.id } });
        }

        // Create OrderItems from renglones
        for (const renglon of renglones) {
          const productCode = (renglon.COD_ARTICU || "").toString().trim();
          const productName =
            (renglon.DESCRIPCION_ARTICULO || renglon.DESCRIPCIO || productCode || "").toString().trim();
          const quantity = Math.abs(Number(renglon.CANTIDAD || 0));
          const unitPrice = Number(renglon.PRECIO || 0);
          const subtotal = Math.abs(Number(renglon.IMPORTE || quantity * unitPrice));
          const discountPercent = Number(
            renglon.PORCENTAJE_BONIFICACION || renglon.PORC_BONIF || 0
          );

          if (!productCode && !productName) continue;
          if (quantity === 0) continue;

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

        processed++;
      } catch (e) {
        const msg = (e as Error).message;
        errorDetails.push(`Pedido ${order.order_number}: ${msg}`);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      totalOrders: orders.length,
      processed,
      itemsCreated,
      skipped,
      errors,
      errorDetails: errorDetails.slice(0, 20), // limit output
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
