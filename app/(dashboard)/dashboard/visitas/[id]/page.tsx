"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Navigation,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface VisitRouteDetail {
  id: string;
  route_code: string;
  scheduled_date: string;
  status: string;
  google_maps_url: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  vendedor: { id: string; name: string; email: string };
  stops: {
    id: string;
    visit_order: number;
    status: string;
    visited_at: string | null;
    visit_latitude: number | null;
    visit_longitude: number | null;
    distance_to_customer: number | null;
    notes: string | null;
    customer: {
      id: string;
      code: string;
      commercial_name: string;
      contact_name: string | null;
      phone: string | null;
      street: string;
      street_number: string;
      locality: string;
      latitude: number | null;
      longitude: number | null;
      order_count: number;
    };
  }[];
}

const STOP_STATUS: Record<string, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "bg-gray-100 text-black" },
  visitado: { label: "Visitado", color: "bg-green-100 text-green-700" },
  no_visitado: { label: "No Visitado", color: "bg-red-100 text-red-700" },
};

export default function VisitaDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const [route, setRoute] = useState<VisitRouteDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/visit-routes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setRoute(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!route) {
    return <p className="text-center py-20 text-black">Ruta no encontrada</p>;
  }

  const visited = route.stops.filter((s) => s.status === "visitado").length;
  const total = route.stops.length;
  const progress = total > 0 ? (visited / total) * 100 : 0;
  const geoVerified = route.stops.filter(
    (s) => s.status === "visitado" && s.distance_to_customer !== null
  ).length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/visitas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-black">{route.route_code}</h1>
          <p className="text-sm text-black">
            Vendedor: {route.vendedor.name} · Fecha:{" "}
            {new Date(route.scheduled_date).toLocaleDateString("es-AR")}
          </p>
        </div>
        <span
          className={cn(
            "px-3 py-1 rounded-full text-sm font-medium",
            route.status === "completada"
              ? "bg-green-100 text-green-700"
              : route.status === "en_curso"
              ? "bg-amber-100 text-amber-700"
              : route.status === "cancelada"
              ? "bg-red-100 text-red-700"
              : "bg-blue-100 text-blue-700"
          )}
        >
          {route.status === "en_curso" ? "En Curso" : route.status.charAt(0).toUpperCase() + route.status.slice(1)}
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-black">Progreso</p>
            <p className="text-2xl font-bold text-black">
              {visited}/{total}
            </p>
            <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
              <div
                className="h-2 bg-green-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-black">Verificados GPS</p>
            <p className="text-2xl font-bold text-green-600">{geoVerified}</p>
            <p className="text-xs text-black">dentro del radio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-black">Potenciales</p>
            <p className="text-2xl font-bold text-orange-600">
              {route.stops.filter((s) => s.customer.order_count === 0).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-black">No Visitados</p>
            <p className="text-2xl font-bold text-red-600">
              {route.stops.filter((s) => s.status === "no_visitado").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {route.google_maps_url && (
        <a
          href={route.google_maps_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" className="w-full">
            <Navigation className="w-4 h-4 mr-2" />
            Ver Ruta en Google Maps
          </Button>
        </a>
      )}

      {/* Stops */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Paradas ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {route.stops.map((stop) => {
              const cfg = STOP_STATUS[stop.status] || STOP_STATUS.pendiente;
              return (
                <div
                  key={stop.id}
                  className={cn(
                    "p-4 border rounded-lg",
                    stop.status === "visitado" && "bg-green-50 border-green-200",
                    stop.status === "no_visitado" && "bg-red-50 border-red-200"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm mt-0.5">
                        {stop.visit_order}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-black">
                            {stop.customer.commercial_name}
                          </p>
                          {stop.customer.order_count === 0 && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              Potencial
                            </span>
                          )}
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", cfg.color)}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-black mt-1">
                          {stop.customer.street} {stop.customer.street_number},{" "}
                          {stop.customer.locality}
                        </p>
                        {stop.customer.phone && (
                          <p className="text-xs text-black flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {stop.customer.phone}
                          </p>
                        )}

                        {/* Visit verification details */}
                        {stop.status === "visitado" && (
                          <div className="mt-2 p-2 bg-white rounded border text-xs space-y-1">
                            <p className="text-black">
                              <Clock className="w-3 h-3 inline mr-1" />
                              Visitado:{" "}
                              {stop.visited_at
                                ? new Date(stop.visited_at).toLocaleString("es-AR")
                                : "-"}
                            </p>
                            {stop.distance_to_customer !== null && (
                              <p
                                className={cn(
                                  "font-medium",
                                  stop.distance_to_customer <= 200
                                    ? "text-green-600"
                                    : "text-red-600"
                                )}
                              >
                                <MapPin className="w-3 h-3 inline mr-1" />
                                Distancia: {stop.distance_to_customer}m
                                {stop.distance_to_customer <= 200 ? (
                                  <CheckCircle className="w-3 h-3 inline ml-1" />
                                ) : (
                                  <XCircle className="w-3 h-3 inline ml-1" />
                                )}
                              </p>
                            )}
                            {stop.notes && (
                              <p className="text-black italic">Nota: {stop.notes}</p>
                            )}
                          </div>
                        )}

                        {stop.status === "no_visitado" && stop.notes && (
                          <p className="text-xs text-red-600 mt-1 italic">
                            Motivo: {stop.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {(route.actual_start_time || route.actual_end_time) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tiempos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {route.actual_start_time && (
              <p className="text-black">
                Inicio: {new Date(route.actual_start_time).toLocaleString("es-AR")}
              </p>
            )}
            {route.actual_end_time && (
              <p className="text-black">
                Fin: {new Date(route.actual_end_time).toLocaleString("es-AR")}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
