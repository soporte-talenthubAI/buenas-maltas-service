import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { tangoService, TangoArticuloRaw } from "@/lib/services/tango.service";
import { invalidateCache, resolveBrandFromName } from "@/lib/utils/product-brand-resolver";

export async function POST() {
  try {
    const articulos = await tangoService.getAllPages<TangoArticuloRaw>(87, 50);

    if (articulos.length === 0) {
      return NextResponse.json({ error: "No se pudieron obtener artículos de Tango" }, { status: 502 });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const art of articulos) {
      const code = art.COD_STA11?.trim();
      const name = art.DESCRIPCIO?.trim();
      if (!code || !name) { skipped++; continue; }

      // Skip internal machine codes
      if (code.startsWith("zzzzzz")) { skipped++; continue; }

      const brand = resolveBrandFromName(name);
      const umStock = art.MEDIDA_STOCK_CODIGO?.trim() || null;
      const umVentas = art.MEDIDA_VENTAS_CODIGO?.trim() || null;

      const data = {
        name,
        brand,
        category: "cerveza",
        unit_price: 0,
        unit: mapTangoUnit(umVentas || ""),
        tango_id: art.ID_STA11,
        barcode: art.COD_BARRA?.trim() || null,
        synonym: art.SINONIMO?.trim() || null,
        familia: art.FAMILIA?.trim() || null,
        grupo: art.GRUPO?.trim() || null,
        has_stock: art.STOCK !== false,
        um_stock: umStock,
        um_ventas: umVentas,
        is_active: true,
      };

      const existing = await prisma.product.findUnique({ where: { code } });

      if (existing) {
        await prisma.product.update({ where: { code }, data });
        updated++;
      } else {
        await prisma.product.create({ data: { code, ...data } });
        created++;
      }
    }

    invalidateCache();

    return NextResponse.json({
      success: true,
      totalFromTango: articulos.length,
      created,
      updated,
      skipped,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

function mapTangoUnit(tangoUnit: string): string {
  const u = tangoUnit.toLowerCase();
  if (u.includes("lata")) return "lata";
  if (u.includes("barril")) return "barril";
  if (u.includes("bot")) return "botella";
  if (u.includes("caja")) return "caja";
  if (u.includes("lts") || u === "lt" || u.includes("litro")) return "litro";
  if (u.includes("kgs") || u.includes("kg")) return "kg";
  if (u.includes("golpe")) return "golpe";
  if (u.includes("par")) return "par";
  if (u.includes("ba")) return "bandeja";
  return "unidad";
}
