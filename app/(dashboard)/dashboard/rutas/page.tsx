"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Route as RouteIcon,
  Plus,
  Loader2,
  MapPin,
  Clock,
  Truck,
  Eye,
  Filter,
  X,
  BarChart3,
  CheckCircle,
  AlertCircle,
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
  fuel_cost: string | null;
  driver: { id: string; name: string };
  _count: { route_orders: number };
  actual_start_time: string | null;
  actual_end_time: string | null;
}

interface Driver {
  id: string;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  planificada: "bg-blue-100 text-blue-800",
  en_curso: "bg-amber-100 text-amber-800",
  completada: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-800",
};

export default function RutasPage() {
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (driverFilter) params.set("driverId", driverFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    const res = await fetch(`/api/rutas?${params}`);
    const data = await res.json();
    setRoutes(data);
    setLoading(false);
  }, [statusFilter, driverFilter, dateFrom, dateTo]);

  useEffect(() => {
    Promise.all([
      fetchRoutes(),
      fetch("/api/rutas/drivers").then((r) => r.json()).then(setDrivers),
    ]);
  }, [fetchRoutes]);

  const clearFilters = () => {
    setStatusFilter("");
    setDriverFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = statusFilter || driverFilter || dateFrom || dateTo;

  // Statistics
  const stats = {
    total: routes.length,
    planificadas: routes.filter((r) => r.status === "planificada").length,
    enCurso: routes.filter((r) => r.status === "en_curso").length,
    completadas: routes.filter((r) => r.status === "completada").length,
    canceladas: routes.filter((r) => r.status === "cancelada").length,
    totalDistance: routes.reduce(
      (s, r) => s + (r.total_distance_km ? Number(r.total_distance_km) : 0),
      0
    ),
    totalCost: routes.reduce(
      (s, r) => s + (r.total_cost ? Number(r.total_cost) : 0),
      0
    ),
    totalStops: routes.reduce((s, r) => s + r._count.route_orders, 0),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Rutas Inteligentes
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
          <Link href="/dashboard/rutas/generar">
            <Button>
              <Plus className="w-4 h-4" />
              Generar Ruta
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <RouteIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-gray-900">Rutas totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completadas}</p>
                <p className="text-xs text-gray-900">Completadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.totalDistance.toFixed(1)} km
                </p>
                <p className="text-xs text-gray-900">Distancia total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalStops}</p>
                <p className="text-xs text-gray-900">Entregas totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status summary bar */}
      <div className="flex items-center gap-4 mb-4 text-sm flex-wrap">
        <span className="text-gray-900 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Planificadas: {stats.planificadas}
        </span>
        <span className="text-gray-900 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          En curso: {stats.enCurso}
        </span>
        <span className="text-gray-900 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Completadas: {stats.completadas}
        </span>
        {stats.canceladas > 0 && (
          <span className="text-gray-900 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Canceladas: {stats.canceladas}
          </span>
        )}
        {stats.totalCost > 0 && (
          <span className="text-gray-900 ml-auto">
            Costo total: ${stats.totalCost.toFixed(0)}
          </span>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-900 mb-1 block">Estado</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="planificada">Planificada</option>
                  <option value="en_curso">En Curso</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-900 mb-1 block">Chofer</label>
                <select
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                >
                  <option value="">Todos</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-900 mb-1 block">Desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-900 mb-1 block">Hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2">
                <X className="w-3 h-3" />
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        </div>
      ) : routes.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <RouteIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-900">
              {hasActiveFilters
                ? "No se encontraron rutas con los filtros seleccionados."
                : "No hay rutas generadas."}
            </p>
            {!hasActiveFilters && (
              <>
                <p className="text-sm text-gray-800 mt-1">
                  Generá una ruta desde pedidos documentados.
                </p>
                <Link href="/dashboard/rutas/generar">
                  <Button className="mt-4">
                    <Plus className="w-4 h-4" />
                    Generar Primera Ruta
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {routes.map((route) => (
            <Card key={route.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        route.status === "completada"
                          ? "bg-green-100"
                          : route.status === "en_curso"
                          ? "bg-amber-100"
                          : route.status === "cancelada"
                          ? "bg-red-100"
                          : "bg-blue-100"
                      )}
                    >
                      {route.status === "en_curso" ? (
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                      ) : route.status === "completada" ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <RouteIcon className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{route.route_code}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-900 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(route.scheduled_date).toLocaleDateString("es-AR")}
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
                      <span className="text-sm text-gray-900 hidden md:inline">
                        {Number(route.total_distance_km).toFixed(1)} km
                      </span>
                    )}
                    {route.estimated_duration && (
                      <span className="text-sm text-gray-900 hidden md:inline">
                        {route.estimated_duration} min
                      </span>
                    )}
                    {route.total_cost && (
                      <span className="text-sm font-medium text-gray-900 hidden md:inline">
                        ${Number(route.total_cost).toFixed(0)}
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
