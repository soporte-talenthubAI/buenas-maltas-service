import { prisma } from "@/lib/prisma/client";
import type {
  Location,
  RutaInteligenteRequest,
  RutaInteligenteResponse,
} from "@/lib/types/rutas-inteligentes";
import { DEFAULT_DEPOT } from "@/lib/types/rutas-inteligentes";

const API_URL =
  process.env.NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL ??
  "https://v0-micro-saa-s-git-develop-talenthubais-projects.vercel.app";

export const rutasInteligentesService = {
  async getDocumentedOrders(filters: { locality?: string; dateFrom?: string; dateTo?: string } = {}) {
    const where: Record<string, unknown> = {
      status: "documentado",
      customer: {
        latitude: { not: null },
        longitude: { not: null },
      },
    };

    if (filters.locality) {
      (where.customer as Record<string, unknown>).locality = filters.locality;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.delivery_date = {
        ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
        ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
      };
    }

    return prisma.order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            commercial_name: true,
            street: true,
            street_number: true,
            locality: true,
            latitude: true,
            longitude: true,
            has_time_restriction: true,
            delivery_window_start: true,
            delivery_window_end: true,
          },
        },
        items: true,
      },
      orderBy: { delivery_date: "asc" },
    });
  },

  buildLocations(
    orders: Awaited<ReturnType<typeof this.getDocumentedOrders>>,
    depotStart = DEFAULT_DEPOT,
    depotEnd = DEFAULT_DEPOT
  ): Location[] {
    const locations: Location[] = [
      {
        id: "depot-start",
        lat: depotStart.lat,
        lng: depotStart.lng,
        type: "partida",
        address: depotStart.address,
      },
    ];

    for (const order of orders) {
      const c = order.customer;
      locations.push({
        id: order.id,
        lat: Number(c.latitude),
        lng: Number(c.longitude),
        type: "intermedio",
        address: `${c.commercial_name} - ${c.street} ${c.street_number}, ${c.locality}`,
        isTimeRestricted: c.has_time_restriction,
        timeWindow:
          c.has_time_restriction && c.delivery_window_start && c.delivery_window_end
            ? { start: c.delivery_window_start, end: c.delivery_window_end }
            : undefined,
      });
    }

    locations.push({
      id: "depot-end",
      lat: depotEnd.lat,
      lng: depotEnd.lng,
      type: "llegada",
      address: depotEnd.address,
    });

    return locations;
  },

  async generateRoute(request: RutaInteligenteRequest): Promise<RutaInteligenteResponse> {
    const res = await fetch(`${API_URL}/api/rutas-inteligentes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-client-id": "buenas-maltas-client",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      throw new Error(`Route optimization failed: ${res.statusText}`);
    }

    return res.json();
  },

  async saveRoute(data: {
    driverId: string;
    scheduledDate: Date;
    orderIds: string[];
    optimizationResult: RutaInteligenteResponse["data"];
    googleMapsUrl: string | null;
  }) {
    const routeCode = `RUT-${Date.now().toString().slice(-8)}`;

    const route = await prisma.route.create({
      data: {
        route_code: routeCode,
        driver_id: data.driverId,
        scheduled_date: data.scheduledDate,
        status: "planificada",
        total_distance_km: data.optimizationResult.vrptw?.totalDistance ?? null,
        estimated_duration: data.optimizationResult.vrptw?.totalDuration
          ? Math.round(data.optimizationResult.vrptw.totalDuration)
          : null,
        fuel_cost: data.optimizationResult.costCalculation?.fuelCost ?? null,
        driver_cost: data.optimizationResult.costCalculation?.driverCost ?? null,
        total_cost: data.optimizationResult.costCalculation?.totalCost ?? null,
        google_maps_url: data.googleMapsUrl,
        optimized_route: JSON.parse(JSON.stringify(data.optimizationResult)),
        vrptw_result: data.optimizationResult.vrptw
          ? JSON.parse(JSON.stringify(data.optimizationResult.vrptw))
          : null,
        route_orders: {
          create: data.orderIds.map((orderId, index) => ({
            order_id: orderId,
            delivery_order: index + 1,
          })),
        },
      },
      include: { route_orders: true },
    });

    // Update orders status
    await prisma.order.updateMany({
      where: { id: { in: data.orderIds } },
      data: { status: "en_ruta" },
    });

    return route;
  },

  async getRoutes(filters: { status?: string; driverId?: string } = {}) {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.driverId) where.driver_id = filters.driverId;

    return prisma.route.findMany({
      where,
      include: {
        driver: { select: { id: true, name: true } },
        _count: { select: { route_orders: true } },
      },
      orderBy: { scheduled_date: "desc" },
    });
  },

  async getRouteById(id: string) {
    return prisma.route.findUnique({
      where: { id },
      include: {
        driver: { select: { id: true, name: true, email: true } },
        route_orders: {
          include: {
            order: {
              include: {
                customer: {
                  select: {
                    commercial_name: true,
                    street: true,
                    street_number: true,
                    locality: true,
                    latitude: true,
                    longitude: true,
                    phone: true,
                  },
                },
              },
            },
          },
          orderBy: { delivery_order: "asc" },
        },
      },
    });
  },

  async getDrivers() {
    return prisma.user.findMany({
      where: { role: "repartidor", is_active: true },
      select: { id: true, name: true, email: true },
    });
  },

  async updateRouteStatus(routeId: string, status: "planificada" | "en_curso" | "completada" | "cancelada") {
    return prisma.route.update({
      where: { id: routeId },
      data: {
        status,
        ...(status === "en_curso" ? { actual_start_time: new Date() } : {}),
        ...(status === "completada" ? { actual_end_time: new Date() } : {}),
      },
    });
  },

  async updateDeliveryStatus(
    routeOrderId: string,
    status: "pendiente" | "entregado" | "no_entregado" | "reprogramado",
    notes?: string
  ) {
    const routeOrder = await prisma.routeOrder.update({
      where: { id: routeOrderId },
      data: {
        status,
        delivery_notes: notes ?? null,
        ...(status === "entregado" ? { actual_arrival: new Date() } : {}),
      },
      include: { order: true, route: { include: { route_orders: true } } },
    });

    // Update order status based on delivery
    if (status === "entregado") {
      await prisma.order.update({
        where: { id: routeOrder.order_id },
        data: { status: "entregado" },
      });
    }

    // Check if all deliveries are done → complete route
    const allDone = routeOrder.route.route_orders.every(
      (ro) =>
        ro.id === routeOrderId
          ? status !== "pendiente"
          : ro.status !== "pendiente"
    );
    if (allDone) {
      await prisma.route.update({
        where: { id: routeOrder.route_id },
        data: { status: "completada", actual_end_time: new Date() },
      });
    }

    return routeOrder;
  },
};
