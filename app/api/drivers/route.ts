import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const drivers = await prisma.user.findMany({
      where: { role: "repartidor" },
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        last_access: true,
        created_at: true,
        _count: { select: { routes_as_driver: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(drivers);
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
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nombre, email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const driver = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "repartidor",
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        created_at: true,
      },
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
