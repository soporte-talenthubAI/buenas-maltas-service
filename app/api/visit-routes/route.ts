import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendedorId = searchParams.get("vendedorId");
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Record<string, unknown> = {};
    if (vendedorId) where.vendedor_id = vendedorId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.scheduled_date = {};
      if (dateFrom) (where.scheduled_date as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.scheduled_date as Record<string, unknown>).lte = new Date(dateTo + "T23:59:59");
    }

    const routes = await prisma.visitRoute.findMany({
      where,
      include: {
        vendedor: { select: { id: true, name: true, email: true } },
        stops: {
          include: {
            customer: {
              select: {
                id: true,
                code: true,
                commercial_name: true,
                street: true,
                street_number: true,
                locality: true,
                phone: true,
                latitude: true,
                longitude: true,
              },
            },
          },
          orderBy: { visit_order: "asc" },
        },
      },
      orderBy: { scheduled_date: "desc" },
    });

    return NextResponse.json(routes);
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
      vendedor_id,
      scheduled_date,
      customer_ids,
      google_maps_url,
      total_distance_km,
      estimated_duration,
      optimized_route,
    } = body;

    if (!vendedor_id || !scheduled_date || !customer_ids?.length) {
      return NextResponse.json(
        { error: "Vendedor, fecha y al menos un cliente son requeridos" },
        { status: 400 }
      );
    }

    // Generate route code
    const count = await prisma.visitRoute.count();
    const routeCode = `VIS-${String(count + 1).padStart(4, "0")}`;

    const route = await prisma.visitRoute.create({
      data: {
        route_code: routeCode,
        vendedor_id,
        scheduled_date: new Date(scheduled_date),
        google_maps_url: google_maps_url || null,
        total_distance_km: total_distance_km || null,
        estimated_duration: estimated_duration || null,
        optimized_route: optimized_route || null,
        stops: {
          create: (customer_ids as string[]).map((customerId: string, index: number) => ({
            customer_id: customerId,
            visit_order: index + 1,
          })),
        },
      },
      include: {
        vendedor: { select: { id: true, name: true } },
        stops: {
          include: {
            customer: {
              select: { id: true, commercial_name: true, locality: true },
            },
          },
          orderBy: { visit_order: "asc" },
        },
      },
    });

    return NextResponse.json(route, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
