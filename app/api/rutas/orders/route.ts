import { NextRequest, NextResponse } from "next/server";
import { rutasInteligentesService } from "@/lib/services/rutas-inteligentes.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orders = await rutasInteligentesService.getDocumentedOrders({
      locality: searchParams.get("locality") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
    });
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
