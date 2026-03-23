import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const route = await prisma.visitRoute.findUnique({
      where: { id },
      include: {
        vendedor: { select: { id: true, name: true, email: true } },
        stops: {
          include: {
            customer: {
              select: {
                id: true,
                code: true,
                commercial_name: true,
                contact_name: true,
                phone: true,
                street: true,
                street_number: true,
                locality: true,
                latitude: true,
                longitude: true,
                customer_type: true,
              },
            },
          },
          orderBy: { visit_order: "asc" },
        },
      },
    });

    if (!route) {
      return NextResponse.json(
        { error: "Ruta de visita no encontrada" },
        { status: 404 }
      );
    }

    // Add order count per customer to identify potentials
    const customerIds = route.stops.map((s) => s.customer_id);
    const orderCounts = await prisma.order.groupBy({
      by: ["customer_id"],
      where: { customer_id: { in: customerIds } },
      _count: { id: true },
    });
    const countMap = new Map(orderCounts.map((o) => [o.customer_id, o._count.id]));

    const stopsWithStats = route.stops.map((stop) => ({
      ...stop,
      customer: {
        ...stop.customer,
        order_count: countMap.get(stop.customer_id) || 0,
      },
    }));

    return NextResponse.json({ ...route, stops: stopsWithStats });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
