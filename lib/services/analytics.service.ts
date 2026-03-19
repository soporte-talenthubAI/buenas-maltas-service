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

  // ─── CONTEXTO COMPLETO PARA AI CHAT ─────────────────────────────
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

  // ─── CONTEXTO ENRIQUECIDO PARA AI CHAT ──────────────────────────
  async getDeepContext() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    // ─── Todas las queries en paralelo
    const [
      allOrders,
      thisMonthOrders,
      lastMonthOrders,
      thisWeekOrders,
      ordersByStatus,
      allCustomers,
      allItems,
      allDocuments,
      allRoutes,
      routeOrders,
      salesByDay,
    ] = await Promise.all([
      // Todos los pedidos (no cancelados)
      prisma.order.findMany({
        where: { status: { not: "cancelado" } },
        include: {
          customer: { select: { commercial_name: true, locality: true, cuit: true } },
          items: { select: { product_name: true, product_code: true, quantity: true, unit_price: true, subtotal: true } },
        },
        orderBy: { order_date: "desc" },
      }),
      // Pedidos este mes
      prisma.order.findMany({
        where: { order_date: { gte: startOfMonth }, status: { not: "cancelado" } },
        include: { customer: { select: { commercial_name: true } }, items: true },
      }),
      // Pedidos mes pasado
      prisma.order.findMany({
        where: { order_date: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { not: "cancelado" } },
        include: { customer: { select: { commercial_name: true } }, items: true },
      }),
      // Pedidos esta semana
      prisma.order.findMany({
        where: { order_date: { gte: startOfWeek }, status: { not: "cancelado" } },
        include: { customer: { select: { commercial_name: true } } },
      }),
      // Pedidos por estado (todos, incluyendo cancelados)
      prisma.order.groupBy({ by: ["status"], _count: true }),
      // Todos los clientes activos
      prisma.customer.findMany({
        where: { is_active: true },
        select: { commercial_name: true, locality: true, cuit: true, iva_condition: true },
      }),
      // Todos los items
      prisma.orderItem.findMany({
        select: { product_name: true, product_code: true, quantity: true, unit_price: true, subtotal: true },
      }),
      // Documentos
      prisma.document.findMany({
        include: { order: { select: { order_number: true, customer: { select: { commercial_name: true } } } } },
      }),
      // Rutas
      prisma.route.findMany({
        include: {
          driver: { select: { name: true } },
          _count: { select: { route_orders: true } },
        },
      }),
      // Route orders con estado de entrega
      prisma.routeOrder.findMany({
        include: {
          order: { select: { order_number: true, customer: { select: { commercial_name: true } } } },
        },
      }),
      // Ventas por día (últimos 30 días)
      this.getSalesByDay(30),
    ]);

    // ─── Procesar datos ────────────────────────────────────────────

    // Ventas totales
    const totalSalesAllTime = allOrders.reduce((s, o) => s + Number(o.total), 0);
    const totalSalesThisMonth = thisMonthOrders.reduce((s, o) => s + Number(o.total), 0);
    const totalSalesLastMonth = lastMonthOrders.reduce((s, o) => s + Number(o.total), 0);
    const totalSalesThisWeek = thisWeekOrders.reduce((s, o) => s + Number(o.total), 0);
    const salesGrowth = totalSalesLastMonth > 0
      ? ((totalSalesThisMonth - totalSalesLastMonth) / totalSalesLastMonth * 100).toFixed(1)
      : "N/A";

    // Top clientes (all time)
    const byCustomer: Record<string, { name: string; locality: string; total: number; orders: number; avgTicket: number }> = {};
    for (const order of allOrders) {
      const name = order.customer.commercial_name;
      if (!byCustomer[name]) byCustomer[name] = { name, locality: order.customer.locality, total: 0, orders: 0, avgTicket: 0 };
      byCustomer[name].total += Number(order.total);
      byCustomer[name].orders += 1;
    }
    Object.values(byCustomer).forEach(c => { c.avgTicket = c.orders > 0 ? c.total / c.orders : 0; });
    const topCustomers = Object.values(byCustomer).sort((a, b) => b.total - a.total);

    // Top clientes este mes
    const byCustomerMonth: Record<string, { name: string; total: number; orders: number }> = {};
    for (const order of thisMonthOrders) {
      const name = order.customer.commercial_name;
      if (!byCustomerMonth[name]) byCustomerMonth[name] = { name, total: 0, orders: 0 };
      byCustomerMonth[name].total += Number(order.total);
      byCustomerMonth[name].orders += 1;
    }
    const topCustomersMonth = Object.values(byCustomerMonth).sort((a, b) => b.total - a.total);

    // Productos
    const byProduct: Record<string, { name: string; code: string; quantity: number; revenue: number; avgPrice: number }> = {};
    for (const item of allItems) {
      const name = item.product_name;
      if (!byProduct[name]) byProduct[name] = { name, code: item.product_code, quantity: 0, revenue: 0, avgPrice: 0 };
      byProduct[name].quantity += Number(item.quantity);
      byProduct[name].revenue += Number(item.subtotal);
    }
    Object.values(byProduct).forEach(p => { p.avgPrice = p.quantity > 0 ? p.revenue / p.quantity : 0; });
    const topProducts = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue);

    // Documentos resumen
    const docsByType: Record<string, { type: string; total: number; emitidos: number; anulados: number }> = {};
    for (const doc of allDocuments) {
      if (!docsByType[doc.type]) docsByType[doc.type] = { type: doc.type, total: 0, emitidos: 0, anulados: 0 };
      docsByType[doc.type].total += 1;
      if (doc.status === "emitido") docsByType[doc.type].emitidos += 1;
      if (doc.status === "anulado") docsByType[doc.type].anulados += 1;
    }

    // Rutas resumen
    const routesSummary = {
      total: allRoutes.length,
      planificadas: allRoutes.filter(r => r.status === "planificada").length,
      enCurso: allRoutes.filter(r => r.status === "en_curso").length,
      completadas: allRoutes.filter(r => r.status === "completada").length,
      canceladas: allRoutes.filter(r => r.status === "cancelada").length,
      totalDistanceKm: allRoutes.reduce((s, r) => s + (r.total_distance_km ? Number(r.total_distance_km) : 0), 0),
      totalCost: allRoutes.reduce((s, r) => s + (r.total_cost ? Number(r.total_cost) : 0), 0),
      avgStops: allRoutes.length > 0 ? allRoutes.reduce((s, r) => s + r._count.route_orders, 0) / allRoutes.length : 0,
    };

    // Entregas
    const deliverySummary = {
      total: routeOrders.length,
      entregados: routeOrders.filter(ro => ro.status === "entregado").length,
      noEntregados: routeOrders.filter(ro => ro.status === "no_entregado").length,
      pendientes: routeOrders.filter(ro => ro.status === "pendiente").length,
      tasaEntrega: routeOrders.length > 0
        ? (routeOrders.filter(ro => ro.status === "entregado").length / routeOrders.length * 100).toFixed(1)
        : "0",
    };

    // Clientes sin pedidos recientes (últimos 30 días)
    const recentCustomerNames = new Set(allOrders.filter(o => {
      const d = new Date(o.order_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return d >= thirtyDaysAgo;
    }).map(o => o.customer.commercial_name));
    const inactiveCustomers = allCustomers.filter(c => !recentCustomerNames.has(c.commercial_name));

    // Pedidos recientes (últimos 10)
    const recentOrders = allOrders.slice(0, 10).map(o => ({
      number: o.order_number,
      customer: o.customer.commercial_name,
      date: o.order_date.toISOString().split("T")[0],
      total: Number(o.total),
      status: o.status,
      items: o.items.length,
    }));

    // Prioridades
    const byPriority: Record<string, number> = {};
    for (const order of allOrders) {
      byPriority[order.priority] = (byPriority[order.priority] || 0) + 1;
    }

    return {
      generatedAt: now.toISOString(),
      // ─── Resumen general
      summary: {
        totalCustomers: allCustomers.length,
        totalOrdersAllTime: allOrders.length,
        totalSalesAllTime,
        avgTicketAllTime: allOrders.length > 0 ? totalSalesAllTime / allOrders.length : 0,
      },
      // ─── Comparativa temporal
      periods: {
        thisWeek: { orders: thisWeekOrders.length, sales: totalSalesThisWeek },
        thisMonth: { orders: thisMonthOrders.length, sales: totalSalesThisMonth },
        lastMonth: { orders: lastMonthOrders.length, sales: totalSalesLastMonth },
        growthVsLastMonth: salesGrowth,
      },
      // ─── Estado de pedidos
      ordersByStatus: ordersByStatus.map(o => ({ status: o.status, count: o._count })),
      ordersByPriority: byPriority,
      // ─── Clientes
      topCustomers,
      topCustomersThisMonth: topCustomersMonth,
      inactiveCustomers: inactiveCustomers.map(c => c.commercial_name),
      // ─── Productos
      topProducts,
      // ─── Documentos
      documents: Object.values(docsByType),
      totalDocuments: allDocuments.length,
      // ─── Rutas y logística
      routes: routesSummary,
      deliveries: deliverySummary,
      // ─── Tendencia diaria (últimos 30 días)
      salesByDay,
      // ─── Pedidos recientes
      recentOrders,
    };
  },

  // ─── DATOS PARA REPORTES CON FILTROS ───────────────────────────
  async getReportData(dateFrom?: string, dateTo?: string) {
    const dateFilter: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      dateFilter.order_date = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
      };
    }

    const routeDateFilter = dateFrom || dateTo ? {
      scheduled_date: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
      },
    } : undefined;

    const [orders, items, documents, routes, routeOrders, customers] = await Promise.all([
      prisma.order.findMany({
        where: { status: { not: "cancelado" }, ...dateFilter },
        include: {
          customer: { select: { commercial_name: true, locality: true } },
          items: { select: { product_name: true, product_code: true, quantity: true, unit_price: true, subtotal: true } },
        },
        orderBy: { order_date: "desc" },
      }),
      prisma.orderItem.findMany({
        where: { order: { status: { not: "cancelado" }, ...dateFilter } },
        select: { product_name: true, product_code: true, quantity: true, unit_price: true, subtotal: true },
      }),
      prisma.document.findMany({
        where: dateFrom || dateTo ? { order: dateFilter } : undefined,
        select: { type: true, status: true },
      }),
      prisma.route.findMany({
        where: routeDateFilter,
        include: {
          driver: { select: { name: true } },
          route_orders: { select: { status: true } },
        },
        orderBy: { scheduled_date: "desc" },
      }),
      prisma.routeOrder.findMany({
        where: routeDateFilter ? { route: routeDateFilter } : undefined,
        select: { status: true },
      }),
      prisma.customer.findMany({
        where: { is_active: true },
        select: { commercial_name: true, locality: true },
      }),
    ]);

    // Customers report
    const byCustomer: Record<string, { name: string; locality: string; total: number; orders: number; avgTicket: number }> = {};
    for (const order of orders) {
      const name = order.customer.commercial_name;
      if (!byCustomer[name]) byCustomer[name] = { name, locality: order.customer.locality, total: 0, orders: 0, avgTicket: 0 };
      byCustomer[name].total += Number(order.total);
      byCustomer[name].orders += 1;
    }
    Object.values(byCustomer).forEach(c => { c.avgTicket = c.orders > 0 ? c.total / c.orders : 0; });
    const customerReport = Object.values(byCustomer).sort((a, b) => b.total - a.total);

    // Products report
    const byProduct: Record<string, { name: string; code: string; quantity: number; revenue: number; avgPrice: number }> = {};
    for (const item of items) {
      const name = item.product_name;
      if (!byProduct[name]) byProduct[name] = { name, code: item.product_code, quantity: 0, revenue: 0, avgPrice: 0 };
      byProduct[name].quantity += Number(item.quantity);
      byProduct[name].revenue += Number(item.subtotal);
    }
    Object.values(byProduct).forEach(p => { p.avgPrice = p.quantity > 0 ? p.revenue / p.quantity : 0; });
    const productReport = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue);

    // Documents report
    const docsByType: Record<string, { type: string; total: number; emitidos: number; anulados: number; borradores: number }> = {};
    for (const doc of documents) {
      if (!docsByType[doc.type]) docsByType[doc.type] = { type: doc.type, total: 0, emitidos: 0, anulados: 0, borradores: 0 };
      docsByType[doc.type].total += 1;
      if (doc.status === "emitido") docsByType[doc.type].emitidos += 1;
      else if (doc.status === "anulado") docsByType[doc.type].anulados += 1;
      else docsByType[doc.type].borradores += 1;
    }
    const documentReport = Object.values(docsByType);

    // Routes/delivery report
    const routeReport = routes.map(r => {
      const stops = r.route_orders.length;
      const delivered = r.route_orders.filter(ro => ro.status === "entregado").length;
      const notDelivered = r.route_orders.filter(ro => ro.status === "no_entregado").length;
      const pending = r.route_orders.filter(ro => ro.status === "pendiente").length;
      return {
        routeCode: r.route_code,
        driver: r.driver.name,
        status: r.status,
        date: r.scheduled_date.toISOString().split("T")[0],
        stops,
        delivered,
        notDelivered,
        pending,
        successRate: stops > 0 ? ((delivered / stops) * 100) : 0,
        distanceKm: r.total_distance_km ? Number(r.total_distance_km) : 0,
        cost: r.total_cost ? Number(r.total_cost) : 0,
      };
    });

    const totalDeliveries = routeOrders.length;
    const deliveredCount = routeOrders.filter(ro => ro.status === "entregado").length;

    const localities = [...new Set(customers.map(c => c.locality))].sort();

    return {
      customerReport,
      productReport,
      documentReport,
      routeReport,
      summary: {
        totalOrders: orders.length,
        totalSales: orders.reduce((s, o) => s + Number(o.total), 0),
        totalDeliveries,
        deliveryRate: totalDeliveries > 0 ? ((deliveredCount / totalDeliveries) * 100) : 0,
        totalDocuments: documents.length,
        totalRoutes: routes.length,
      },
      filters: {
        localities,
        customers: customerReport.map(c => c.name),
      },
    };
  },
};
