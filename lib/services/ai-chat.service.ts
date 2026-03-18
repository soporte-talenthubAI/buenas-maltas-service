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

## CÓMO RESPONDER
- Siempre en español argentino (vos, usá, fijate, etc.)
- Sé conciso pero con datos concretos (números, porcentajes, comparaciones)
- Cuando des insights, respaldá con los datos del contexto
- Si te piden análisis, usá formato claro con secciones y bullet points
- Podés usar emojis para resaltar KPIs: 📈 suba, 📉 baja, ⚠️ alerta, ✅ bien
- Siempre cerrá con una acción concreta que el equipo pueda tomar
- Si no tenés datos suficientes para responder algo, decilo claramente

## QUÉ PODÉS ANALIZAR
1. **Ventas**: tendencias, comparativas mensuales, ticket promedio, crecimiento
2. **Clientes**: ranking, frecuencia de compra, clientes inactivos, concentración de ventas
3. **Productos**: más vendidos, rentabilidad, mix de productos, estacionalidad
4. **Logística**: eficiencia de rutas, tasa de entrega, costos de distribución
5. **Documentos**: estado de facturación, remitos pendientes
6. **Estrategia**: sugerencias de mejora, alertas operativas, oportunidades

## FORMATO DE MONEDA
- Usá formato argentino: $1.234.567 (punto como separador de miles)
- Para porcentajes: 15,3% (coma decimal)

## CONTEXTO DEL NEGOCIO
Buenas Maltas es una cervecería artesanal que produce y distribuye cerveza en Córdoba capital y alrededores. Los productos incluyen distintas variedades (IPA, Stout, Blonde, Red Ale, Wheat) en formatos de 500ml, 1L y barriles (20L, 50L). Los clientes son bares, restaurantes, hoteles, supermercados y distribuidoras.`;

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
  ctx.topCustomers.forEach((c, i) => {
    lines.push(`${i + 1}. ${c.name} (${c.locality}): ${formatCurrency(c.total)} | ${c.orders} pedidos | Ticket promedio: ${formatCurrency(c.avgTicket)}`);
  });

  // ─── TOP CLIENTES ESTE MES
  if (ctx.topCustomersThisMonth.length > 0) {
    lines.push("\n👥 TOP CLIENTES (ESTE MES)");
    ctx.topCustomersThisMonth.forEach((c, i) => {
      lines.push(`${i + 1}. ${c.name}: ${formatCurrency(c.total)} | ${c.orders} pedidos`);
    });
  }

  // ─── CLIENTES INACTIVOS
  if (ctx.inactiveCustomers.length > 0) {
    lines.push("\n⚠️ CLIENTES SIN PEDIDOS EN ÚLTIMOS 30 DÍAS");
    ctx.inactiveCustomers.forEach(name => lines.push(`- ${name}`));
  }

  // ─── TOP PRODUCTOS
  lines.push("\n🍺 TOP PRODUCTOS (POR FACTURACIÓN)");
  ctx.topProducts.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.name} [${p.code}]: ${formatCurrency(p.revenue)} | ${p.quantity} unidades | Precio promedio: ${formatCurrency(p.avgPrice)}`);
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
        { role: "assistant", content: "Perfecto, tengo todos los datos cargados. Estoy listo para analizar y responder tus preguntas sobre Buenas Maltas. ¿Qué necesitás saber?" },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0].message.content ?? "No pude generar una respuesta.";
  },
};
