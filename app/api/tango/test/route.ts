import { NextRequest, NextResponse } from "next/server";
import { tangoService } from "@/lib/services/tango.service";

/**
 * Test endpoint to verify Tango API connectivity.
 * GET /api/tango/test?pageSize=5
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageSize = parseInt(searchParams.get("pageSize") || "5", 10);
    const entity = searchParams.get("entity") || "articulos";

    let res;
    switch (entity) {
      case "clientes":
        res = await tangoService.getClientes(0, pageSize);
        break;
      case "vendedores":
        res = await tangoService.getVendedores(0, pageSize);
        break;
      default:
        res = await tangoService.getArticulos(0, pageSize);
    }

    return NextResponse.json(res);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
