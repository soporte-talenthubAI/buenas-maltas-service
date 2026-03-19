"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MapPin,
  Truck,
  Clock,
  ExternalLink,
  DollarSign,
  CheckCircle,
  XCircle,
  Package,
  Fuel,
  Phone,
  Loader2,
  Play,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface RouteOrder {
  id: string;
  delivery_order: number;
  status: string;
  actual_arrival: string | null;
  delivery_notes: string | null;
  order: {
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
      phone: string | null;
    };
  };
}

interface RouteDetail {
  id: string;
  route_code: string;
  scheduled_date: string;
  status: string;
  total_distance_km: string | null;
  estimated_duration: number | null;
  fuel_cost: string | null;
  driver_cost: string | null;
  total_cost: string | null;
  google_maps_url: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  driver: { id: string; name: string; email: string };
  route_orders: RouteOrder[];
}

const DELIVERY_STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  entregado: "bg-green-100 text-green-800",
  no_entregado: "bg-red-100 text-red-800",
  reprogramado: "bg-blue-100 text-blue-800",
};

const ROUTE_STATUS_COLORS: Record<string, string> = {
  planificada: "bg-blue-100 text-blue-800",
  en_curso: "bg-amber-100 text-amber-800",
  completada: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-800",
};

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchRoute = async () => {
    try {
      const res = await fetch(`/api/rutas/${id}`);
      if (!res.ok) {
        setError("No se pudo cargar la ruta");
        return;
      }
      const data = await res.json();
      setRoute(data);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleRouteStatusChange = async (
    newStatus: "en_curso" | "completada" | "cancelada"
  ) => {
    if (!route) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/rutas/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchRoute();
      }
    } catch {
      // silently fail
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeliveryStatusChange = async (
    routeOrderId: string,
    newStatus: "entregado" | "no_entregado",
    notes?: string
  ) => {
    try {
      const res = await fetch(`/api/rutas/${id}/delivery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeOrderId,
          status: newStatus,
          notes,
        }),
      });
      if (res.ok) {
        await fetchRoute();
      }
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">{error || "Ruta no encontrada"}</p>
        <Link href="/dashboard/rutas">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4" />
            Volver a Rutas
          </Button>
        </Link>
      </div>
    );
  }

  const delivered = route.route_orders.filter(
    (ro) => ro.status === "entregado"
  ).length;
  const notDelivered = route.route_orders.filter(
    (ro) => ro.status === "no_entregado"
  ).length;
  const pending = route.route_orders.filter(
    (ro) => ro.status === "pendiente"
  ).length;
  const totalValue = route.route_orders.reduce(
    (sum, ro) => sum + Number(ro.order.total),
    0
  );
  const deliveredValue = route.route_orders
    .filter((ro) => ro.status === "entregado")
    .reduce((sum, ro) => sum + Number(ro.order.total), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/rutas">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {route.route_code}
              </h1>
              <span
                className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium capitalize",
                  ROUTE_STATUS_COLORS[route.status]
                )}
              >
                {route.status.replace("_", " ")}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-800 mt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(route.scheduled_date).toLocaleDateString("es-AR")}
              </span>
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3" />
                {route.driver.name}
              </span>
              {route.actual_start_time && (
                <span className="text-green-700">
                  Inicio:{" "}
                  {new Date(route.actual_start_time).toLocaleTimeString(
                    "es-AR",
                    { hour: "2-digit", minute: "2-digit" }
                  )}
                </span>
              )}
              {route.actual_end_time && (
                <span className="text-green-700">
                  Fin:{" "}
                  {new Date(route.actual_end_time).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Route actions */}
        <div className="flex items-center gap-2">
          {route.status === "planificada" && (
            <Button
              size="sm"
              onClick={() => handleRouteStatusChange("en_curso")}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Iniciar Ruta
            </Button>
          )}
          {route.status === "en_curso" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRouteStatusChange("completada")}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Completar Ruta
            </Button>
          )}
          {(route.status === "planificada" || route.status === "en_curso") && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700"
              onClick={() => handleRouteStatusChange("cancelada")}
              disabled={updatingStatus}
            >
              <XCircle className="w-4 h-4" />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold">{route.route_orders.length}</p>
            <p className="text-xs text-gray-800">Paradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-700">{delivered}</p>
            <p className="text-xs text-gray-800">Entregados</p>
          </CardContent>
        </Card>
        {route.total_distance_km && (
          <Card>
            <CardContent className="p-4 text-center">
              <MapPin className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold">
                {Number(route.total_distance_km).toFixed(1)} km
              </p>
              <p className="text-xs text-gray-800">Distancia</p>
            </CardContent>
          </Card>
        )}
        {route.estimated_duration && (
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-2xl font-bold">
                {route.estimated_duration} min
              </p>
              <p className="text-xs text-gray-800">Duracion</p>
            </CardContent>
          </Card>
        )}
        {route.fuel_cost && (
          <Card>
            <CardContent className="p-4 text-center">
              <Fuel className="w-5 h-5 text-orange-600 mx-auto mb-1" />
              <p className="text-2xl font-bold">
                ${Number(route.fuel_cost).toFixed(0)}
              </p>
              <p className="text-xs text-gray-800">Combustible</p>
            </CardContent>
          </Card>
        )}
        {route.total_cost && (
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-2xl font-bold">
                ${Number(route.total_cost).toFixed(0)}
              </p>
              <p className="text-xs text-gray-800">Costo Total</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delivery progress */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-800">
              Progreso de entregas
            </p>
            <p className="text-sm text-gray-700">
              {delivered}/{route.route_orders.length} entregados
              {notDelivered > 0 && ` · ${notDelivered} no entregados`}
              {pending > 0 && ` · ${pending} pendientes`}
            </p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="flex rounded-full h-3 overflow-hidden">
              {delivered > 0 && (
                <div
                  className="bg-green-500 h-full"
                  style={{
                    width: `${(delivered / route.route_orders.length) * 100}%`,
                  }}
                />
              )}
              {notDelivered > 0 && (
                <div
                  className="bg-red-400 h-full"
                  style={{
                    width: `${(notDelivered / route.route_orders.length) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-700">
            <span>Valor total: ${totalValue.toLocaleString("es-AR")}</span>
            <span>
              Valor entregado: ${deliveredValue.toLocaleString("es-AR")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Map + Google Maps link */}
      {route.google_maps_url && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <a
              href={route.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full">
                <ExternalLink className="w-4 h-4" />
                Abrir Ruta Completa en Google Maps
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* Stops */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Paradas ({route.route_orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {route.route_orders.map((ro) => (
              <div
                key={ro.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border",
                  ro.status === "entregado"
                    ? "bg-green-50 border-green-200"
                    : ro.status === "no_entregado"
                      ? "bg-red-50 border-red-200"
                      : "bg-gray-50 border-gray-200"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    ro.status === "entregado"
                      ? "bg-green-600 text-white"
                      : ro.status === "no_entregado"
                        ? "bg-red-500 text-white"
                        : "bg-amber-600 text-white"
                  )}
                >
                  {ro.status === "entregado" ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : ro.status === "no_entregado" ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    ro.delivery_order
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {ro.order.customer.commercial_name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        ${Number(ro.order.total).toLocaleString("es-AR")}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs capitalize",
                          DELIVERY_STATUS_COLORS[ro.status]
                        )}
                      >
                        {ro.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-800 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {ro.order.customer.street} {ro.order.customer.street_number},{" "}
                    {ro.order.customer.locality}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-gray-700">
                      Pedido: {ro.order.order_number}
                    </p>
                    {ro.order.customer.phone && (
                      <a
                        href={`tel:${ro.order.customer.phone}`}
                        className="text-xs text-blue-600 flex items-center gap-1 hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        {ro.order.customer.phone}
                      </a>
                    )}
                    {ro.actual_arrival && (
                      <span className="text-xs text-green-700">
                        Llegada:{" "}
                        {new Date(ro.actual_arrival).toLocaleTimeString(
                          "es-AR",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </span>
                    )}
                  </div>
                  {ro.delivery_notes && (
                    <p className="text-xs text-gray-700 mt-1 italic">
                      Nota: {ro.delivery_notes}
                    </p>
                  )}

                  {/* Delivery action buttons for admin */}
                  {(route.status === "en_curso" ||
                    route.status === "planificada") &&
                    ro.status === "pendiente" && (
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() =>
                            handleDeliveryStatusChange(ro.id, "entregado")
                          }
                        >
                          <CheckCircle className="w-3 h-3" />
                          Entregado
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                          onClick={() =>
                            handleDeliveryStatusChange(ro.id, "no_entregado")
                          }
                        >
                          <XCircle className="w-3 h-3" />
                          No Entregado
                        </Button>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
