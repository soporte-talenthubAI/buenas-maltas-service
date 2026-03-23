import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { pedidosService } from "@/lib/services/pedidos.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await pedidosService.findById(id);

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    const {
      items,
      status,
      priority,
      delivery_date,
      observations,
      payment_method,
      order_type,
      discount,
    } = body;

    // Build update data (only include provided fields)
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (delivery_date !== undefined)
      updateData.delivery_date = delivery_date ? new Date(delivery_date) : null;
    if (observations !== undefined) updateData.observations = observations;
    if (payment_method !== undefined) updateData.payment_method = payment_method;
    if (order_type !== undefined) updateData.order_type = order_type;
    if (discount !== undefined) updateData.discount = discount;

    // If items are provided, recalculate totals and replace items
    if (items && Array.isArray(items)) {
      const orderItems = items.map(
        (item: { product_code: string; product_name: string; quantity: number; unit_price: number }) => ({
          product_code: item.product_code,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: Number(item.quantity) * Number(item.unit_price),
        })
      );

      const subtotal = orderItems.reduce(
        (sum: number, item: { subtotal: number }) => sum + item.subtotal,
        0
      );
      const discountPercent = Number(discount ?? existing.discount ?? 0);
      const total = subtotal * (1 - discountPercent / 100);

      updateData.subtotal = subtotal;
      updateData.total = total;
      updateData.discount = discountPercent;

      // Delete existing items and recreate within a transaction
      const order = await prisma.$transaction(async (tx) => {
        await tx.orderItem.deleteMany({ where: { order_id: id } });

        return tx.order.update({
          where: { id },
          data: {
            ...updateData,
            items: {
              create: orderItems,
            },
          },
          include: {
            items: true,
            customer: {
              select: { id: true, commercial_name: true },
            },
          },
        });
      });

      return NextResponse.json(order);
    }

    // Update without items
    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        customer: {
          select: { id: true, commercial_name: true },
        },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
