import { prisma } from "@/lib/prisma/client";
import type { DocumentType, DocumentStatus } from "@prisma/client";

const DOC_SEQUENCE: DocumentType[] = [
  "presupuesto",
  "orden_venta",
  "remito",
  "factura",
];

function generateDocNumber(type: DocumentType): string {
  const prefix = {
    presupuesto: "PRES",
    orden_venta: "OV",
    remito: "REM",
    factura: "FAC",
  }[type];
  const num = String(Date.now()).slice(-8);
  return `${prefix}-${num}`;
}

export const documentosService = {
  async generateForOrder(orderId: string, types: DocumentType[]) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, items: true },
    });

    if (!order) throw new Error("Pedido no encontrado");

    const documents = [];

    for (const type of types) {
      const existing = await prisma.document.findFirst({
        where: { order_id: orderId, type, status: { not: "anulado" } },
      });

      if (existing) continue;

      const doc = await prisma.document.create({
        data: {
          order_id: orderId,
          type,
          number: generateDocNumber(type),
          status: "emitido",
          data: {
            order_number: order.order_number,
            customer: {
              name: order.customer.commercial_name,
              cuit: order.customer.cuit,
              address: `${order.customer.street} ${order.customer.street_number}, ${order.customer.locality}`,
              iva_condition: order.customer.iva_condition,
            },
            items: order.items.map((item) => ({
              code: item.product_code,
              name: item.product_name,
              quantity: Number(item.quantity),
              unit_price: Number(item.unit_price),
              subtotal: Number(item.subtotal),
            })),
            subtotal: Number(order.subtotal),
            discount: Number(order.discount),
            total: Number(order.total),
            date: new Date().toISOString(),
          },
        },
      });

      documents.push(doc);
    }

    // Check if order has both remito and factura -> mark as documentado
    const allDocs = await prisma.document.findMany({
      where: { order_id: orderId, status: "emitido" },
    });
    const docTypes = allDocs.map((d) => d.type);
    if (docTypes.includes("remito") && docTypes.includes("factura")) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "documentado" },
      });
    }

    return documents;
  },

  async generateBatch(orderIds: string[], types: DocumentType[]) {
    const results = [];
    for (const orderId of orderIds) {
      try {
        const docs = await this.generateForOrder(orderId, types);
        results.push({ orderId, success: true, documents: docs });
      } catch (error) {
        results.push({
          orderId,
          success: false,
          error: (error as Error).message,
        });
      }
    }
    return results;
  },

  async findAll(filters: {
    type?: DocumentType;
    status?: DocumentStatus;
    orderId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { type, status, orderId, search, page = 1, limit = 20 } = filters;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (orderId) where.order_id = orderId;
    if (search) {
      where.OR = [
        { number: { contains: search, mode: "insensitive" } },
        { order: { order_number: { contains: search, mode: "insensitive" } } },
        { order: { customer: { commercial_name: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          order: {
            select: {
              order_number: true,
              customer: { select: { commercial_name: true } },
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    return { documents, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findById(id: string) {
    return prisma.document.findUnique({
      where: { id },
      include: {
        order: {
          include: { customer: true, items: true },
        },
      },
    });
  },

  async annul(id: string) {
    return prisma.document.update({
      where: { id },
      data: { status: "anulado" },
    });
  },

  getSequence() {
    return DOC_SEQUENCE;
  },
};
