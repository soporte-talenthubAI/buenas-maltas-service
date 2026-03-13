"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Phone,
  ExternalLink,
  Play,
  Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface RouteDetail {
  id: string;
  route_code: string;
  scheduled_date: string;
  status: string;
  total_distance_km: string | null;
  estimated_duration: number | null;
  google_maps_url: string | null;
  route_orders: {
    id: string;
    delivery_order: number;
    status: string;
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
  }[];
}

const DELIVERY_STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  entregado: "bg-green-100 text-green-800",
  no_entregado: "bg-red-100 text-red-800",
  reprogramado: "bg-blue-100 text-blue-800",
};

export default function RutaActivaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRoute = () => {
    fetch(`/api/rutas/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setRoute(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRoute();
  }, [id]);

  const handleStartRoute = async () => {
    await fetch(`/api/rutas/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "en_curso" }),
    });
    fetchRoute();
  };

  const handleDeliveryUpdate = async (
    routeOrderId: string,
    status: string
  ) => {
    setUpdatingId(routeOrderId);
    await fetch(`/api/rutas/${id}/delivery`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routeOrderId, status }),
    });
    fetchRoute();
    setUpdatingId(null);
  };

  if (loading || !route) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const delivered = route.route_orders.filter(
    (ro) => ro.status === "entregado"
  ).length;
  const total = route.route_orders.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{route.route_code}</h1>
          <div className="flex items-center gap-3 text-xs text-gray-700">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(route.scheduled_date).toLocaleDateString("es-AR")}
            </span>
            <span>
              {delivered}/{total} entregados
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${total > 0 ? (delivered / total) * 100 : 0}%` }}
        />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold">{total}</p>
            <p className="text-xs text-gray-700">Paradas</p>
          </CardContent>
        </Card>
        {route.total_distance_km && (
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">
                {Number(route.total_distance_km).toFixed(1)}
              </p>
              <p className="text-xs text-gray-700">km</p>
            </CardContent>
          </Card>
        )}
        {route.estimated_duration && (
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{route.estimated_duration}</p>
              <p className="text-xs text-gray-700">min</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {route.status === "planificada" && (
          <Button onClick={handleStartRoute} className="flex-1">
            <Play className="w-4 h-4" />
            Iniciar Ruta
          </Button>
        )}
        {route.google_maps_url && (
          <a
            href={route.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="outline" className="w-full">
              <Navigation className="w-4 h-4" />
              Abrir en Maps
            </Button>
          </a>
        )}
      </div>

      {/* Stops */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paradas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {route.route_orders.map((ro) => (
            <div
              key={ro.id}
              className={cn(
                "p-3 rounded-lg border",
                ro.status === "entregado"
                  ? "border-green-200 bg-green-50"
                  : ro.status === "no_entregado"
                    ? "border-red-200 bg-red-50"
                    : "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {ro.delivery_order}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">
                      {ro.order.customer.commercial_name}
                    </p>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs capitalize flex-shrink-0",
                        DELIVERY_STATUS_COLORS[ro.status]
                      )}
                    >
                      {ro.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {ro.order.customer.street} {ro.order.customer.street_number},{" "}
                    {ro.order.customer.locality}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {ro.order.order_number} · $
                    {Number(ro.order.total).toLocaleString("es-AR")}
                  </p>

                  {/* Action buttons for pending deliveries */}
                  {ro.status === "pendiente" &&
                    (route.status === "en_curso" ||
                      route.status === "planificada") && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-green-700 border-green-300 hover:bg-green-50"
                          disabled={updatingId === ro.id}
                          onClick={() =>
                            handleDeliveryUpdate(ro.id, "entregado")
                          }
                        >
                          {updatingId === ro.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          Entregado
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-700 border-red-300 hover:bg-red-50"
                          disabled={updatingId === ro.id}
                          onClick={() =>
                            handleDeliveryUpdate(ro.id, "no_entregado")
                          }
                        >
                          <XCircle className="w-3 h-3" />
                          No Entregado
                        </Button>
                      </div>
                    )}

                  {/* Phone link */}
                  {ro.order.customer.phone && (
                    <a
                      href={`tel:${ro.order.customer.phone}`}
                      className="inline-flex items-center gap-1 text-xs text-amber-600 mt-2"
                    >
                      <Phone className="w-3 h-3" />
                      {ro.order.customer.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
