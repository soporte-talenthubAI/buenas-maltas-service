import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  try {
    const depot = await prisma.depotConfig.findFirst({
      where: { is_active: true },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(depot);
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
    const { name, street, street_number, locality, province, postal_code, latitude, longitude, radius_meters } = body;

    if (!street || !street_number || !locality || !latitude || !longitude) {
      return NextResponse.json(
        { error: "Dirección y coordenadas son requeridas" },
        { status: 400 }
      );
    }

    // Deactivate current active depot
    await prisma.depotConfig.updateMany({
      where: { is_active: true },
      data: { is_active: false },
    });

    // Create new active depot
    const depot = await prisma.depotConfig.create({
      data: {
        name: name || "Depósito Principal",
        street,
        street_number,
        locality,
        province: province || "Córdoba",
        postal_code,
        latitude,
        longitude,
        radius_meters: radius_meters || 200,
        is_active: true,
      },
    });

    return NextResponse.json(depot, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
