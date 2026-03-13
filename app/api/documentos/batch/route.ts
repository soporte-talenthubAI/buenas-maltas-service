import { NextRequest, NextResponse } from "next/server";
import { documentosService } from "@/lib/services/documentos.service";
import type { DocumentType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderIds, types } = body as {
      orderIds: string[];
      types: DocumentType[];
    };

    if (!orderIds?.length || !types?.length) {
      return NextResponse.json(
        { error: "orderIds y types son requeridos" },
        { status: 400 }
      );
    }

    const results = await documentosService.generateBatch(orderIds, types);
    return NextResponse.json({ results }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
