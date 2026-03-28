import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const includeStats = searchParams.get("includeStats") === "true";
    const potenciales = searchParams.get("potenciales") === "true";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { commercial_name: { contains: search, mode: "insensitive" } },
        { razon_social: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { cuit: { contains: search, mode: "insensitive" } },
        { locality: { contains: search, mode: "insensitive" } },
      ];
    }

    if (potenciales) {
      where.orders = { none: {} };
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: includeStats
          ? {
              _count: { select: { orders: true } },
              orders: {
                select: { total: true },
                take: 1000,
              },
            }
          : undefined,
        orderBy: { commercial_name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    const result = customers.map((c) => {
      const orderCount = includeStats ? (c as { _count?: { orders: number } })._count?.orders || 0 : 0;
      const totalSpent = includeStats
        ? ((c as { orders?: { total: unknown }[] }).orders || []).reduce(
            (sum: number, o: { total: unknown }) => sum + (Number(o.total) || 0),
            0
          )
        : 0;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { orders: _orders, _count: _c, ...rest } = c as Record<string, unknown>;
      return {
        ...rest,
        has_orders: orderCount > 0,
        order_count: orderCount,
        total_spent: totalSpent,
      };
    });

    return NextResponse.json({ customers: result, total, page, limit, totalPages: Math.ceil(total / limit) });
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
      code,
      commercial_name,
      street,
      street_number,
      locality,
      contact_name,
      phone,
      email,
      cuit,
      iva_condition,
      province,
      postal_code,
      latitude,
      longitude,
      customer_type,
      has_time_restriction,
      delivery_window_start,
      delivery_window_end,
    } = body;

    if (!commercial_name || !locality) {
      return NextResponse.json(
        { error: "Campos requeridos: commercial_name, locality" },
        { status: 400 }
      );
    }

    let customerCode = code;
    if (!customerCode) {
      const lastCustomer = await prisma.customer.findFirst({
        where: { code: { startsWith: "CLI-" } },
        orderBy: { code: "desc" },
      });
      const nextNum = lastCustomer
        ? parseInt(lastCustomer.code.replace("CLI-", ""), 10) + 1
        : 1;
      customerCode = `CLI-${String(nextNum).padStart(3, "0")}`;
    }

    const customer = await prisma.customer.create({
      data: {
        code: customerCode,
        commercial_name,
        street: street || "",
        street_number: street_number || "",
        locality,
        contact_name: contact_name ?? undefined,
        phone: phone ?? undefined,
        email: email ?? undefined,
        cuit: cuit ?? undefined,
        iva_condition: iva_condition ?? undefined,
        province: province ?? undefined,
        postal_code: postal_code ?? undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        customer_type: customer_type ?? undefined,
        has_time_restriction: has_time_restriction ?? undefined,
        delivery_window_start: delivery_window_start ?? undefined,
        delivery_window_end: delivery_window_end ?? undefined,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
