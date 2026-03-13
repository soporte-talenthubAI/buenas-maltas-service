import OpenAI from "openai";
import { analyticsService } from "./analytics.service";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Eres un asistente de inteligencia comercial para "Buenas Maltas", una cervecería artesanal y distribuidora PyME en Córdoba, Argentina.

Tu rol es ayudar al equipo con análisis de ventas, pedidos, clientes y logística de entregas. Respondé siempre en español argentino, de forma concisa y con datos concretos.

Cuando te den datos de contexto, usalos para responder. Si no tenés datos suficientes, decilo claramente. Podés sugerir acciones concretas basadas en los datos.`;

export const aiChatService = {
  async chat(messages: { role: "user" | "assistant"; content: string }[]) {
    const context = await analyticsService.getFullContext();

    const contextMessage = `
DATOS ACTUALES DEL NEGOCIO:
- Ventas del mes: $${context.overview.totalSales.toLocaleString("es-AR")}
- Pedidos del mes: ${context.overview.totalOrders}
- Ticket promedio: $${context.overview.avgOrderValue.toFixed(0)}
- Pedidos por estado: ${context.ordersByStatus.map((s) => `${s.status}: ${s.count}`).join(", ")}

TOP CLIENTES:
${context.topCustomers.map((c, i) => `${i + 1}. ${c.name}: $${c.total.toLocaleString("es-AR")} (${c.orders} pedidos)`).join("\n")}

TOP PRODUCTOS:
${context.topProducts.map((p, i) => `${i + 1}. ${p.name}: $${p.revenue.toLocaleString("es-AR")} (${p.quantity} unidades)`).join("\n")}

LOGÍSTICA:
- Rutas completadas: ${context.routeEfficiency.totalRoutes}
- Distancia total: ${context.routeEfficiency.totalDistance.toFixed(1)} km
- Costo total rutas: $${context.routeEfficiency.totalCost.toFixed(0)}
- Promedio paradas/ruta: ${context.routeEfficiency.avgStopsPerRoute.toFixed(1)}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Contexto actual:\n${contextMessage}` },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0].message.content ?? "No pude generar una respuesta.";
  },
};
