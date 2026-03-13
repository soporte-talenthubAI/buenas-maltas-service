import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      where: { is_active: true },
      select: { id: true, commercial_name: true, locality: true },
      orderBy: { commercial_name: "asc" },
    });

    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
