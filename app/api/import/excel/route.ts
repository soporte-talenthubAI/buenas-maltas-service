import { NextRequest, NextResponse } from "next/server";
import { excelImportService } from "@/lib/services/excel-import.service";
import { prisma } from "@/lib/prisma/client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se envió ningún archivo" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { error: "El archivo debe ser un Excel (.xlsx o .xls)" },
        { status: 400 }
      );
    }

    // Get the first admin user as the creator for imported orders
    const adminUser = await prisma.user.findFirst({
      where: { role: "admin" },
      select: { id: true },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: "No se encontró un usuario admin para asignar las órdenes importadas" },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await excelImportService.processImport(buffer, adminUser.id);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: `Error al procesar el archivo: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
