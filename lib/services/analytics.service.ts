import { prisma } from "@/lib/prisma/client";
import {
  getProductBrandMap,
  resolveBrandFromName,
  isLata,
  isBarril,
  getMonthKey,
  generateMonthKeys,
  BRANDS,
} from "@/lib/utils/product-brand-resolver";

// Helper: build origin filter for Prisma where clause
function originWhere(origin?: string) {
  if (!origin || origin === "all") return {};
  return { origin };
}

export const analyticsService = {
  async getSalesOverview(period: "week" | "month" | "year" = "month", origin?: string) {
    const now = new Date();
    const startDate = new Date();

    if (period === "week") startDate.setDate(now.getDate() - 7);
    else if (period === "month") startDate.setMonth(now.getMonth() - 1);
    else startDate.setFullYear(now.getFullYear() - 1);

    const orders = await prisma.order.findMany({
      where: {
        order_date: { gte: startDate },
        status: { not: "cancelado" },
        ...originWhere(origin),
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

  async getSalesByDay(days = 30, origin?: string) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await prisma.order.findMany({
      where: {
        order_date: { gte: startDate },
        status: { not: "cancelado" },
        ...originWhere(origin),
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

  async getOrdersByStatus(origin?: string) {
    const orders = await prisma.order.groupBy({
      by: ["status"],
      where: originWhere(origin),
      _count: true,
    });

    return orders.map((o) => ({
      status: o.status,
      count: o._count,
    }));
  },

  async getTopCustomers(limit = 10, origin?: string) {
    const orders = await prisma.order.findMany({
      where: { status: { not: "cancelado" }, ...originWhere(origin) },
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

  async getTopProducts(limit = 10, origin?: string) {
    const items = await prisma.orderItem.findMany({
      where: origin && origin !== "all" ? { order: { origin } } : undefined,
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

  // ─── LOGISTICS ANALYTICS ─────────────────────────────────────────
  async getLogisticsAnalytics(dateFrom?: string, dateTo?: string) {
    const dateFilter: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      dateFilter.scheduled_date = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
      };
    }

    const [deliveryRoutes, visitRoutes, routeOrders, visitStops] = await Promise.all([
      prisma.route.findMany({
        where: dateFilter.scheduled_date ? dateFilter : undefined,
        include: {
          driver: { select: { name: true } },
          route_orders: { select: { status: true } },
        },
        orderBy: { scheduled_date: "desc" },
      }),
      prisma.visitRoute.findMany({
        where: dateFilter.scheduled_date ? dateFilter : undefined,
        include: {
          vendedor: { select: { name: true } },
          stops: { select: { status: true, distance_to_customer: true } },
        },
        orderBy: { scheduled_date: "desc" },
      }),
      prisma.routeOrder.findMany({
        where: dateFilter.scheduled_date ? { route: dateFilter } : undefined,
        select: { status: true },
      }),
      prisma.visitStop.findMany({
        where: dateFilter.scheduled_date ? { visit_route: dateFilter } : undefined,
        select: { status: true, distance_to_customer: true },
      }),
    ]);

    // Delivery metrics
    const totalDeliveryRoutes = deliveryRoutes.length;
    const completedDeliveryRoutes = deliveryRoutes.filter(r => r.status === "completada").length;
    const totalDeliveryStops = routeOrders.length;
    const delivered = routeOrders.filter(ro => ro.status === "entregado").length;
    const notDelivered = routeOrders.filter(ro => ro.status === "no_entregado").length;
    const deliveryRate = totalDeliveryStops > 0 ? (delivered / totalDeliveryStops) * 100 : 0;
    const totalDistanceKm = deliveryRoutes.reduce(
      (s, r) => s + (r.total_distance_km ? Number(r.total_distance_km) : 0), 0
    );
    const totalDeliveryCost = deliveryRoutes.reduce(
      (s, r) => s + (r.total_cost ? Number(r.total_cost) : 0), 0
    );
    const avgStopsPerRoute = totalDeliveryRoutes > 0
      ? deliveryRoutes.reduce((s, r) => s + r.route_orders.length, 0) / totalDeliveryRoutes
      : 0;

    // Driver performance
    const byDriver: Record<string, { name: string; routes: number; stops: number; delivered: number; notDelivered: number; distance: number; cost: number }> = {};
    for (const route of deliveryRoutes) {
      const name = route.driver.name;
      if (!byDriver[name]) byDriver[name] = { name, routes: 0, stops: 0, delivered: 0, notDelivered: 0, distance: 0, cost: 0 };
      byDriver[name].routes += 1;
      byDriver[name].stops += route.route_orders.length;
      byDriver[name].delivered += route.route_orders.filter(ro => ro.status === "entregado").length;
      byDriver[name].notDelivered += route.route_orders.filter(ro => ro.status === "no_entregado").length;
      byDriver[name].distance += route.total_distance_km ? Number(route.total_distance_km) : 0;
      byDriver[name].cost += route.total_cost ? Number(route.total_cost) : 0;
    }
    const driverPerformance = Object.values(byDriver).map(d => ({
      ...d,
      deliveryRate: d.stops > 0 ? (d.delivered / d.stops) * 100 : 0,
    })).sort((a, b) => b.deliveryRate - a.deliveryRate);

    // Visit metrics
    const totalVisitRoutes = visitRoutes.length;
    const completedVisitRoutes = visitRoutes.filter(r => r.status === "completada").length;
    const totalVisitStops = visitStops.length;
    const visited = visitStops.filter(s => s.status === "visitado").length;
    const notVisited = visitStops.filter(s => s.status === "no_visitado").length;
    const visitRate = totalVisitStops > 0 ? (visited / totalVisitStops) * 100 : 0;
    const geoVerified = visitStops.filter(
      s => s.status === "visitado" && s.distance_to_customer !== null && Number(s.distance_to_customer) <= 200
    ).length;
    const geoVerificationRate = visited > 0 ? (geoVerified / visited) * 100 : 0;

    // Routes by status (for pie chart)
    const deliveryByStatus = [
      { status: "Completada", count: completedDeliveryRoutes },
      { status: "En Curso", count: deliveryRoutes.filter(r => r.status === "en_curso").length },
      { status: "Planificada", count: deliveryRoutes.filter(r => r.status === "planificada").length },
      { status: "Cancelada", count: deliveryRoutes.filter(r => r.status === "cancelada").length },
    ].filter(s => s.count > 0);

    return {
      delivery: {
        totalRoutes: totalDeliveryRoutes,
        completedRoutes: completedDeliveryRoutes,
        totalStops: totalDeliveryStops,
        delivered,
        notDelivered,
        deliveryRate,
        totalDistanceKm,
        totalCost: totalDeliveryCost,
        avgStopsPerRoute,
        byStatus: deliveryByStatus,
      },
      visits: {
        totalRoutes: totalVisitRoutes,
        completedRoutes: completedVisitRoutes,
        totalStops: totalVisitStops,
        visited,
        notVisited,
        visitRate,
        geoVerified,
        geoVerificationRate,
      },
      driverPerformance,
    };
  },

  // ─── SALES / VENDEDOR ANALYTICS ──────────────────────────────────
  async getSalesAnalytics(dateFrom?: string, dateTo?: string, origin?: string) {
    const dateFilter: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      dateFilter.order_date = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
      };
    }

    const visitDateFilter: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      visitDateFilter.scheduled_date = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
      };
    }

    const [orders, allCustomers, visitRoutes, visitStops, vendedores] = await Promise.all([
      prisma.order.findMany({
        where: { status: { not: "cancelado" }, ...dateFilter, ...originWhere(origin) },
        include: {
          customer: { select: { id: true, commercial_name: true, locality: true } },
          items: { select: { product_name: true, quantity: true, subtotal: true } },
        },
        orderBy: { order_date: "desc" },
      }),
      prisma.customer.findMany({
        where: { is_active: true },
        select: { id: true, commercial_name: true },
      }),
      prisma.visitRoute.findMany({
        where: visitDateFilter.scheduled_date ? visitDateFilter : undefined,
        include: {
          vendedor: { select: { id: true, name: true } },
          stops: {
            include: {
              customer: { select: { id: true, commercial_name: true } },
            },
          },
        },
      }),
      prisma.visitStop.findMany({
        where: {
          status: "visitado",
          ...(visitDateFilter.scheduled_date ? { visit_route: visitDateFilter } : {}),
        },
        select: { customer_id: true },
      }),
      prisma.user.findMany({
        where: { role: "vendedor", is_active: true },
        select: { id: true, name: true },
      }),
    ]);

    // Customers with orders
    const customerIdsWithOrders = new Set(orders.map(o => o.customer.id));
    const totalCustomers = allCustomers.length;
    const activeCustomers = customerIdsWithOrders.size;
    const potentialCustomers = totalCustomers - activeCustomers;

    // Visited customer IDs
    const visitedCustomerIds = new Set(visitStops.map(s => s.customer_id));

    // Conversion: visited potentials that became buyers
    const potentialCustomerIds = new Set(
      allCustomers.filter(c => !customerIdsWithOrders.has(c.id)).map(c => c.id)
    );
    const visitedPotentials = [...visitedCustomerIds].filter(id => potentialCustomerIds.has(id)).length;

    // To calculate conversion, we need customers that were visited AND later placed an order
    // Customers that have been visited AND have orders = converted
    const convertedCustomers = [...visitedCustomerIds].filter(id => customerIdsWithOrders.has(id)).length;
    const conversionRate = visitedCustomerIds.size > 0
      ? (convertedCustomers / visitedCustomerIds.size) * 100
      : 0;

    // Sales totals
    const totalSales = orders.reduce((s, o) => s + Number(o.total), 0);
    const totalOrders = orders.length;
    const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Sales by vendedor (via visit routes + orders created)
    const byVendedor: Record<string, {
      name: string; visitRoutes: number; totalVisits: number; visitedCount: number;
      customersConverted: number; ordersCreated: number; salesTotal: number;
    }> = {};

    for (const v of vendedores) {
      byVendedor[v.id] = {
        name: v.name,
        visitRoutes: 0,
        totalVisits: 0,
        visitedCount: 0,
        customersConverted: 0,
        ordersCreated: 0,
        salesTotal: 0,
      };
    }

    for (const vr of visitRoutes) {
      if (byVendedor[vr.vendedor_id]) {
        byVendedor[vr.vendedor_id].visitRoutes += 1;
        byVendedor[vr.vendedor_id].totalVisits += vr.stops.length;
        byVendedor[vr.vendedor_id].visitedCount += vr.stops.filter(s => s.status === "visitado").length;

        // Check which visited customers have placed orders
        const visitedIds = vr.stops
          .filter(s => s.status === "visitado")
          .map(s => s.customer.id);
        byVendedor[vr.vendedor_id].customersConverted += visitedIds.filter(id => customerIdsWithOrders.has(id)).length;
      }
    }

    const vendedorPerformance = Object.values(byVendedor).map(v => ({
      ...v,
      conversionRate: v.visitedCount > 0 ? (v.customersConverted / v.visitedCount) * 100 : 0,
    }));

    // Income statement (Estado de Resultados) - placeholder structure
    // Real data would come from Tango ERP
    const totalSubtotal = orders.reduce((s, o) => s + Number(o.subtotal), 0);
    const totalDiscount = orders.reduce((s, o) => s + Number(o.discount), 0);

    // Estimate costs from delivery routes
    const deliveryRoutes = await prisma.route.findMany({
      where: visitDateFilter.scheduled_date ? { scheduled_date: visitDateFilter.scheduled_date as { gte?: Date; lte?: Date } } : undefined,
      select: { fuel_cost: true, driver_cost: true, total_cost: true },
    });
    const totalFuelCost = deliveryRoutes.reduce((s, r) => s + (r.fuel_cost ? Number(r.fuel_cost) : 0), 0);
    const totalDriverCost = deliveryRoutes.reduce((s, r) => s + (r.driver_cost ? Number(r.driver_cost) : 0), 0);
    const totalLogisticsCost = deliveryRoutes.reduce((s, r) => s + (r.total_cost ? Number(r.total_cost) : 0), 0);

    const incomeStatement = {
      // Ingresos
      facturacion: totalSales,
      subtotal: totalSubtotal,
      descuentos: totalDiscount > 0 ? totalSubtotal * (totalDiscount / 100) : 0,
      // Gastos (lo que tenemos registrado - el resto vendria de Tango)
      costoLogistica: totalLogisticsCost,
      costoCombustible: totalFuelCost,
      costoChoferes: totalDriverCost,
      // Margen
      margenBruto: totalSales - totalLogisticsCost,
      // Nota: gastos administrativos, costos de produccion, etc. vendrian de Tango
      nota: "Los gastos completos (produccion, administrativos, impuestos) se obtienen de Tango ERP",
    };

    // Sales by locality
    const byLocality: Record<string, { locality: string; orders: number; total: number }> = {};
    for (const order of orders) {
      const loc = order.customer.locality;
      if (!byLocality[loc]) byLocality[loc] = { locality: loc, orders: 0, total: 0 };
      byLocality[loc].orders += 1;
      byLocality[loc].total += Number(order.total);
    }
    const salesByLocality = Object.values(byLocality).sort((a, b) => b.total - a.total);

    // Sales by payment method
    const byPayment: Record<string, { method: string; count: number; total: number }> = {};
    for (const order of orders) {
      const method = order.payment_method || "Sin especificar";
      if (!byPayment[method]) byPayment[method] = { method, count: 0, total: 0 };
      byPayment[method].count += 1;
      byPayment[method].total += Number(order.total);
    }
    const salesByPaymentMethod = Object.values(byPayment).sort((a, b) => b.total - a.total);

    return {
      overview: { totalSales, totalOrders, avgTicket },
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        potential: potentialCustomers,
        visitedPotentials,
        convertedCustomers,
        conversionRate,
      },
      vendedorPerformance,
      incomeStatement,
      salesByLocality,
      salesByPaymentMethod,
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

    // ─── Ventas por mes (año actual) ───────────────────────────────
    const currentYear = now.getFullYear();
    const monthlyRevenue: Record<number, number> = {};
    for (const order of allOrders) {
      const d = new Date(order.order_date);
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        monthlyRevenue[m] = (monthlyRevenue[m] || 0) + Number(order.total);
      }
    }
    const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthlySales = Object.entries(monthlyRevenue)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([m, total]) => ({ month: MONTH_NAMES[Number(m)], total }));

    // ─── Ventas por marca ────────────────────────────────────────
    const allProducts = await prisma.product.findMany({ select: { code: true, brand: true } });
    const brandByCode = new Map(allProducts.map((p) => [p.code, p.brand]));
    const brandTotals: Record<string, { quantity: number; revenue: number }> = {};
    for (const item of allItems) {
      const brand = brandByCode.get(item.product_code) || "Otro";
      if (!brandTotals[brand]) brandTotals[brand] = { quantity: 0, revenue: 0 };
      brandTotals[brand].quantity += Number(item.quantity);
      brandTotals[brand].revenue += Number(item.subtotal);
    }

    // ─── Pareto clientes (top 10 + % acumulado) ─────────────────
    const sortedCustomers = [...topCustomers];
    let cumulativeRevenue = 0;
    const paretoClients = sortedCustomers.slice(0, 15).map((c) => {
      cumulativeRevenue += c.total;
      return {
        name: c.name,
        total: c.total,
        orders: c.orders,
        cumulativePercent: totalSalesAllTime > 0
          ? Math.round((cumulativeRevenue / totalSalesAllTime) * 100)
          : 0,
      };
    });

    // ─── Ventas por canal ────────────────────────────────────────
    const customerChannels = await prisma.customer.findMany({
      select: { commercial_name: true, sales_channel: true },
    });
    const channelByName = new Map(customerChannels.map((c) => [c.commercial_name, c.sales_channel]));
    const channelRevenue: Record<string, { revenue: number; orders: number }> = {};
    for (const order of allOrders) {
      const channel = channelByName.get(order.customer.commercial_name) || "Sin especificar";
      if (!channelRevenue[channel]) channelRevenue[channel] = { revenue: 0, orders: 0 };
      channelRevenue[channel].revenue += Number(order.total);
      channelRevenue[channel].orders += 1;
    }
    const salesByChannel = Object.entries(channelRevenue)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .map(([channel, data]) => ({ channel, ...data }));

    // ─── Descuentos resumen ──────────────────────────────────────
    const totalDiscounts = allOrders.reduce((s, o) => {
      const disc = Number(o.discount);
      const sub = Number(o.subtotal);
      return s + (disc > 0 && disc <= 100 ? sub * disc / 100 : 0);
    }, 0);
    const avgDiscountPct = allOrders.length > 0
      ? allOrders.reduce((s, o) => s + Number(o.discount), 0) / allOrders.length
      : 0;

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
      // ─── Analytics enriquecidos (para Chat IA)
      monthlySales,
      brandTotals: Object.entries(brandTotals).map(([brand, data]) => ({ brand, ...data })),
      paretoClients,
      salesByChannel,
      discountSummary: {
        totalDiscounts,
        avgDiscountPct: Math.round(avgDiscountPct * 10) / 10,
      },
    };
  },

  // ─── DATOS PARA REPORTES CON FILTROS ───────────────────────────
  async getReportData(dateFrom?: string, dateTo?: string, origin?: string) {
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

    const ow = originWhere(origin);

    const [orders, items, documents, routes, routeOrders, customers] = await Promise.all([
      prisma.order.findMany({
        where: { status: { not: "cancelado" }, ...dateFilter, ...ow },
        include: {
          customer: { select: { commercial_name: true, locality: true } },
          items: { select: { product_name: true, product_code: true, quantity: true, unit_price: true, subtotal: true } },
        },
        orderBy: { order_date: "desc" },
      }),
      prisma.orderItem.findMany({
        where: { order: { status: { not: "cancelado" }, ...dateFilter, ...ow } },
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

  // ─── PRODUCTOS ANALYTICS (cantidades + facturación por producto/mes) ────
  async getProductosAnalytics(year: number, origin?: string) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    const monthKeys = generateMonthKeys(year);

    const orders = await prisma.order.findMany({
      where: {
        order_date: { gte: startDate, lte: endDate },
        status: { not: "cancelado" },
        ...originWhere(origin),
      },
      include: { items: true },
    });

    const brandMap = await getProductBrandMap();

    // Aggregate by product and month
    const byProduct: Record<string, {
      product: string; brand: string; unit: string;
      months: Record<string, { quantity: number; revenue: number }>;
      totalQty: number; totalRevenue: number;
    }> = {};

    const monthlyTotals: Record<string, { latas: number; barriles: number; litrosLatas: number; litrosBarriles: number; revenue: number }> = {};
    for (const mk of monthKeys) {
      monthlyTotals[mk] = { latas: 0, barriles: 0, litrosLatas: 0, litrosBarriles: 0, revenue: 0 };
    }

    const brandTotals: Record<string, { latas: number; litros: number; revenue: number }> = {};
    for (const b of [...BRANDS, "Servicio"]) {
      brandTotals[b] = { latas: 0, litros: 0, revenue: 0 };
    }

    for (const order of orders) {
      const mk = getMonthKey(order.order_date);
      for (const item of order.items) {
        const info = brandMap.get(item.product_code);
        const brand = info?.brand || resolveBrandFromName(item.product_name);
        const pName = item.product_name;
        const qty = Number(item.quantity);
        const rev = Number(item.subtotal);

        if (!byProduct[pName]) {
          byProduct[pName] = {
            product: pName, brand, unit: info?.unit || "lata",
            months: {}, totalQty: 0, totalRevenue: 0,
          };
          for (const m of monthKeys) byProduct[pName].months[m] = { quantity: 0, revenue: 0 };
        }
        if (byProduct[pName].months[mk]) {
          byProduct[pName].months[mk].quantity += qty;
          byProduct[pName].months[mk].revenue += rev;
        }
        byProduct[pName].totalQty += qty;
        byProduct[pName].totalRevenue += rev;

        // Monthly totals
        if (monthlyTotals[mk]) {
          const lata = isLata(pName);
          const barril = isBarril(pName);
          if (lata) {
            monthlyTotals[mk].latas += qty;
            monthlyTotals[mk].litrosLatas += qty * 0.473;
          } else if (barril) {
            monthlyTotals[mk].barriles += qty;
            const liters = pName.toLowerCase().includes("50l") ? 50 : 20;
            monthlyTotals[mk].litrosBarriles += qty * liters;
          }
          monthlyTotals[mk].revenue += rev;
        }

        // Brand totals
        if (brandTotals[brand]) {
          brandTotals[brand].latas += isLata(pName) ? qty : 0;
          brandTotals[brand].litros += isLata(pName) ? qty * 0.473 : isBarril(pName) ? qty * (pName.toLowerCase().includes("50l") ? 50 : 20) : 0;
          brandTotals[brand].revenue += rev;
        }
      }
    }

    const productList = Object.values(byProduct).sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      products: productList,
      monthKeys,
      monthlyTotals: monthKeys.map(mk => ({ month: mk, ...monthlyTotals[mk] })),
      brandTotals: Object.entries(brandTotals).map(([brand, data]) => ({ brand, ...data })),
    };
  },

  // ─── CLIENTES ANALYTICS (facturación por cliente, por marca, Pareto) ────
  async getClientesAnalytics(year: number, origin?: string) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    const monthKeys = generateMonthKeys(year);

    const orders = await prisma.order.findMany({
      where: {
        order_date: { gte: startDate, lte: endDate },
        status: { not: "cancelado" },
        ...originWhere(origin),
      },
      include: {
        customer: { select: { commercial_name: true, sales_channel: true } },
        items: true,
      },
    });

    const brandMap = await getProductBrandMap();

    // Revenue by client by month
    const byClient: Record<string, { client: string; months: Record<string, number>; total: number }> = {};
    // Quantities by client by brand by month
    const byClientBrand: Record<string, Record<string, { client: string; months: Record<string, number>; total: number }>> = {};
    // Barriles by client
    const barrilesClient: Record<string, { client: string; months: Record<string, number>; total: number }> = {};
    // By sales channel
    const byChannel: Record<string, { channel: string; invoices: number; revenue: number }> = {};

    for (const b of BRANDS) byClientBrand[b] = {};

    for (const order of orders) {
      const cName = order.customer.commercial_name;
      const mk = getMonthKey(order.order_date);
      const channel = order.customer.sales_channel || "Sin especificar";

      // Revenue by client
      if (!byClient[cName]) {
        byClient[cName] = { client: cName, months: {}, total: 0 };
        for (const m of monthKeys) byClient[cName].months[m] = 0;
      }
      byClient[cName].months[mk] = (byClient[cName].months[mk] || 0) + Number(order.total);
      byClient[cName].total += Number(order.total);

      // By channel
      if (!byChannel[channel]) byChannel[channel] = { channel, invoices: 0, revenue: 0 };
      byChannel[channel].invoices += 1;
      byChannel[channel].revenue += Number(order.total);

      // Items → brand breakdown
      for (const item of order.items) {
        const info = brandMap.get(item.product_code);
        const brand = info?.brand || resolveBrandFromName(item.product_name);
        const qty = Number(item.quantity);

        if (BRANDS.includes(brand as typeof BRANDS[number])) {
          if (!byClientBrand[brand][cName]) {
            byClientBrand[brand][cName] = { client: cName, months: {}, total: 0 };
            for (const m of monthKeys) byClientBrand[brand][cName].months[m] = 0;
          }
          byClientBrand[brand][cName].months[mk] = (byClientBrand[brand][cName].months[mk] || 0) + qty;
          byClientBrand[brand][cName].total += qty;
        }

        // Barriles
        if (isBarril(item.product_name)) {
          if (!barrilesClient[cName]) {
            barrilesClient[cName] = { client: cName, months: {}, total: 0 };
            for (const m of monthKeys) barrilesClient[cName].months[m] = 0;
          }
          barrilesClient[cName].months[mk] = (barrilesClient[cName].months[mk] || 0) + qty;
          barrilesClient[cName].total += qty;
        }
      }
    }

    // Pareto
    const clientList = Object.values(byClient).sort((a, b) => b.total - a.total);
    const grandTotal = clientList.reduce((s, c) => s + c.total, 0);
    let cumulative = 0;
    const paretoData = clientList.map(c => {
      cumulative += c.total;
      return { client: c.client, revenue: c.total, cumulativePercent: grandTotal > 0 ? (cumulative / grandTotal) * 100 : 0 };
    });

    // Brand client lists
    const clientsByBrand: Record<string, { client: string; months: Record<string, number>; total: number }[]> = {};
    for (const b of BRANDS) {
      clientsByBrand[b] = Object.values(byClientBrand[b]).sort((a, b2) => b2.total - a.total);
    }

    return {
      revenueByClient: clientList,
      paretoData,
      clientsByBrand,
      barrilesByClient: Object.values(barrilesClient).sort((a, b) => b.total - a.total),
      clientTypeBreakdown: Object.values(byChannel).sort((a, b) => b.revenue - a.revenue),
      monthKeys,
    };
  },

  // ─── CANALES ANALYTICS (ventas por canal con márgenes) ─────────────
  async getCanalesAnalytics(year: number, origin?: string) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    const monthKeys = generateMonthKeys(year);

    const orders = await prisma.order.findMany({
      where: {
        order_date: { gte: startDate, lte: endDate },
        status: { not: "cancelado" },
        ...originWhere(origin),
      },
      include: {
        customer: { select: { sales_channel: true } },
        items: true,
      },
    });

    const brandMap = await getProductBrandMap();

    // channel → brand → { qty, revenue, cost, months }
    type ChannelBrandData = {
      channel: string; brand: string;
      quantity: number; revenue: number; cost: number;
      months: Record<string, { quantity: number; revenue: number }>;
    };
    const data: Record<string, ChannelBrandData> = {};

    for (const order of orders) {
      const channel = order.customer.sales_channel || "Sin especificar";
      for (const item of order.items) {
        const info = brandMap.get(item.product_code);
        const brand = info?.brand || resolveBrandFromName(item.product_name);
        const key = `${channel}|${brand}`;
        const mk = getMonthKey(order.order_date);
        const qty = Number(item.quantity);
        const rev = Number(item.subtotal);
        const costPerUnit = info?.costPrice || 0;

        if (!data[key]) {
          data[key] = { channel, brand, quantity: 0, revenue: 0, cost: 0, months: {} };
          for (const m of monthKeys) data[key].months[m] = { quantity: 0, revenue: 0 };
        }
        data[key].quantity += qty;
        data[key].revenue += rev;
        data[key].cost += qty * costPerUnit;
        if (data[key].months[mk]) {
          data[key].months[mk].quantity += qty;
          data[key].months[mk].revenue += rev;
        }
      }
    }

    const result = Object.values(data).map(d => ({
      ...d,
      avgPrice: d.quantity > 0 ? d.revenue / d.quantity : 0,
      margin: d.revenue - d.cost,
      marginPercent: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0,
    }));

    return { byChannelBrand: result, monthKeys };
  },

  // ─── VENDEDORES ANALYTICS (histórico por vendedor) ─────────────────
  async getVendedoresAnalytics(origin?: string) {
    const orders = await prisma.order.findMany({
      where: { status: { not: "cancelado" }, ...originWhere(origin) },
      include: {
        created_by: { select: { name: true } },
        items: true,
      },
    });

    const brandMap = await getProductBrandMap();

    const byVendedor: Record<string, Record<number, {
      traumer: number; vitea: number; beermut: number; mixology: number;
      total: number; revenue: number;
    }>> = {};

    const vendedorNames: Record<string, string> = {};

    for (const order of orders) {
      const vName = order.created_by.name;
      const yr = order.order_date.getFullYear();
      vendedorNames[vName] = vName;

      if (!byVendedor[vName]) byVendedor[vName] = {};
      if (!byVendedor[vName][yr]) {
        byVendedor[vName][yr] = { traumer: 0, vitea: 0, beermut: 0, mixology: 0, total: 0, revenue: 0 };
      }

      for (const item of order.items) {
        const info = brandMap.get(item.product_code);
        const brand = info?.brand || resolveBrandFromName(item.product_name);
        const qty = Number(item.quantity);
        const rev = Number(item.subtotal);

        byVendedor[vName][yr].total += qty;
        byVendedor[vName][yr].revenue += rev;

        if (brand === "Träumer") byVendedor[vName][yr].traumer += qty;
        else if (brand === "Vitea") byVendedor[vName][yr].vitea += qty;
        else if (brand === "Beermut") byVendedor[vName][yr].beermut += qty;
        else if (brand === "Mixology") byVendedor[vName][yr].mixology += qty;
      }
    }

    const years = [...new Set(orders.map(o => o.order_date.getFullYear()))].sort();

    const vendedores = Object.entries(byVendedor).map(([name, yearData]) => ({
      name,
      years: yearData,
    }));

    return { vendedores, years };
  },

  // ─── VENDEDORES VISIT / CONVERSION ANALYTICS ──────────────────────
  async getVendedoresVisitAnalytics(year?: number) {
    const yearFilter = year || new Date().getFullYear();
    const startDate = new Date(yearFilter, 0, 1);
    const endDate = new Date(yearFilter, 11, 31, 23, 59, 59);

    // Get all Tango orders with vendedor and customer info
    const orders = await prisma.order.findMany({
      where: {
        origin: "tango",
        vendedor_nombre: { not: null },
        order_date: { gte: startDate, lte: endDate },
        status: { not: "cancelado" },
      },
      select: {
        vendedor_nombre: true,
        customer_id: true,
        total: true,
        customer: {
          select: {
            id: true,
            commercial_name: true,
            locality: true,
            sales_channel: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    // Get ALL customers and identify which ones have orders (real vs potencial)
    const allCustomers = await prisma.customer.findMany({
      select: {
        id: true,
        commercial_name: true,
        locality: true,
        sales_channel: true,
        latitude: true,
        longitude: true,
      },
    });

    const customerOrderCounts = await prisma.order.groupBy({
      by: ["customer_id"],
      _count: true,
    });
    const orderCountMap = new Map(customerOrderCounts.map(c => [c.customer_id, c._count]));

    // Classify customers
    const realCustomerIds = new Set<string>();
    const potencialCustomerIds = new Set<string>();
    for (const c of allCustomers) {
      if ((orderCountMap.get(c.id) || 0) > 0) {
        realCustomerIds.add(c.id);
      } else {
        potencialCustomerIds.add(c.id);
      }
    }

    // Build vendedor → customers map from orders
    const vendedorCustomers: Record<string, Set<string>> = {};
    const vendedorRevenue: Record<string, number> = {};
    const vendedorOrders: Record<string, number> = {};

    for (const order of orders) {
      const v = order.vendedor_nombre!;
      if (!vendedorCustomers[v]) {
        vendedorCustomers[v] = new Set();
        vendedorRevenue[v] = 0;
        vendedorOrders[v] = 0;
      }
      vendedorCustomers[v].add(order.customer_id);
      vendedorRevenue[v] += Number(order.total);
      vendedorOrders[v] += 1;
    }

    // Build vendedor details with customer classification
    const vendedorDetails = Object.entries(vendedorCustomers)
      .map(([name, customerIds]) => {
        const realCount = [...customerIds].filter(id => realCustomerIds.has(id)).length;
        const potencialCount = [...customerIds].filter(id => potencialCustomerIds.has(id)).length;

        // Localities heatmap for this vendedor
        const localityMap: Record<string, { count: number; revenue: number; real: number; potencial: number }> = {};
        for (const order of orders) {
          if (order.vendedor_nombre !== name) continue;
          const loc = order.customer.locality || "Sin especificar";
          if (!localityMap[loc]) localityMap[loc] = { count: 0, revenue: 0, real: 0, potencial: 0 };
          localityMap[loc].count += 1;
          localityMap[loc].revenue += Number(order.total);
          if (realCustomerIds.has(order.customer_id)) localityMap[loc].real += 1;
          else localityMap[loc].potencial += 1;
        }

        const localities = Object.entries(localityMap)
          .map(([locality, data]) => ({ locality, ...data }))
          .sort((a, b) => b.revenue - a.revenue);

        // Customer list
        const customerList = [...customerIds].map(id => {
          const c = allCustomers.find(c2 => c2.id === id);
          const isReal = realCustomerIds.has(id);
          const custOrders = orders.filter(o => o.customer_id === id && o.vendedor_nombre === name);
          return {
            name: c?.commercial_name || "Desconocido",
            locality: c?.locality || "Sin especificar",
            channel: c?.sales_channel || "Sin especificar",
            isReal,
            orders: custOrders.length,
            revenue: custOrders.reduce((s, o) => s + Number(o.total), 0),
            hasCoords: c?.latitude != null && c?.longitude != null,
          };
        }).sort((a, b) => b.revenue - a.revenue);

        return {
          name,
          totalClientes: customerIds.size,
          realClientes: realCount,
          potencialClientes: potencialCount,
          conversionRate: customerIds.size > 0 ? (realCount / customerIds.size) * 100 : 0,
          revenue: vendedorRevenue[name],
          orders: vendedorOrders[name],
          localities,
          customers: customerList,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // Global heatmap by locality (all vendedores)
    const globalLocality: Record<string, { locality: string; orders: number; revenue: number; vendedores: Set<string>; realClientes: Set<string>; potencialClientes: Set<string> }> = {};
    for (const order of orders) {
      const loc = order.customer.locality || "Sin especificar";
      if (!globalLocality[loc]) {
        globalLocality[loc] = { locality: loc, orders: 0, revenue: 0, vendedores: new Set(), realClientes: new Set(), potencialClientes: new Set() };
      }
      globalLocality[loc].orders += 1;
      globalLocality[loc].revenue += Number(order.total);
      globalLocality[loc].vendedores.add(order.vendedor_nombre!);
      if (realCustomerIds.has(order.customer_id)) {
        globalLocality[loc].realClientes.add(order.customer_id);
      } else {
        globalLocality[loc].potencialClientes.add(order.customer_id);
      }
    }

    const heatmapData = Object.values(globalLocality)
      .map(loc => ({
        locality: loc.locality,
        orders: loc.orders,
        revenue: loc.revenue,
        vendedores: loc.vendedores.size,
        vendedorNames: [...loc.vendedores],
        realClientes: loc.realClientes.size,
        potencialClientes: loc.potencialClientes.size,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Global conversion
    const totalReal = realCustomerIds.size;
    const totalPotencial = potencialCustomerIds.size;
    const totalCustomers = allCustomers.length;

    return {
      vendedores: vendedorDetails,
      heatmapData,
      conversion: {
        totalCustomers,
        realClientes: totalReal,
        potencialClientes: totalPotencial,
        conversionRate: totalCustomers > 0 ? (totalReal / totalCustomers) * 100 : 0,
      },
      year: yearFilter,
    };
  },

  // ─── DESCUENTOS ANALYTICS ─────────────────────────────────────────
  async getDescuentosAnalytics(year: number, origin?: string) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    const monthKeys = generateMonthKeys(year);

    const orders = await prisma.order.findMany({
      where: {
        order_date: { gte: startDate, lte: endDate },
        status: { not: "cancelado" },
        ...originWhere(origin),
      },
      include: { customer: { select: { commercial_name: true } } },
    });

    const byClient: Record<string, {
      client: string; subtotal: number; discountAmount: number;
      orderCount: number; months: Record<string, number>;
    }> = {};

    for (const order of orders) {
      const cName = order.customer.commercial_name;
      const mk = getMonthKey(order.order_date);
      const discountPct = Number(order.discount);
      const subtotal = Number(order.subtotal);
      const discountAmt = discountPct > 0 ? subtotal * (discountPct / 100) : 0;

      if (!byClient[cName]) {
        byClient[cName] = { client: cName, subtotal: 0, discountAmount: 0, orderCount: 0, months: {} };
        for (const m of monthKeys) byClient[cName].months[m] = 0;
      }
      byClient[cName].subtotal += subtotal;
      byClient[cName].discountAmount += discountAmt;
      byClient[cName].orderCount += 1;
      byClient[cName].months[mk] = (byClient[cName].months[mk] || 0) + discountAmt;
    }

    const clientList = Object.values(byClient)
      .map(c => ({
        ...c,
        discountPercent: c.subtotal > 0 ? (c.discountAmount / c.subtotal) * 100 : 0,
      }))
      .sort((a, b) => b.discountAmount - a.discountAmount);

    const totalDiscountAmount = clientList.reduce((s, c) => s + c.discountAmount, 0);
    const totalSubtotal = clientList.reduce((s, c) => s + c.subtotal, 0);
    const ordersWithDiscount = orders.filter(o => Number(o.discount) > 0).length;

    return {
      clients: clientList,
      summary: {
        totalDiscountAmount,
        avgDiscountPercent: totalSubtotal > 0 ? (totalDiscountAmount / totalSubtotal) * 100 : 0,
        ordersWithDiscount,
        totalOrders: orders.length,
      },
      monthKeys,
    };
  },

  // ─── KPI INDICATORS (objetivos vs actual) ─────────────────────────
  async getKpiIndicators(year: number, origin?: string) {
    const targets = await prisma.kpiTarget.findMany({ where: { year } });

    const now = new Date();
    const currentMonth = now.getMonth();
    const startOfMonth = new Date(year, currentMonth, 1);
    const endOfMonth = new Date(year, currentMonth + 1, 0, 23, 59, 59);

    const orders = await prisma.order.findMany({
      where: {
        order_date: { gte: startOfMonth, lte: endOfMonth },
        status: { not: "cancelado" },
        ...originWhere(origin),
      },
      include: { items: true },
    });

    const brandMap = await getProductBrandMap();

    let latasTraumer = 0, latasVitea = 0, latasBeermut = 0, latasMixology = 0;
    let litrosBarriles = 0, servicioTerceros = 0;

    for (const order of orders) {
      for (const item of order.items) {
        const info = brandMap.get(item.product_code);
        const brand = info?.brand || resolveBrandFromName(item.product_name);
        const qty = Number(item.quantity);

        if (brand === "Servicio") {
          servicioTerceros += Number(item.subtotal);
        } else if (isBarril(item.product_name)) {
          const liters = item.product_name.toLowerCase().includes("50l") ? 50 : 20;
          litrosBarriles += qty * liters;
        } else if (isLata(item.product_name)) {
          if (brand === "Träumer") latasTraumer += qty;
          else if (brand === "Vitea") latasVitea += qty;
          else if (brand === "Beermut") latasBeermut += qty;
          else if (brand === "Mixology") latasMixology += qty;
        }
      }
    }

    // For servicio_terceros, calculate YTD instead of monthly
    if (targets.find(t => t.key === "servicio_terceros")) {
      const ytdOrders = await prisma.order.findMany({
        where: {
          order_date: { gte: new Date(year, 0, 1), lte: endOfMonth },
          status: { not: "cancelado" },
          ...originWhere(origin),
        },
        include: { items: true },
      });
      servicioTerceros = 0;
      for (const order of ytdOrders) {
        for (const item of order.items) {
          const info = brandMap.get(item.product_code);
          const brand = info?.brand || resolveBrandFromName(item.product_name);
          if (brand === "Servicio") servicioTerceros += Number(item.subtotal);
        }
      }
    }

    const actuals: Record<string, number> = {
      latas_traumer: latasTraumer,
      latas_vitea: latasVitea,
      latas_mixology: latasMixology,
      latas_beermut: latasBeermut,
      litros_barriles: litrosBarriles,
      servicio_terceros: servicioTerceros,
    };

    const indicators = targets.map(t => {
      const actual = actuals[t.key] || 0;
      const target = Number(t.target_value);
      return {
        key: t.key,
        label: t.label,
        target,
        actual,
        percent: target > 0 ? (actual / target) * 100 : 0,
        unit: t.unit,
      };
    });

    return { indicators, year, month: currentMonth + 1 };
  },
};
