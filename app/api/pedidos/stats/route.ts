import { NextResponse } from "next/server";
import { pedidosService } from "@/lib/services/pedidos.service";

export async function GET() {
  try {
    const stats = await pedidosService.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
