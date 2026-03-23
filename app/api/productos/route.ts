import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { tangoService } from "@/lib/services/tango.service";
import { invalidateCache } from "@/lib/utils/product-brand-resolver";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const all = searchParams.get("all"); // include inactive

    const where: Record<string, unknown> = {};
    if (!all) where.is_active = true;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(products);
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

    const product = await prisma.product.create({
      data: {
        code: body.code,
        name: body.name,
        brand: body.brand || "Buenas Maltas",
        category: body.category || "cerveza",
        unit_price: body.unit_price,
        cost_price: body.cost_price ?? null,
        unit: body.unit || "unidad",
        is_active: body.is_active ?? true,
      },
    });

    invalidateCache();

    // Sync to Tango
    if (body.sync_tango) {
      await tangoService.syncProduct({
        code: product.code,
        name: product.name,
        brand: product.brand,
        category: product.category,
        unit_price: Number(product.unit_price),
        cost_price: product.cost_price ? Number(product.cost_price) : undefined,
        unit: product.unit,
      });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
