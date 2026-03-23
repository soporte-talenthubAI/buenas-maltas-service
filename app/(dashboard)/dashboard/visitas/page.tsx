"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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
  Filter,
  Calendar,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Users,
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

interface Vendedor {
  id: string;
  name: string;
}

type TimePeriod = "all" | "today" | "week" | "month" | "future" | "past" | "custom";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  planificada: { label: "Planificada", color: "bg-blue-100 text-blue-700", icon: Clock },
  en_curso: { label: "En Curso", color: "bg-amber-100 text-amber-700", icon: Navigation },
  completada: { label: "Completada", color: "bg-green-100 text-green-700", icon: CheckCircle },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-700", icon: XCircle },
};

const TIME_PRESETS: { id: TimePeriod; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "today", label: "Hoy" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mes" },
  { id: "future", label: "Futuras" },
  { id: "past", label: "Historial" },
  { id: "custom", label: "Personalizado" },
];

function getDateRange(period: TimePeriod): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  switch (period) {
    case "today":
      return { dateFrom: today, dateTo: today };
    case "week": {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        dateFrom: monday.toISOString().split("T")[0],
        dateTo: sunday.toISOString().split("T")[0],
      };
    }
    case "month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        dateFrom: first.toISOString().split("T")[0],
        dateTo: last.toISOString().split("T")[0],
      };
    }
    case "future":
      return { dateFrom: today };
    case "past":
      return { dateTo: today };
    default:
      return {};
  }
}

export default function VisitasPage() {
  const [routes, setRoutes] = useState<VisitRouteItem[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);

  // Filters
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vendedorFilter, setVendedorFilter] = useState("");
  const [localityFilter, setLocalityFilter] = useState("");
  const [searchText, setSearchText] = useState("");

  // Load vendedores on mount
  useEffect(() => {
    fetch("/api/vendedores")
      .then((r) => r.json())
      .then((data) => setVendedores(data))
      .catch(() => {});
  }, []);

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      // Date range
      if (timePeriod === "custom") {
        if (customFrom) params.set("dateFrom", customFrom);
        if (customTo) params.set("dateTo", customTo);
      } else if (timePeriod !== "all") {
        const range = getDateRange(timePeriod);
        if (range.dateFrom) params.set("dateFrom", range.dateFrom);
        if (range.dateTo) params.set("dateTo", range.dateTo);
      }

      if (statusFilter) params.set("status", statusFilter);
      if (vendedorFilter) params.set("vendedorId", vendedorFilter);

      const res = await fetch(`/api/visit-routes?${params}`);
      const data = await res.json();
      setRoutes(data);
    } catch {
      console.error("Error loading visit routes");
    } finally {
      setLoading(false);
    }
  }, [timePeriod, customFrom, customTo, statusFilter, vendedorFilter]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  // Client-side filters: locality + search text
  const filteredRoutes = useMemo(() => {
    let result = routes;

    if (localityFilter) {
      result = result.filter((r) =>
        r.stops.some((s) => s.customer.locality === localityFilter)
      );
    }

    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (r) =>
          r.route_code.toLowerCase().includes(q) ||
          r.vendedor.name.toLowerCase().includes(q) ||
          r.stops.some(
            (s) =>
              s.customer.commercial_name.toLowerCase().includes(q) ||
              s.customer.locality.toLowerCase().includes(q)
          )
      );
    }

    return result;
  }, [routes, localityFilter, searchText]);

  // Extract unique localities from current routes for the dropdown
  const localities = useMemo(() => {
    const set = new Set<string>();
    routes.forEach((r) => r.stops.forEach((s) => {
      if (s.customer.locality) set.add(s.customer.locality);
    }));
    return Array.from(set).sort();
  }, [routes]);

  // Stats based on filtered routes
  const totalVisited = filteredRoutes.reduce(
    (sum, r) => sum + r.stops.filter((s) => s.status === "visitado").length,
    0
  );
  const totalStops = filteredRoutes.reduce((sum, r) => sum + r.stops.length, 0);

  const clearFilters = () => {
    setTimePeriod("all");
    setCustomFrom("");
    setCustomTo("");
    setStatusFilter("");
    setVendedorFilter("");
    setLocalityFilter("");
    setSearchText("");
  };

  const hasActiveFilters = timePeriod !== "all" || statusFilter || vendedorFilter || localityFilter || searchText;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-black">Rutas de Visita</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? "border-amber-500 text-amber-600" : ""}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 rounded-full bg-amber-500" />
            )}
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Link href="/dashboard/visitas/planificar">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white">
              <PlusCircle className="w-4 h-4" />
              Planificar Visita
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Time period presets */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                Período
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TIME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setTimePeriod(preset.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      timePeriod === preset.id
                        ? "bg-amber-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {timePeriod === "custom" && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-black"
                  />
                  <span className="text-gray-400">a</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-black"
                  />
                </div>
              )}
            </div>

            {/* Second row: status, vendedor, locality, search */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Estado</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
                >
                  <option value="">Todos los estados</option>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                  <Users className="w-3.5 h-3.5 inline mr-1" />
                  Vendedor
                </label>
                <select
                  value={vendedorFilter}
                  onChange={(e) => setVendedorFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
                >
                  <option value="">Todos los vendedores</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />
                  Localidad
                </label>
                <select
                  value={localityFilter}
                  onChange={(e) => setLocalityFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
                >
                  <option value="">Todas las localidades</option>
                  {localities.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                  <Search className="w-3.5 h-3.5 inline mr-1" />
                  Buscar
                </label>
                <input
                  type="text"
                  placeholder="Ruta, vendedor, cliente..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {filteredRoutes.length} ruta{filteredRoutes.length !== 1 ? "s" : ""} encontrada{filteredRoutes.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
                    Limpiar filtros
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={fetchRoutes}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Rutas</p>
            <p className="text-2xl font-bold text-black">{filteredRoutes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">En Curso</p>
            <p className="text-2xl font-bold text-amber-600">
              {filteredRoutes.filter((r) => r.status === "en_curso").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Completadas</p>
            <p className="text-2xl font-bold text-green-600">
              {filteredRoutes.filter((r) => r.status === "completada").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Clientes Visitados</p>
            <p className="text-2xl font-bold text-black">
              {totalVisited}/{totalStops}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Routes List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        </div>
      ) : filteredRoutes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-black">
              {hasActiveFilters
                ? "No hay rutas que coincidan con los filtros"
                : "No hay rutas de visita"}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" className="mt-3" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : (
              <Link href="/dashboard/visitas/planificar">
                <Button variant="outline" className="mt-3">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Planificar Primera Visita
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRoutes.map((route) => {
            const visited = route.stops.filter((s) => s.status === "visitado").length;
            const total = route.stops.length;
            const progress = total > 0 ? (visited / total) * 100 : 0;
            const cfg = STATUS_CONFIG[route.status] || STATUS_CONFIG.planificada;
            const Icon = cfg.icon;
            const routeLocalities = [...new Set(route.stops.map((s) => s.customer.locality))];

            return (
              <Card key={route.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-black">{route.route_code}</p>
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", cfg.color)}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-black">
                          Vendedor: <span className="font-medium">{route.vendedor.name}</span>
                        </p>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                          <span>{new Date(route.scheduled_date).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                          <span>·</span>
                          <span>{total} paradas</span>
                          {routeLocalities.length > 0 && (
                            <>
                              <span>·</span>
                              <span className="truncate max-w-[200px]">{routeLocalities.join(", ")}</span>
                            </>
                          )}
                          {route.total_distance_km && (
                            <>
                              <span>·</span>
                              <span>{Number(route.total_distance_km).toFixed(1)} km</span>
                            </>
                          )}
                          {route.estimated_duration && (
                            <>
                              <span>·</span>
                              <span>{route.estimated_duration} min</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {/* Progress */}
                      <div className="text-right hidden sm:block">
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
                        <div className="text-center hidden md:block">
                          <p className="text-xs text-gray-500">Verificados</p>
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
