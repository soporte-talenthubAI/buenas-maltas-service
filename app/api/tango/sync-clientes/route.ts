import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { tangoService, TangoClienteRaw } from "@/lib/services/tango.service";

export async function POST() {
  try {
    const clientes = await tangoService.getAllPages<TangoClienteRaw>(2117, 50);

    if (clientes.length === 0) {
      return NextResponse.json({ error: "No se pudieron obtener clientes de Tango" }, { status: 502 });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const cli of clientes) {
      const code = cli.COD_GVA14?.trim();
      const razonSocial = cli.RAZON_SOCI?.trim();
      if (!code || !razonSocial) { skipped++; continue; }

      const commercialName = cli.NOM_COM?.trim() || razonSocial;
      const domicilio = cli.DOMICILIO?.trim() || "";
      const cuit = cli.CUIT?.trim();

      const data = {
        commercial_name: commercialName,
        razon_social: razonSocial,
        phone: cli.TELEFONO_1?.trim() || null,
        email: cli.E_MAIL?.trim() || null,
        cuit: cuit && cuit !== "00-00000000-0" ? cuit : null,
        iva_condition: (cli as Record<string, unknown>).COD_CATEGORIA_IVA as string || null,
        street: domicilio,
        street_number: "",
        locality: cli.LOCALIDAD?.trim() || "Sin especificar",
        province: ((cli as Record<string, unknown>).GVA18_DESCRIPCION as string)?.trim() || "Córdoba",
        postal_code: cli.C_POSTAL?.trim() || null,
        delivery_address: ((cli as Record<string, unknown>).DIR_COM as string)?.trim() || null,
        horario_cobranza: ((cli as Record<string, unknown>).HORARIO_COBRANZA as string)?.trim() || null,
        sales_channel: ((cli as Record<string, unknown>).CA_1096_TIPO_DE_COMERCIO as string)?.trim() || "Sin especificar",
        tango_id: cli.ID_GVA14,
        condicion_venta: ((cli as Record<string, unknown>).GVA01_DESC_COND as string)?.trim() || null,
        zona: ((cli as Record<string, unknown>).GVA05_DESCRIPCION as string)?.trim() || null,
        is_active: cli.HABILITADO !== false,
      };

      const existing = await prisma.customer.findUnique({ where: { code } });

      if (existing) {
        await prisma.customer.update({ where: { code }, data });
        updated++;
      } else {
        await prisma.customer.create({ data: { code, ...data } });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      totalFromTango: clientes.length,
      created,
      updated,
      skipped,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
