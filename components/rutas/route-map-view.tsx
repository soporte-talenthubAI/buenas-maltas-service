"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Map,
  Clock,
  Fuel,
  DollarSign,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MapPin,
} from "lucide-react";
import type {
  Location,
  RouteSegment,
  RutaInteligenteResponse,
} from "@/lib/types/rutas-inteligentes";

interface RouteMapViewProps {
  googleMapsUrl: string | null;
  segments?: RouteSegment[];
  optimizedOrder?: Location[];
  vrptw?: RutaInteligenteResponse["data"]["vrptw"];
  costCalculation?: RutaInteligenteResponse["data"]["costCalculation"];
}

export function RouteMapView({
  googleMapsUrl,
  segments,
  optimizedOrder,
  vrptw,
  costCalculation,
}: RouteMapViewProps) {
  const [activeSegment, setActiveSegment] = useState(0);
  const [showStops, setShowStops] = useState(false);

  const isSegmented = segments && segments.length > 0;
  const mapUrl = isSegmented
    ? segments[activeSegment]?.googleMapsUrl
    : googleMapsUrl;

  // Build embed URL from directions URL
  const getEmbedUrl = (url: string | null) => {
    if (!url) return null;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;

    // Parse origin/destination/waypoints from the URL
    try {
      const parsed = new URL(url);
      const origin = parsed.searchParams.get("origin") ?? "";
      const destination = parsed.searchParams.get("destination") ?? "";
      const waypoints = parsed.searchParams.get("waypoints") ?? "";

      return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}&mode=driving`;
    } catch {
      return null;
    }
  };

  const embedUrl = getEmbedUrl(mapUrl);
  const stops =
    optimizedOrder?.filter((l) => l.type === "intermedio") ?? [];

  return (
    <div className="space-y-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {vrptw && (
          <>
            <Card>
              <CardContent className="p-4 text-center">
                <Map className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-bold">
                  {vrptw.totalDistance?.toFixed(1)} km
                </p>
                <p className="text-xs text-gray-800">Distancia</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold">
                  {Math.round(vrptw.totalDuration ?? 0)} min
                </p>
                <p className="text-xs text-gray-800">Duración</p>
              </CardContent>
            </Card>
          </>
        )}
        {costCalculation && (
          <>
            <Card>
              <CardContent className="p-4 text-center">
                <Fuel className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <p className="text-lg font-bold">
                  ${costCalculation.fuelCost.toFixed(0)}
                </p>
                <p className="text-xs text-gray-800">Combustible</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <p className="text-lg font-bold">
                  ${costCalculation.totalCost.toFixed(0)}
                </p>
                <p className="text-xs text-gray-800">Costo Total</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Map */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Map className="w-4 h-4" />
              Mapa de Ruta
            </CardTitle>
            {mapUrl && (
              <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-3 h-3" />
                  Google Maps
                </Button>
              </a>
            )}
          </div>

          {isSegmented && (
            <div className="flex gap-2 mt-2">
              {segments.map((seg, i) => (
                <Button
                  key={seg.id}
                  variant={i === activeSegment ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveSegment(i)}
                >
                  {seg.name}
                </Button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-[400px] rounded-lg border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : mapUrl ? (
            <div className="w-full h-[400px] rounded-lg bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-800 mb-2">
                  Configurá GOOGLE_MAPS_API_KEY para ver el mapa embebido
                </p>
                <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4" />
                    Abrir en Google Maps
                  </Button>
                </a>
              </div>
            </div>
          ) : (
            <div className="w-full h-[400px] rounded-lg bg-gray-100 flex items-center justify-center">
              <p className="text-gray-800">Mapa no disponible</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stops list */}
      {stops.length > 0 && (
        <Card>
          <CardHeader>
            <button
              onClick={() => setShowStops(!showStops)}
              className="flex items-center justify-between w-full"
            >
              <CardTitle className="text-base">
                Paradas ({stops.length})
              </CardTitle>
              {showStops ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </CardHeader>
          {showStops && (
            <CardContent>
              <div className="space-y-2">
                {stops.map((stop, i) => {
                  const arrival = vrptw?.arrivalTimes?.find(
                    (a) => a.locationId === stop.id
                  );
                  return (
                    <div
                      key={stop.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                    >
                      <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{stop.address}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-800">
                          <MapPin className="w-3 h-3" />
                          {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                          {arrival && (
                            <span className="ml-2">
                              Llegada: {arrival.estimatedArrival}
                              {!arrival.withinWindow && (
                                <span className="text-red-500 ml-1">
                                  (fuera de ventana)
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
