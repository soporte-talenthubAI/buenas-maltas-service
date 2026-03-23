import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

// Haversine formula - returns distance in meters
function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { stop_id, latitude, longitude, status, notes } = body;

    if (!stop_id || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "stop_id, latitude y longitude son requeridos" },
        { status: 400 }
      );
    }

    // Get the stop with customer coordinates
    const stop = await prisma.visitStop.findUnique({
      where: { id: stop_id },
      include: {
        customer: {
          select: { latitude: true, longitude: true, commercial_name: true },
        },
        visit_route: { select: { id: true } },
      },
    });

    if (!stop || stop.visit_route.id !== id) {
      return NextResponse.json(
        { error: "Parada no encontrada en esta ruta" },
        { status: 404 }
      );
    }

    // Get radius from depot config (default 200m)
    const depot = await prisma.depotConfig.findFirst({
      where: { is_active: true },
      select: { radius_meters: true },
    });
    const maxRadius = depot?.radius_meters || 200;

    // Calculate distance if customer has coordinates
    let distance: number | null = null;
    let withinRange = true;

    if (stop.customer.latitude && stop.customer.longitude) {
      distance = Math.round(
        calculateHaversineDistance(
          latitude,
          longitude,
          Number(stop.customer.latitude),
          Number(stop.customer.longitude)
        )
      );
      withinRange = distance <= maxRadius;
    }

    // If marking as visited but not within range, reject
    if (status === "visitado" && !withinRange) {
      return NextResponse.json(
        {
          error: `Estás a ${distance}m del cliente "${stop.customer.commercial_name}". Debés estar a menos de ${maxRadius}m para marcar la visita.`,
          distance,
          max_radius: maxRadius,
          within_range: false,
        },
        { status: 422 }
      );
    }

    // Update the stop
    const updatedStop = await prisma.visitStop.update({
      where: { id: stop_id },
      data: {
        status: status || "visitado",
        visited_at: status === "visitado" ? new Date() : null,
        visit_latitude: latitude,
        visit_longitude: longitude,
        distance_to_customer: distance,
        notes: notes || null,
      },
    });

    // Check if all stops are completed → auto-complete route
    const allStops = await prisma.visitStop.findMany({
      where: { visit_route_id: id },
    });
    const allDone = allStops.every((s) => s.status !== "pendiente");
    if (allDone) {
      await prisma.visitRoute.update({
        where: { id },
        data: { status: "completada", actual_end_time: new Date() },
      });
    }

    return NextResponse.json({
      ...updatedStop,
      distance,
      within_range: withinRange,
      max_radius: maxRadius,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
