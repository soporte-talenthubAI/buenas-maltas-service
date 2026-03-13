import { prisma } from "@/lib/prisma/client";

export const analyticsService = {
  async getSalesOverview(period: "week" | "month" | "year" = "month") {
    const now = new Date();
    const startDate = new Date();

    if (period === "week") startDate.setDate(now.getDate() - 7);
    else if (period === "month") startDate.setMonth(now.getMonth() - 1);
    else startDate.setFullYear(now.getFullYear() - 1);

    const orders = await prisma.order.findMany({
      where: {
        order_date: { gte: startDate },
        status: { not: "cancelado" },
      },
      include: {
        customer: { select: { commercial_name: true, locality: true } },
        items: true,
      },
      orderBy: { order_date: "asc" },
    });

    const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    return { totalSales, totalOrders, avgOrderValue, period };
  },

  async getSalesByDay(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await prisma.order.findMany({
      where: {
        order_date: { gte: startDate },
        status: { not: "cancelado" },
      },
      select: { order_date: true, total: true },
      orderBy: { order_date: "asc" },
    });

    const byDay: Record<string, { date: string; total: number; count: number }> = {};
    for (const order of orders) {
      const day = order.order_date.toISOString().split("T")[0];
      if (!byDay[day]) byDay[day] = { date: day, total: 0, count: 0 };
      byDay[day].total += Number(order.total);
      byDay[day].count += 1;
    }

    return Object.values(byDay);
  },

  async getOrdersByStatus() {
    const orders = await prisma.order.groupBy({
      by: ["status"],
      _count: true,
    });

    return orders.map((o) => ({
      status: o.status,
      count: o._count,
    }));
  },

  async getTopCustomers(limit = 10) {
    const orders = await prisma.order.findMany({
      where: { status: { not: "cancelado" } },
      include: { customer: { select: { commercial_name: true } } },
    });

    const byCustomer: Record<string, { name: string; total: number; orders: number }> = {};
    for (const order of orders) {
      const name = order.customer.commercial_name;
      if (!byCustomer[name]) byCustomer[name] = { name, total: 0, orders: 0 };
      byCustomer[name].total += Number(order.total);
      byCustomer[name].orders += 1;
    }

    return Object.values(byCustomer)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  },

  async getTopProducts(limit = 10) {
    const items = await prisma.orderItem.findMany({
      select: {
        product_name: true,
        quantity: true,
        subtotal: true,
      },
    });

    const byProduct: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const item of items) {
      const name = item.product_name;
      if (!byProduct[name]) byProduct[name] = { name, quantity: 0, revenue: 0 };
      byProduct[name].quantity += Number(item.quantity);
      byProduct[name].revenue += Number(item.subtotal);
    }

    return Object.values(byProduct)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  },

  async getRouteEfficiency() {
    const routes = await prisma.route.findMany({
      where: { status: { in: ["completada", "en_curso"] } },
      include: { _count: { select: { route_orders: true } } },
    });

    return {
      totalRoutes: routes.length,
      totalDistance: routes.reduce(
        (sum, r) => sum + (r.total_distance_km ? Number(r.total_distance_km) : 0),
        0
      ),
      totalCost: routes.reduce(
        (sum, r) => sum + (r.total_cost ? Number(r.total_cost) : 0),
        0
      ),
      avgStopsPerRoute:
        routes.length > 0
          ? routes.reduce((sum, r) => sum + r._count.route_orders, 0) / routes.length
          : 0,
    };
  },

  async getFullContext() {
    const [overview, ordersByStatus, topCustomers, topProducts, routeEfficiency] =
      await Promise.all([
        this.getSalesOverview("month"),
        this.getOrdersByStatus(),
        this.getTopCustomers(5),
        this.getTopProducts(5),
        this.getRouteEfficiency(),
      ]);

    return {
      overview,
      ordersByStatus,
      topCustomers,
      topProducts,
      routeEfficiency,
    };
  },
};
