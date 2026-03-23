"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  MapPin,
  CheckCircle,
  Clock,
  Navigation,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface VisitRouteItem {
  id: string;
  route_code: string;
  scheduled_date: string;
  status: string;
  google_maps_url: string | null;
  vendedor: { id: string; name: string };
  stops: {
    id: string;
    status: string;
    customer: { commercial_name: string; locality: string };
  }[];
}

export default function MisVisitasPage() {
  const [routes, setRoutes] = useState<VisitRouteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: filter by current vendedor when auth context is available
    fetch("/api/visit-routes")
      .then((r) => r.json())
      .then((data) => {
        setRoutes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const todayRoutes = routes.filter(
    (r) => r.scheduled_date.split("T")[0] === today
  );
  const otherRoutes = routes.filter(
    (r) => r.scheduled_date.split("T")[0] !== today
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-black">Mis Visitas</h1>

      {/* Today */}
      <div>
        <h2 className="text-lg font-semibold text-black mb-3">
          Hoy ({new Date().toLocaleDateString("es-AR")})
        </h2>
        {todayRoutes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-black">No tenes visitas programadas para hoy</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayRoutes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        )}
      </div>

      {/* Other days */}
      {otherRoutes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-black mb-3">
            Proximas Visitas
          </h2>
          <div className="space-y-3">
            {otherRoutes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RouteCard({ route }: { route: VisitRouteItem }) {
  const visited = route.stops.filter((s) => s.status === "visitado").length;
  const total = route.stops.length;
  const progress = total > 0 ? (visited / total) * 100 : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              {route.status === "en_curso" ? (
                <Navigation className="w-5 h-5 text-amber-600" />
              ) : route.status === "completada" ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <Clock className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <p className="font-bold text-black">{route.route_code}</p>
              <p className="text-xs text-black">
                {new Date(route.scheduled_date).toLocaleDateString("es-AR")}
                {" · "}{total} paradas · {visited} visitados
              </p>
              <div className="w-32 h-1.5 bg-gray-200 rounded-full mt-1">
                <div
                  className="h-1.5 bg-green-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                route.status === "en_curso"
                  ? "bg-amber-100 text-amber-700"
                  : route.status === "completada"
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              )}
            >
              {route.status === "en_curso"
                ? "En Curso"
                : route.status === "completada"
                ? "Completada"
                : "Planificada"}
            </span>
            <Link href={`/ventas/visitas/${route.id}`}>
              <Button
                size="sm"
                className={cn(
                  route.status === "en_curso"
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : ""
                )}
              >
                {route.status === "en_curso" ? (
                  <>
                    <Play className="w-4 h-4 mr-1" />
                    Continuar
                  </>
                ) : route.status === "completada" ? (
                  "Ver"
                ) : (
                  "Iniciar"
                )}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
