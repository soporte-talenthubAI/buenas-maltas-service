"use client";

import { useState, useEffect, useCallback } from "react";
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
  Play,
  AlertTriangle,
  Locate,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

// ─── Haversine Distance ───────────────────────────────────────

function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
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

// ─── Types ────────────────────────────────────────────────────

interface VisitRouteDetail {
  id: string;
  route_code: string;
  scheduled_date: string;
  status: string;
  google_maps_url: string | null;
  vendedor: { id: string; name: string };
  stops: StopDetail[];
}

interface StopDetail {
  id: string;
  visit_order: number;
  status: string;
  visited_at: string | null;
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
}

// ─── Page ─────────────────────────────────────────────────────

export default function VisitaActivaPage() {
  const params = useParams();
  const id = params.id as string;

  const [route, setRoute] = useState<VisitRouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<{
    stopId: string;
    distance: number;
    withinRange: boolean;
  } | null>(null);
  const [noteStopId, setNoteStopId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const fetchRoute = useCallback(async () => {
    try {
      const res = await fetch(`/api/visit-routes/${id}`);
      const data = await res.json();
      setRoute(data);
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  // Start route
  const handleStartRoute = async () => {
    await fetch(`/api/visit-routes/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "en_curso" }),
    });
    await fetchRoute();
  };

  // Get current GPS position
  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalización no disponible en este dispositivo"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("Permiso de ubicación denegado. Habilitalo en los ajustes del navegador."));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("No se pudo obtener la ubicación. Verificá que el GPS esté activado."));
            break;
          case error.TIMEOUT:
            reject(new Error("La solicitud de ubicación tardó demasiado. Intentá de nuevo."));
            break;
          default:
            reject(new Error("Error al obtener ubicación"));
        }
      }, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });
  };

  // Check-in: validate geolocation and mark as visited
  const handleCheckIn = async (stop: StopDetail) => {
    setCheckingIn(stop.id);
    setLocationError(null);
    setGeoStatus(null);

    try {
      const position = await getCurrentPosition();
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      // Calculate distance client-side for immediate feedback
      if (stop.customer.latitude && stop.customer.longitude) {
        const dist = Math.round(
          calculateHaversineDistance(
            userLat,
            userLng,
            Number(stop.customer.latitude),
            Number(stop.customer.longitude)
          )
        );
        setGeoStatus({
          stopId: stop.id,
          distance: dist,
          withinRange: dist <= 200,
        });

        if (dist > 200) {
          setLocationError(
            `Estás a ${dist}m de "${stop.customer.commercial_name}". Debés estar a menos de 200m para registrar la visita.`
          );
          setCheckingIn(null);
          return;
        }
      }

      // Send to server for verification and save
      const res = await fetch(`/api/visit-routes/${id}/checkin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stop_id: stop.id,
          latitude: userLat,
          longitude: userLng,
          status: "visitado",
          notes: noteText || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLocationError(data.error || "Error al registrar visita");
        setCheckingIn(null);
        return;
      }

      setNoteStopId(null);
      setNoteText("");
      await fetchRoute();
    } catch (err) {
      setLocationError((err as Error).message);
    } finally {
      setCheckingIn(null);
    }
  };

  // Mark as not visited (no geolocation needed)
  const handleNotVisited = async (stop: StopDetail) => {
    setCheckingIn(stop.id);
    setLocationError(null);

    try {
      // Get position anyway for tracking
      let lat = 0, lng = 0;
      try {
        const pos = await getCurrentPosition();
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // Position not required for "no_visitado"
      }

      await fetch(`/api/visit-routes/${id}/checkin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stop_id: stop.id,
          latitude: lat,
          longitude: lng,
          status: "no_visitado",
          notes: noteText || "No visitado",
        }),
      });

      setNoteStopId(null);
      setNoteText("");
      await fetchRoute();
    } catch {
      setLocationError("Error al registrar");
    } finally {
      setCheckingIn(null);
    }
  };

  if (loading || !route) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const visited = route.stops.filter((s) => s.status === "visitado").length;
  const total = route.stops.length;
  const progress = total > 0 ? (visited / total) * 100 : 0;
  const isActive = route.status === "en_curso";

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/ventas/visitas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-black">{route.route_code}</h1>
          <p className="text-sm text-black">
            {new Date(route.scheduled_date).toLocaleDateString("es-AR")}
          </p>
        </div>
        <span
          className={cn(
            "px-3 py-1 rounded-full text-sm font-medium",
            isActive
              ? "bg-amber-100 text-amber-700"
              : route.status === "completada"
              ? "bg-green-100 text-green-700"
              : "bg-blue-100 text-blue-700"
          )}
        >
          {isActive ? "En Curso" : route.status === "completada" ? "Completada" : "Planificada"}
        </span>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-black">
              Progreso: {visited}/{total} visitados
            </p>
            <p className="text-sm font-bold text-amber-600">
              {Math.round(progress)}%
            </p>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full">
            <div
              className="h-3 bg-green-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Start button */}
      {route.status === "planificada" && (
        <Button
          onClick={handleStartRoute}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white py-6 text-lg"
        >
          <Play className="w-5 h-5 mr-2" />
          Iniciar Ruta de Visita
        </Button>
      )}

      {/* Google Maps */}
      {route.google_maps_url && isActive && (
        <a href={route.google_maps_url} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="w-full">
            <Navigation className="w-4 h-4 mr-2" />
            Abrir en Google Maps
          </Button>
        </a>
      )}

      {/* Location error */}
      {locationError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-red-700">{locationError}</p>
            {geoStatus && !geoStatus.withinRange && (
              <p className="text-xs text-red-500 mt-1">
                Acercate al cliente e intenta de nuevo.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stops */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Paradas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {route.stops.map((stop) => (
            <div
              key={stop.id}
              className={cn(
                "p-4 border rounded-lg",
                stop.status === "visitado" && "bg-green-50 border-green-200",
                stop.status === "no_visitado" && "bg-red-50 border-red-200"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Order number */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                    stop.status === "visitado"
                      ? "bg-green-200 text-green-700"
                      : stop.status === "no_visitado"
                      ? "bg-red-200 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  )}
                >
                  {stop.status === "visitado" ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : stop.status === "no_visitado" ? (
                    <XCircle className="w-5 h-5" />
                  ) : (
                    stop.visit_order
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-black">
                      {stop.customer.commercial_name}
                    </p>
                    {stop.customer.order_count === 0 && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Potencial
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-black mt-0.5">
                    {stop.customer.street} {stop.customer.street_number},{" "}
                    {stop.customer.locality}
                  </p>

                  {/* Contact */}
                  {stop.customer.phone && (
                    <a
                      href={`tel:${stop.customer.phone}`}
                      className="text-xs text-amber-600 flex items-center gap-1 mt-1"
                    >
                      <Phone className="w-3 h-3" />
                      {stop.customer.phone}
                    </a>
                  )}

                  {/* Visited info */}
                  {stop.status === "visitado" && (
                    <div className="mt-2 text-xs space-y-0.5">
                      <p className="text-green-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {stop.visited_at
                          ? new Date(stop.visited_at).toLocaleTimeString("es-AR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                      {stop.distance_to_customer !== null && (
                        <p
                          className={cn(
                            "flex items-center gap-1",
                            stop.distance_to_customer <= 200
                              ? "text-green-600"
                              : "text-red-600"
                          )}
                        >
                          <Locate className="w-3 h-3" />
                          {stop.distance_to_customer}m{" "}
                          {stop.distance_to_customer <= 200 ? "✓" : "✗"}
                        </p>
                      )}
                      {stop.notes && (
                        <p className="text-black italic">{stop.notes}</p>
                      )}
                    </div>
                  )}

                  {stop.status === "no_visitado" && stop.notes && (
                    <p className="text-xs text-red-600 mt-1 italic">{stop.notes}</p>
                  )}

                  {/* Notes input */}
                  {noteStopId === stop.id && (
                    <div className="mt-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Notas de la visita (opcional)..."
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
                        rows={2}
                      />
                    </div>
                  )}

                  {/* Actions */}
                  {isActive && stop.status === "pendiente" && (
                    <div className="flex gap-2 mt-3">
                      {noteStopId !== stop.id ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                              setNoteStopId(stop.id);
                              setNoteText("");
                              setLocationError(null);
                              setGeoStatus(null);
                            }}
                            disabled={checkingIn !== null}
                          >
                            <MapPin className="w-4 h-4 mr-1" />
                            Visitar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200"
                            onClick={() => {
                              setNoteStopId(stop.id);
                              setNoteText("");
                              setLocationError(null);
                            }}
                            disabled={checkingIn !== null}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            No Visitado
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleCheckIn(stop)}
                            disabled={checkingIn !== null}
                          >
                            {checkingIn === stop.id ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-1" />
                            )}
                            Confirmar Visita
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200"
                            onClick={() => handleNotVisited(stop)}
                            disabled={checkingIn !== null}
                          >
                            No Visitado
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setNoteStopId(null);
                              setNoteText("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Route completed */}
      {route.status === "completada" && (
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-bold text-black">Ruta Completada</p>
            <p className="text-sm text-black mt-1">
              {visited} de {total} clientes visitados
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
