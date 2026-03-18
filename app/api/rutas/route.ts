import { NextRequest, NextResponse } from "next/server";
import { rutasInteligentesService } from "@/lib/services/rutas-inteligentes.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const routes = await rutasInteligentesService.getRoutes({
      status: searchParams.get("status") ?? undefined,
      driverId: searchParams.get("driverId") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
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
    const { driverId, scheduledDate, orderIds, optimizationResult, googleMapsUrl } = body;

    const route = await rutasInteligentesService.saveRoute({
      driverId,
      scheduledDate: new Date(scheduledDate),
      orderIds,
      optimizationResult,
      googleMapsUrl,
    });

    return NextResponse.json(route, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
