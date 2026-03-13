import { NextRequest, NextResponse } from "next/server";
import { rutasInteligentesService } from "@/lib/services/rutas-inteligentes.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const route = await rutasInteligentesService.getRouteById(id);

    if (!route) {
      return NextResponse.json(
        { error: "Ruta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(route);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
