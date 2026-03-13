import { NextRequest, NextResponse } from "next/server";
import { rutasInteligentesService } from "@/lib/services/rutas-inteligentes.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { routeOrderId, status, notes } = body;

    if (!routeOrderId || !status) {
      return NextResponse.json(
        { error: "routeOrderId and status are required" },
        { status: 400 }
      );
    }

    const result = await rutasInteligentesService.updateDeliveryStatus(
      routeOrderId,
      status,
      notes
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
