import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import bcrypt from "bcryptjs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, password, is_active } = body;

    // Check if email is taken by another user
    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Ya existe otro usuario con ese email" },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const driver = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        created_at: true,
      },
    });

    return NextResponse.json(driver);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if driver has routes assigned
    const routeCount = await prisma.route.count({
      where: { driver_id: id },
    });

    if (routeCount > 0) {
      // Soft delete - just deactivate
      await prisma.user.update({
        where: { id },
        data: { is_active: false },
      });
      return NextResponse.json({
        message: "Chofer desactivado (tiene rutas asignadas)",
        deactivated: true,
      });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "Chofer eliminado" });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
