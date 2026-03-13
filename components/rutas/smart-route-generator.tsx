"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteMapView } from "./route-map-view";
import {
  Route as RouteIcon,
  Loader2,
  CheckSquare,
  Square,
  MapPin,
  Truck,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  VEHICLE_TYPES,
  FUEL_TYPES,
  DEFAULT_DEPOT,
} from "@/lib/types/rutas-inteligentes";
import type {
  Location,
  RutaInteligenteResponse,
} from "@/lib/types/rutas-inteligentes";

interface OrderForRoute {
  id: string;
  order_number: string;
  total: string;
  customer: {
    commercial_name: string;
    street: string;
    street_number: string;
    locality: string;
    latitude: string | null;
    longitude: string | null;
    has_time_restriction: boolean;
    delivery_window_start: string | null;
    delivery_window_end: string | null;
  };
}

interface Driver {
  id: string;
  name: string;
}

export function SmartRouteGenerator() {
  const [orders, setOrders] = useState<OrderForRoute[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<RutaInteligenteResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Config
  const [vehicleType, setVehicleType] = useState("commercial");
  const [fuelType, setFuelType] = useState("gasoil");
  const [startTime, setStartTime] = useState("08:00");
  const [driverId, setDriverId] = useState("");
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    Promise.all([
      fetch("/api/rutas/orders").then((r) => r.json()),
      fetch("/api/rutas/drivers").then((r) => r.json()),
    ]).then(([ordersData, driversData]) => {
      setOrders(ordersData);
      setDrivers(driversData);
      if (driversData.length) setDriverId(driversData[0].id);
      setLoading(false);
    });
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (selected.size < 2) {
      setError("Seleccioná al menos 2 pedidos");
      return;
    }

    setGenerating(true);
    setError(null);
    setResult(null);

    const selectedOrders = orders.filter((o) => selected.has(o.id));

    const locations: Location[] = [
      {
        id: "depot-start",
        lat: DEFAULT_DEPOT.lat,
        lng: DEFAULT_DEPOT.lng,
        type: "partida",
        address: DEFAULT_DEPOT.address,
      },
      ...selectedOrders.map((o) => ({
        id: o.id,
        lat: Number(o.customer.latitude),
        lng: Number(o.customer.longitude),
        type: "intermedio" as const,
        address: `${o.customer.commercial_name} - ${o.customer.street} ${o.customer.street_number}`,
        isTimeRestricted: o.customer.has_time_restriction,
        timeWindow:
          o.customer.has_time_restriction &&
          o.customer.delivery_window_start &&
          o.customer.delivery_window_end
            ? {
                start: o.customer.delivery_window_start,
                end: o.customer.delivery_window_end,
              }
            : undefined,
      })),
      {
        id: "depot-end",
        lat: DEFAULT_DEPOT.lat,
        lng: DEFAULT_DEPOT.lng,
        type: "llegada",
        address: DEFAULT_DEPOT.address,
      },
    ];

    try {
      const res = await fetch("/api/proxy-rutas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locations,
          travelMode: "DRIVING",
          language: "es",
          vehicleType,
          fuelType,
          routeStartTime: startTime,
          serviceTimeMinutes: 5,
        }),
      });

      const data: RutaInteligenteResponse = await res.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError("Error al generar la ruta. Intentá de nuevo.");
      }
    } catch {
      setError("Error de conexión con el servicio de rutas.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result || !driverId) return;
    setSaving(true);

    try {
      const res = await fetch("/api/rutas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId,
          scheduledDate,
          orderIds: Array.from(selected),
          optimizationResult: result,
          googleMapsUrl: result.googleMapsUrl,
        }),
      });

      if (res.ok) {
        window.location.href = "/dashboard/rutas";
      }
    } catch {
      setError("Error al guardar la ruta");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Order selection + config */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-gray-700">Fecha de ruta</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-700">Chofer</label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-700">Vehículo</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                >
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-700">Combustible</label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                >
                  {FUEL_TYPES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-700">Hora inicio</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Pedidos Documentados ({orders.length})</span>
              <span className="text-sm font-normal text-amber-600">
                {selected.size} seleccionados
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-700">
                No hay pedidos documentados con coordenadas disponibles.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {orders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => toggleSelect(order.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      selected.has(order.id)
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {order.customer.commercial_name}
                        </p>
                        <p className="text-xs text-gray-700 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {order.customer.street} {order.customer.street_number}
                        </p>
                        <p className="text-xs text-gray-600">
                          {order.order_number} · $
                          {Number(order.total).toLocaleString("es-AR")}
                        </p>
                      </div>
                      {selected.has(order.id) ? (
                        <CheckSquare className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                    {order.customer.has_time_restriction && (
                      <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {order.customer.delivery_window_start} -{" "}
                        {order.customer.delivery_window_end}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={selected.size < 2 || generating}
                className="flex-1"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RouteIcon className="w-4 h-4" />
                )}
                {generating ? "Optimizando..." : "Generar Ruta"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Map + results */}
      <div className="lg:col-span-2 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
            {error}
          </div>
        )}

        {result ? (
          <>
            <RouteMapView
              googleMapsUrl={result.googleMapsUrl}
              segments={result.segments}
              optimizedOrder={result.optimizedOrder}
              vrptw={result.vrptw}
              costCalculation={result.costCalculation}
            />

            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Button onClick={handleSave} disabled={saving} className="flex-1">
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Guardar Ruta y Asignar a Chofer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-20 text-center">
              <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700">
                Seleccioná pedidos y generá una ruta optimizada.
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Mínimo 2 pedidos documentados con coordenadas.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
