import { NextRequest, NextResponse } from "next/server";
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
