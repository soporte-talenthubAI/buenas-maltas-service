import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { pedidosService } from "@/lib/services/pedidos.service";
import type { OrderStatus, OrderPriority } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const result = await pedidosService.findAll({
      status: searchParams.get("status") as OrderStatus | undefined,
      priority: searchParams.get("priority") as OrderPriority | undefined,
      customerId: searchParams.get("customerId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 20,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      customer_id,
      items,
      delivery_date,
      priority,
      payment_method,
      order_type,
      observations,
      discount,
      created_by_id,
    } = body;

    // Validate required fields
    if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Campos requeridos: customer_id, items (array no vacío)" },
        { status: 400 }
      );
    }

    if (!created_by_id) {
      return NextResponse.json(
        { error: "Campo requerido: created_by_id" },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.product_code || !item.product_name || !item.quantity || !item.unit_price) {
        return NextResponse.json(
          { error: "Cada item requiere: product_code, product_name, quantity, unit_price" },
          { status: 400 }
        );
      }
    }

    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customer_id },
    });
    if (!customer) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // Auto-generate order_number
    const lastOrder = await prisma.order.findFirst({
      where: { order_number: { startsWith: "PED-" } },
      orderBy: { order_number: "desc" },
    });
    const nextNum = lastOrder
      ? parseInt(lastOrder.order_number.replace("PED-", ""), 10) + 1
      : 1;
    const orderNumber = `PED-${String(nextNum).padStart(4, "0")}`;

    // Calculate subtotal and total
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
    const discountPercent = Number(discount ?? 0);
    const total = subtotal * (1 - discountPercent / 100);

    const order = await prisma.order.create({
      data: {
        order_number: orderNumber,
        customer_id,
        order_date: new Date(),
        delivery_date: delivery_date ? new Date(delivery_date) : undefined,
        priority: priority ?? undefined,
        payment_method: payment_method ?? undefined,
        order_type: order_type ?? undefined,
        observations: observations ?? undefined,
        discount: discountPercent,
        subtotal,
        total,
        created_by_id,
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

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
