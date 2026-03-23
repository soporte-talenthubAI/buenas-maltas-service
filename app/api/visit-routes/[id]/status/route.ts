import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const updateData: Record<string, unknown> = { status };

    if (status === "en_curso") {
      updateData.actual_start_time = new Date();
    } else if (status === "completada") {
      updateData.actual_end_time = new Date();
    }

    const route = await prisma.visitRoute.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(route);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
