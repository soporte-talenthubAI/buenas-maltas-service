import OpenAI from "openai";
import { analyticsService } from "./analytics.service";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Sos un asistente experto en inteligencia comercial para "Buenas Maltas", una cervecería artesanal y distribuidora PyME ubicada en Córdoba, Argentina.

## TU ROL
- Analista de datos comerciales especializado en distribución de bebidas
- Asesor estratégico para una PyME cervecera
- Experto en logística de entregas y ruteo

## MARCAS Y PRODUCTOS
Buenas Maltas produce y distribuye las siguientes marcas:
- **Träumer**: Cerveza artesanal (latas 473ml y barriles 20L/30L). Marca principal.
- **Vitea**: Kombucha (latas 473ml, sabores: Hibisco, Jengibre, Maracuyá)
- **Beermut**: Vermut con cerveza (latas 473ml, con y sin tónica)
- **Mixology**: Cócteles listos sin alcohol (latas 473ml: Mojito, Caipirinha, Vino+Frutos, Maracuyá)
- **Servicio a Terceros**: Producción para marcas externas (Safrafe, etc.)

## CANALES DE VENTA
Bar / Restaurante, Tienda de bebidas A, Tienda de bebidas B, Drugstore / Autoservicios, Supermercado, Distribuidor, Consumidor Final

## CÓMO RESPONDER
- Siempre en español argentino (vos, usá, fijate, etc.)
- Sé conciso pero con datos concretos (números, porcentajes, comparaciones)
- Cuando des insights, respaldá con los datos del contexto
- Si te piden análisis, usá formato claro con secciones y bullet points
- Podés usar emojis para resaltar KPIs: 📈 suba, 📉 baja, ⚠️ alerta, ✅ bien
- Siempre cerrá con una acción concreta que el equipo pueda tomar
- Si no tenés datos suficientes para responder algo, decilo claramente

## QUÉ PODÉS ANALIZAR
1. **Ventas**: tendencias mensuales, comparativas, ticket promedio, crecimiento
2. **Clientes**: ranking Pareto (80/20), frecuencia de compra, inactivos, concentración
3. **Productos**: más vendidos por marca, rentabilidad, mix latas/barriles, estacionalidad
4. **Canales**: facturación por tipo de comercio, márgenes por canal
5. **Vendedores**: rendimiento, conversión, historial
6. **Descuentos**: análisis por cliente, montos, porcentajes
7. **Logística**: eficiencia de rutas, tasa de entrega, costos
8. **Estrategia**: sugerencias de mejora, alertas, oportunidades

## FORMATO DE MONEDA
- Usá formato argentino: $1.234.567 (punto como separador de miles)
- Para porcentajes: 15,3% (coma decimal)

## CONTEXTO DEL NEGOCIO
Buenas Maltas produce y distribuye cerveza artesanal, kombucha, vermut y cócteles listos en Córdoba capital y alrededores. Los clientes son bares, restaurantes, tiendas de bebidas, supermercados y distribuidoras. Los datos provienen de facturación real del sistema Tango ERP.`;

function formatCurrency(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

function buildContextMessage(ctx: Awaited<ReturnType<typeof analyticsService.getDeepContext>>): string {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════");
  lines.push("DATOS ACTUALES DE BUENAS MALTAS");
  lines.push(`Generado: ${new Date(ctx.generatedAt).toLocaleString("es-AR")}`);
  lines.push("═══════════════════════════════════════════");

  // ─── RESUMEN GENERAL
  lines.push("\n📊 RESUMEN GENERAL");
  lines.push(`- Clientes activos: ${ctx.summary.totalCustomers}`);
  lines.push(`- Pedidos totales (histórico): ${ctx.summary.totalOrdersAllTime}`);
  lines.push(`- Facturación total: ${formatCurrency(ctx.summary.totalSalesAllTime)}`);
  lines.push(`- Ticket promedio: ${formatCurrency(ctx.summary.avgTicketAllTime)}`);

  // ─── COMPARATIVA TEMPORAL
  lines.push("\n📅 COMPARATIVA DE PERÍODOS");
  lines.push(`- Esta semana: ${ctx.periods.thisWeek.orders} pedidos | ${formatCurrency(ctx.periods.thisWeek.sales)}`);
  lines.push(`- Este mes: ${ctx.periods.thisMonth.orders} pedidos | ${formatCurrency(ctx.periods.thisMonth.sales)}`);
  lines.push(`- Mes pasado: ${ctx.periods.lastMonth.orders} pedidos | ${formatCurrency(ctx.periods.lastMonth.sales)}`);
  lines.push(`- Crecimiento vs mes anterior: ${ctx.periods.growthVsLastMonth}%`);

  // ─── VENTAS POR MES
  if (ctx.monthlySales && ctx.monthlySales.length > 0) {
    lines.push("\n📆 VENTAS POR MES (AÑO ACTUAL)");
    for (const ms of ctx.monthlySales) {
      lines.push(`- ${ms.month}: ${formatCurrency(ms.total)}`);
    }
  }

  // ─── VENTAS POR MARCA
  if (ctx.brandTotals && ctx.brandTotals.length > 0) {
    lines.push("\n🏷️ VENTAS POR MARCA");
    for (const bt of ctx.brandTotals) {
      lines.push(`- ${bt.brand}: ${formatCurrency(bt.revenue)} | ${bt.quantity.toFixed(0)} unidades`);
    }
  }

  // ─── ANÁLISIS PARETO
  if (ctx.paretoClients && ctx.paretoClients.length > 0) {
    lines.push("\n📊 ANÁLISIS PARETO - TOP CLIENTES");
    for (const pc of ctx.paretoClients) {
      lines.push(`- ${pc.name}: ${formatCurrency(pc.total)} | ${pc.orders} pedidos | Acumulado: ${pc.cumulativePercent}%`);
    }
  }

  // ─── VENTAS POR CANAL
  if (ctx.salesByChannel && ctx.salesByChannel.length > 0) {
    lines.push("\n🏪 VENTAS POR CANAL DE VENTA");
    for (const sc of ctx.salesByChannel) {
      lines.push(`- ${sc.channel}: ${formatCurrency(sc.revenue)} | ${sc.orders} pedidos`);
    }
  }

  // ─── DESCUENTOS
  if (ctx.discountSummary) {
    lines.push("\n💰 RESUMEN DE DESCUENTOS");
    lines.push(`- Total descuentos otorgados: ${formatCurrency(ctx.discountSummary.totalDiscounts)}`);
    lines.push(`- Descuento promedio: ${ctx.discountSummary.avgDiscountPct}%`);
  }

  // ─── ESTADO DE PEDIDOS
  lines.push("\n📋 ESTADO DE PEDIDOS");
  for (const s of ctx.ordersByStatus) {
    lines.push(`- ${s.status}: ${s.count}`);
  }

  lines.push("\n🔺 PEDIDOS POR PRIORIDAD");
  for (const [priority, count] of Object.entries(ctx.ordersByPriority)) {
    lines.push(`- ${priority}: ${count}`);
  }

  // ─── TOP CLIENTES (ALL TIME)
  lines.push("\n👥 TOP CLIENTES (HISTÓRICO)");
  ctx.topCustomers.slice(0, 15).forEach((c, i) => {
    lines.push(`${i + 1}. ${c.name} (${c.locality}): ${formatCurrency(c.total)} | ${c.orders} pedidos | Ticket: ${formatCurrency(c.avgTicket)}`);
  });

  // ─── TOP CLIENTES ESTE MES
  if (ctx.topCustomersThisMonth.length > 0) {
    lines.push("\n👥 TOP CLIENTES (ESTE MES)");
    ctx.topCustomersThisMonth.slice(0, 10).forEach((c, i) => {
      lines.push(`${i + 1}. ${c.name}: ${formatCurrency(c.total)} | ${c.orders} pedidos`);
    });
  }

  // ─── CLIENTES INACTIVOS
  if (ctx.inactiveCustomers.length > 0) {
    lines.push("\n⚠️ CLIENTES SIN PEDIDOS EN ÚLTIMOS 30 DÍAS");
    ctx.inactiveCustomers.slice(0, 15).forEach(name => lines.push(`- ${name}`));
    if (ctx.inactiveCustomers.length > 15) {
      lines.push(`... y ${ctx.inactiveCustomers.length - 15} más`);
    }
  }

  // ─── TOP PRODUCTOS
  lines.push("\n🍺 TOP PRODUCTOS (POR FACTURACIÓN)");
  ctx.topProducts.slice(0, 15).forEach((p, i) => {
    lines.push(`${i + 1}. ${p.name} [${p.code}]: ${formatCurrency(p.revenue)} | ${p.quantity} unidades | Precio: ${formatCurrency(p.avgPrice)}`);
  });

  // ─── DOCUMENTOS
  lines.push("\n📄 DOCUMENTOS GENERADOS");
  lines.push(`- Total documentos: ${ctx.totalDocuments}`);
  for (const d of ctx.documents) {
    lines.push(`- ${d.type}: ${d.total} (emitidos: ${d.emitidos}, anulados: ${d.anulados})`);
  }

  // ─── LOGÍSTICA
  lines.push("\n🚚 LOGÍSTICA Y RUTAS");
  lines.push(`- Rutas totales: ${ctx.routes.total}`);
  lines.push(`- Planificadas: ${ctx.routes.planificadas} | En curso: ${ctx.routes.enCurso} | Completadas: ${ctx.routes.completadas} | Canceladas: ${ctx.routes.canceladas}`);
  lines.push(`- Distancia total recorrida: ${ctx.routes.totalDistanceKm.toFixed(1)} km`);
  lines.push(`- Costo total de rutas: ${formatCurrency(ctx.routes.totalCost)}`);
  lines.push(`- Promedio paradas por ruta: ${ctx.routes.avgStops.toFixed(1)}`);

  // ─── ENTREGAS
  lines.push("\n📦 ESTADO DE ENTREGAS");
  lines.push(`- Total entregas: ${ctx.deliveries.total}`);
  lines.push(`- Entregados: ${ctx.deliveries.entregados} | No entregados: ${ctx.deliveries.noEntregados} | Pendientes: ${ctx.deliveries.pendientes}`);
  lines.push(`- Tasa de entrega exitosa: ${ctx.deliveries.tasaEntrega}%`);

  // ─── TENDENCIA DIARIA
  if (ctx.salesByDay.length > 0) {
    lines.push("\n📈 VENTAS DIARIAS (ÚLTIMOS 30 DÍAS)");
    for (const day of ctx.salesByDay) {
      lines.push(`- ${day.date}: ${formatCurrency(day.total)} (${day.count} pedidos)`);
    }
  }

  // ─── PEDIDOS RECIENTES
  lines.push("\n🕐 ÚLTIMOS 10 PEDIDOS");
  for (const o of ctx.recentOrders) {
    lines.push(`- ${o.number} | ${o.customer} | ${o.date} | ${formatCurrency(o.total)} | ${o.status} | ${o.items} items`);
  }

  lines.push("\n═══════════════════════════════════════════");

  return lines.join("\n");
}

export const aiChatService = {
  async chat(messages: { role: "user" | "assistant"; content: string }[]) {
    const context = await analyticsService.getDeepContext();
    const contextMessage = buildContextMessage(context);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `A continuación tenés todos los datos actualizados del negocio. Usá esta información como base para responder las preguntas del usuario.\n\n${contextMessage}`,
        },
        { role: "assistant", content: "Perfecto, tengo todos los datos cargados de Buenas Maltas incluyendo ventas por marca, análisis Pareto de clientes, canales de venta y descuentos. Estoy listo para analizar. ¿Qué necesitás saber?" },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    return response.choices[0].message.content ?? "No pude generar una respuesta.";
  },
};
