import { NextRequest, NextResponse } from "next/server";
import { documentosService } from "@/lib/services/documentos.service";
import type { DocumentType, DocumentStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const result = await documentosService.findAll({
      type: searchParams.get("type") as DocumentType | undefined,
      status: searchParams.get("status") as DocumentStatus | undefined,
      orderId: searchParams.get("orderId") ?? undefined,
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 20,
    });

    return NextResponse.json(result);
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
    const { orderId, types } = body as {
      orderId: string;
      types: DocumentType[];
    };

    if (!orderId || !types?.length) {
      return NextResponse.json(
        { error: "orderId y types son requeridos" },
        { status: 400 }
      );
    }

    const documents = await documentosService.generateForOrder(orderId, types);
    return NextResponse.json({ documents }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
