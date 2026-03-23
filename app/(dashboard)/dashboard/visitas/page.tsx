"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  PlusCircle,
  MapPin,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface VisitRouteItem {
  id: string;
  route_code: string;
  scheduled_date: string;
  status: string;
  total_distance_km: number | null;
  estimated_duration: number | null;
  google_maps_url: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  vendedor: { id: string; name: string; email: string };
  stops: {
    id: string;
    status: string;
    visited_at: string | null;
    distance_to_customer: number | null;
    customer: { commercial_name: string; locality: string };
  }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  planificada: { label: "Planificada", color: "bg-blue-100 text-blue-700", icon: Clock },
  en_curso: { label: "En Curso", color: "bg-amber-100 text-amber-700", icon: Navigation },
  completada: { label: "Completada", color: "bg-green-100 text-green-700", icon: CheckCircle },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function VisitasPage() {
  const [routes, setRoutes] = useState<VisitRouteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const totalVisited = routes.reduce(
    (sum, r) => sum + r.stops.filter((s) => s.status === "visitado").length,
    0
  );
  const totalStops = routes.reduce((sum, r) => sum + r.stops.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">Rutas de Visita</h1>
        <Link href="/dashboard/visitas/planificar">
          <Button className="bg-amber-600 hover:bg-amber-700 text-white">
            <PlusCircle className="w-4 h-4 mr-2" />
            Planificar Visita
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-black">Total Rutas</p>
            <p className="text-2xl font-bold text-black">{routes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-black">En Curso</p>
            <p className="text-2xl font-bold text-amber-600">
              {routes.filter((r) => r.status === "en_curso").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-black">Completadas</p>
            <p className="text-2xl font-bold text-green-600">
              {routes.filter((r) => r.status === "completada").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-black">Clientes Visitados</p>
            <p className="text-2xl font-bold text-black">
              {totalVisited}/{totalStops}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Routes List */}
      {routes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-black">No hay rutas de visita</p>
            <Link href="/dashboard/visitas/planificar">
              <Button variant="outline" className="mt-3">
                <PlusCircle className="w-4 h-4 mr-2" />
                Planificar Primera Visita
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {routes.map((route) => {
            const visited = route.stops.filter((s) => s.status === "visitado").length;
            const total = route.stops.length;
            const progress = total > 0 ? (visited / total) * 100 : 0;
            const cfg = STATUS_CONFIG[route.status] || STATUS_CONFIG.planificada;
            const Icon = cfg.icon;

            return (
              <Card key={route.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-black">{route.route_code}</p>
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", cfg.color)}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-black">
                          Vendedor: <span className="font-medium">{route.vendedor.name}</span>
                        </p>
                        <p className="text-xs text-black">
                          Fecha: {new Date(route.scheduled_date).toLocaleDateString("es-AR")}
                          {" · "}{total} paradas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Progress */}
                      <div className="text-right">
                        <p className="text-sm font-medium text-black">
                          {visited}/{total} visitados
                        </p>
                        <div className="w-32 h-2 bg-gray-200 rounded-full mt-1">
                          <div
                            className="h-2 bg-green-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Verified visits */}
                      {visited > 0 && (
                        <div className="text-center">
                          <p className="text-xs text-black">Verificados</p>
                          <p className="text-sm font-medium text-green-600">
                            {route.stops.filter(
                              (s) => s.status === "visitado" && s.distance_to_customer !== null
                            ).length}
                          </p>
                        </div>
                      )}

                      <Link href={`/dashboard/visitas/${route.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
