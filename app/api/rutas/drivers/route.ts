import { NextResponse } from "next/server";
import { rutasInteligentesService } from "@/lib/services/rutas-inteligentes.service";

export async function GET() {
  try {
    const drivers = await rutasInteligentesService.getDrivers();
    return NextResponse.json(drivers);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
