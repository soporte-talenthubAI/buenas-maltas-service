import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { tangoService } from "@/lib/services/tango.service";
import { invalidateCache } from "@/lib/utils/product-brand-resolver";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const product = await prisma.product.update({
      where: { id },
      data: {
        code: body.code,
        name: body.name,
        brand: body.brand,
        category: body.category,
        unit_price: body.unit_price,
        cost_price: body.cost_price ?? null,
        unit: body.unit,
        is_active: body.is_active,
      },
    });

    invalidateCache();

    // Sync to Tango
    if (body.sync_tango) {
      await tangoService.updateArticulo({
        COD_STA11: product.code,
        DESCRIPCIO: product.name,
      });
    }

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    // Soft delete
    await prisma.product.update({
      where: { id },
      data: { is_active: false },
    });

    invalidateCache();

    // Notify Tango (best-effort)
    tangoService.deleteArticulo(Number(product.code) || 0).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
