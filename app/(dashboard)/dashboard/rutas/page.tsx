"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Route as RouteIcon,
  Plus,
  Loader2,
  MapPin,
  Clock,
  Truck,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface RouteRecord {
  id: string;
  route_code: string;
  scheduled_date: string;
  status: string;
  total_distance_km: string | null;
  estimated_duration: number | null;
  total_cost: string | null;
  driver: { id: string; name: string };
  _count: { route_orders: number };
}

const STATUS_COLORS: Record<string, string> = {
  planificada: "bg-blue-100 text-blue-800",
  en_curso: "bg-amber-100 text-amber-800",
  completada: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-800",
};

export default function RutasPage() {
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rutas")
      .then((r) => r.json())
      .then((data) => {
        setRoutes(data);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Rutas Inteligentes
        </h1>
        <Link href="/dashboard/rutas/generar">
          <Button>
            <Plus className="w-4 h-4" />
            Generar Ruta
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        </div>
      ) : routes.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <RouteIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-700">No hay rutas generadas.</p>
            <p className="text-sm text-gray-600 mt-1">
              Generá una ruta desde pedidos documentados.
            </p>
            <Link href="/dashboard/rutas/generar">
              <Button className="mt-4">
                <Plus className="w-4 h-4" />
                Generar Primera Ruta
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {routes.map((route) => (
            <Card key={route.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <RouteIcon className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium">{route.route_code}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-700 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(route.scheduled_date).toLocaleDateString(
                            "es-AR"
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          {route.driver.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {route._count.route_orders} paradas
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {route.total_distance_km && (
                      <span className="text-sm text-gray-700">
                        {Number(route.total_distance_km).toFixed(1)} km
                      </span>
                    )}
                    {route.estimated_duration && (
                      <span className="text-sm text-gray-700">
                        {route.estimated_duration} min
                      </span>
                    )}
                    <span
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium capitalize",
                        STATUS_COLORS[route.status]
                      )}
                    >
                      {route.status.replace("_", " ")}
                    </span>
                    <Link href={`/dashboard/rutas/${route.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
