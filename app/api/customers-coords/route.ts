import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        commercial_name: true,
        locality: true,
        latitude: true,
        longitude: true,
      },
    });

    return NextResponse.json(
      customers.map((c) => ({
        id: c.id,
        commercial_name: c.commercial_name,
        locality: c.locality,
        latitude: Number(c.latitude),
        longitude: Number(c.longitude),
      }))
    );
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
