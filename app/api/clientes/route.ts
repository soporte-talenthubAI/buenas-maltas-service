import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      where: { is_active: true },
      orderBy: { commercial_name: "asc" },
    });

    return NextResponse.json(customers);
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

    // Validate required fields
    if (!commercial_name || !street || !street_number || !locality) {
      return NextResponse.json(
        { error: "Campos requeridos: commercial_name, street, street_number, locality" },
        { status: 400 }
      );
    }

    // Auto-generate code if not provided
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
        street,
        street_number,
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
