import { prisma } from "@/lib/prisma/client";
import type { OrderStatus, OrderPriority } from "@prisma/client";

export interface PedidosFilter {
  status?: OrderStatus;
  priority?: OrderPriority;
  customerId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const pedidosService = {
  async findAll(filters: PedidosFilter = {}) {
    const {
      status,
      priority,
      customerId,
      search,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = filters;

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (customerId) where.customer_id = customerId;
    if (dateFrom || dateTo) {
      where.order_date = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }
    if (search) {
      where.OR = [
        { order_number: { contains: search, mode: "insensitive" } },
        {
          customer: {
            commercial_name: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              commercial_name: true,
              locality: true,
              phone: true,
            },
          },
          _count: { select: { items: true, documents: true } },
        },
        orderBy: [{ order_date: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        documents: { orderBy: { created_at: "desc" } },
        created_by: { select: { id: true, name: true, email: true } },
        route_orders: {
          include: { route: { select: { id: true, route_code: true, status: true } } },
        },
      },
    });
  },

  async updateStatus(id: string, status: OrderStatus) {
    return prisma.order.update({
      where: { id },
      data: { status },
    });
  },

  async getStats() {
    const [total, pendientes, confirmados, documentados, enRuta, entregados] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { status: "pendiente" } }),
        prisma.order.count({ where: { status: "confirmado" } }),
        prisma.order.count({ where: { status: "documentado" } }),
        prisma.order.count({ where: { status: "en_ruta" } }),
        prisma.order.count({ where: { status: "entregado" } }),
      ]);

    return { total, pendientes, confirmados, documentados, enRuta, entregados };
  },
};
