"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Truck,
  MessageSquare,
  Loader2,
  FileDown,
  Filter,
  BarChart3,
  Table2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { exportTableToPDF } from "@/components/analytics/pdf-export";

// ─── Types ──────────────────────────────────────────────────────────

interface AnalyticsData {
  overview: {
    totalSales: number;
    totalOrders: number;
    avgOrderValue: number;
    period: string;
  };
  salesByDay: { date: string; total: number; count: number }[];
  ordersByStatus: { status: string; count: number }[];
  topCustomers: { name: string; total: number; orders: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  routeEfficiency: {
    totalRoutes: number;
    totalDistance: number;
    totalCost: number;
    avgStopsPerRoute: number;
  };
}

interface ReportData {
  customerReport: { name: string; locality: string; total: number; orders: number; avgTicket: number }[];
  productReport: { name: string; code: string; quantity: number; revenue: number; avgPrice: number }[];
  documentReport: { type: string; total: number; emitidos: number; anulados: number; borradores: number }[];
  routeReport: {
    routeCode: string; driver: string; status: string; date: string;
    stops: number; delivered: number; notDelivered: number; pending: number;
    successRate: number; distanceKm: number; cost: number;
  }[];
  summary: {
    totalOrders: number; totalSales: number; totalDeliveries: number;
    deliveryRate: number; totalDocuments: number; totalRoutes: number;
  };
  filters: { localities: string[]; customers: string[] };
}

const STATUS_COLORS: Record<string, string> = {
  pendiente: "#eab308",
  confirmado: "#3b82f6",
  documentado: "#8b5cf6",
  en_ruta: "#f59e0b",
  entregado: "#22c55e",
  cancelado: "#ef4444",
};

const PIE_COLORS = ["#eab308", "#3b82f6", "#8b5cf6", "#f59e0b", "#22c55e", "#ef4444"];

const REPORT_TABS = [
  { id: "clientes", label: "Ventas por Cliente" },
  { id: "productos", label: "Productos" },
  { id: "entregas", label: "Entregas" },
  { id: "documentos", label: "Documentos" },
] as const;

type ReportTab = (typeof REPORT_TABS)[number]["id"];

// ─── Component ──────────────────────────────────────────────────────

export default function AnalyticsPage() {
  // Main tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "reportes">("dashboard");

  // Dashboard state
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  // Reports state
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportTab, setReportTab] = useState<ReportTab>("clientes");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterLocality, setFilterLocality] = useState("");

  // Fetch dashboard data
  useEffect(() => {
    if (activeTab !== "dashboard") return;
    setLoading(true);
    fetch(`/api/analytics?period=${period}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period, activeTab]);

  // Fetch report data
  const fetchReports = () => {
    setReportLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    fetch(`/api/analytics/reports?${params}`)
      .then((r) => r.json())
      .then((d) => { setReportData(d); setReportLoading(false); })
      .catch(() => setReportLoading(false));
  };

  useEffect(() => {
    if (activeTab === "reportes" && !reportData) fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Filtered customer report
  const filteredCustomers = useMemo(() => {
    if (!reportData) return [];
    return reportData.customerReport.filter((c) => {
      if (filterCustomer && c.name !== filterCustomer) return false;
      if (filterLocality && c.locality !== filterLocality) return false;
      return true;
    });
  }, [reportData, filterCustomer, filterLocality]);

  // ─── PDF Export handlers ──────────────────────────────────────────

  const activeFilters = {
    ...(dateFrom ? { Desde: dateFrom } : {}),
    ...(dateTo ? { Hasta: dateTo } : {}),
    ...(filterCustomer ? { Cliente: filterCustomer } : {}),
    ...(filterLocality ? { Localidad: filterLocality } : {}),
  };

  const exportCustomers = () => {
    const totalVentas = filteredCustomers.reduce((s, c) => s + c.total, 0);
    const totalPedidos = filteredCustomers.reduce((s, c) => s + c.orders, 0);
    exportTableToPDF({
      title: "Reporte de Ventas por Cliente",
      columns: ["Cliente", "Localidad", "Pedidos", "Total", "Ticket Prom."],
      rows: [
        ...filteredCustomers.map((c) => [
          c.name, c.locality, c.orders,
          `$${c.total.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
          `$${c.avgTicket.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
        ]),
        ["TOTAL", "", totalPedidos, `$${totalVentas.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`, ""],
      ],
      filters: activeFilters,
      filename: "ventas-por-cliente.pdf",
    });
  };

  const exportProducts = () => {
    if (!reportData) return;
    const totalRev = reportData.productReport.reduce((s, p) => s + p.revenue, 0);
    exportTableToPDF({
      title: "Reporte de Productos",
      columns: ["Producto", "Código", "Cantidad", "Ingresos", "Precio Prom."],
      rows: [
        ...reportData.productReport.map((p) => [
          p.name, p.code, p.quantity.toFixed(1),
          `$${p.revenue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
          `$${p.avgPrice.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
        ]),
        ["TOTAL", "", "", `$${totalRev.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`, ""],
      ],
      filters: activeFilters,
      filename: "reporte-productos.pdf",
    });
  };

  const exportRoutes = () => {
    if (!reportData) return;
    exportTableToPDF({
      title: "Reporte de Entregas",
      columns: ["Ruta", "Fecha", "Chofer", "Estado", "Paradas", "Entregados", "No Entreg.", "Tasa", "Dist (km)", "Costo"],
      rows: reportData.routeReport.map((r) => [
        r.routeCode, r.date, r.driver, r.status,
        r.stops, r.delivered, r.notDelivered,
        `${r.successRate.toFixed(0)}%`,
        r.distanceKm.toFixed(1),
        `$${r.cost.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
      ]),
      filters: activeFilters,
      filename: "reporte-entregas.pdf",
    });
  };

  const exportDocuments = () => {
    if (!reportData) return;
    exportTableToPDF({
      title: "Reporte de Documentos",
      columns: ["Tipo", "Total", "Emitidos", "Anulados", "Borradores"],
      rows: reportData.documentReport.map((d) => [
        d.type.charAt(0).toUpperCase() + d.type.slice(1).replace("_", " "),
        d.total, d.emitidos, d.anulados, d.borradores,
      ]),
      filters: activeFilters,
      filename: "reporte-documentos.pdf",
      orientation: "portrait",
    });
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">Analytics</h1>
        <Link href="/dashboard/analytics/chat">
          <Button variant="outline">
            <MessageSquare className="w-4 h-4" />
            Chat IA
          </Button>
        </Link>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "dashboard"
              ? "border-amber-600 text-amber-600"
              : "border-transparent text-black hover:text-amber-600"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("reportes")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "reportes"
              ? "border-amber-600 text-amber-600"
              : "border-transparent text-black hover:text-amber-600"
          }`}
        >
          <Table2 className="w-4 h-4" />
          Reportes
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* DASHBOARD TAB                                                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "dashboard" && (
        <>
          {loading || !data ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
          ) : (
            <>
              {/* Period Selector */}
              <div className="flex justify-end">
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  {(["week", "month", "year"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-3 py-1.5 text-sm ${
                        period === p
                          ? "bg-amber-600 text-white"
                          : "bg-white text-black hover:bg-gray-50"
                      }`}
                    >
                      {p === "week" ? "Semana" : p === "month" ? "Mes" : "Año"}
                    </button>
                  ))}
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          ${data.overview.totalSales.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-black">Ventas Totales</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{data.overview.totalOrders}</p>
                        <p className="text-xs text-black">Pedidos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          ${data.overview.avgOrderValue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-black">Ticket Promedio</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{data.routeEfficiency.totalRoutes}</p>
                        <p className="text-xs text-black">Rutas Completadas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Ventas por Día</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.salesByDay.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.salesByDay}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(d) =>
                              new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
                            }
                            fontSize={12}
                          />
                          <YAxis fontSize={12} />
                          <Tooltip
                            formatter={(value) => [`$${Number(value).toLocaleString("es-AR")}`, "Ventas"]}
                            labelFormatter={(d) => new Date(d).toLocaleDateString("es-AR")}
                          />
                          <Line type="monotone" dataKey="total" stroke="#d97706" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-black text-sm text-center py-10">Sin datos para el período seleccionado</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Pedidos por Estado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.ordersByStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={data.ordersByStatus}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="count"
                            nameKey="status"
                          >
                            {data.ordersByStatus.map((entry, index) => (
                              <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-black text-sm text-center py-10">Sin datos</p>
                    )}
                    <div className="flex flex-wrap gap-2 justify-center mt-2">
                      {data.ordersByStatus.map((s, i) => (
                        <span key={s.status} className="flex items-center gap-1 text-xs">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: STATUS_COLORS[s.status] || PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          {s.status} ({s.count})
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top Clientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.topCustomers.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.topCustomers} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" fontSize={12} />
                          <YAxis dataKey="name" type="category" width={120} fontSize={11} tickFormatter={(v) => (v.length > 15 ? v.slice(0, 15) + "..." : v)} />
                          <Tooltip formatter={(value) => [`$${Number(value).toLocaleString("es-AR")}`, "Total"]} />
                          <Bar dataKey="total" fill="#d97706" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-black text-sm text-center py-10">Sin datos</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top Productos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.topProducts.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.topProducts} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" fontSize={12} />
                          <YAxis dataKey="name" type="category" width={120} fontSize={11} tickFormatter={(v) => (v.length > 15 ? v.slice(0, 15) + "..." : v)} />
                          <Tooltip formatter={(value) => [`$${Number(value).toLocaleString("es-AR")}`, "Revenue"]} />
                          <Bar dataKey="revenue" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-black text-sm text-center py-10">Sin datos</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Route Efficiency */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Eficiencia de Rutas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-600">{data.routeEfficiency.totalRoutes}</p>
                      <p className="text-xs text-black">Rutas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-600">{data.routeEfficiency.totalDistance.toFixed(1)} km</p>
                      <p className="text-xs text-black">Distancia Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-600">
                        ${data.routeEfficiency.totalCost.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-black">Costo Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-600">{data.routeEfficiency.avgStopsPerRoute.toFixed(1)}</p>
                      <p className="text-xs text-black">Paradas/Ruta Prom.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* REPORTES TAB                                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "reportes" && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Desde</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="border rounded-lg px-3 py-1.5 text-sm text-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Hasta</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="border rounded-lg px-3 py-1.5 text-sm text-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Cliente</label>
                  <select
                    value={filterCustomer}
                    onChange={(e) => setFilterCustomer(e.target.value)}
                    className="border rounded-lg px-3 py-1.5 text-sm text-black min-w-[180px]"
                  >
                    <option value="">Todos</option>
                    {reportData?.filters.customers.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Localidad</label>
                  <select
                    value={filterLocality}
                    onChange={(e) => setFilterLocality(e.target.value)}
                    className="border rounded-lg px-3 py-1.5 text-sm text-black min-w-[150px]"
                  >
                    <option value="">Todas</option>
                    {reportData?.filters.localities.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={fetchReports} className="bg-amber-600 hover:bg-amber-700 text-white">
                  <Filter className="w-4 h-4 mr-1" />
                  Filtrar
                </Button>
                {(dateFrom || dateTo || filterCustomer || filterLocality) && (
                  <button
                    onClick={() => { setDateFrom(""); setDateTo(""); setFilterCustomer(""); setFilterLocality(""); }}
                    className="text-sm text-amber-600 hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {reportLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
          ) : reportData ? (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{reportData.summary.totalOrders}</p>
                    <p className="text-xs text-black">Pedidos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      ${reportData.summary.totalSales.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-black">Ventas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{reportData.summary.totalRoutes}</p>
                    <p className="text-xs text-black">Rutas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{reportData.summary.deliveryRate.toFixed(0)}%</p>
                    <p className="text-xs text-black">Tasa de Entrega</p>
                  </CardContent>
                </Card>
              </div>

              {/* Report Sub-Tabs */}
              <div className="flex border-b border-gray-200 overflow-x-auto">
                {REPORT_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setReportTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                      reportTab === tab.id
                        ? "border-amber-600 text-amber-600"
                        : "border-transparent text-black hover:text-amber-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── Clientes Table ── */}
              {reportTab === "clientes" && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Ventas por Cliente</CardTitle>
                    <Button variant="outline" size="sm" onClick={exportCustomers}>
                      <FileDown className="w-4 h-4 mr-1" />
                      Exportar PDF
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-3 font-medium text-black">Cliente</th>
                            <th className="text-left p-3 font-medium text-black">Localidad</th>
                            <th className="text-right p-3 font-medium text-black">Pedidos</th>
                            <th className="text-right p-3 font-medium text-black">Total</th>
                            <th className="text-right p-3 font-medium text-black">Ticket Prom.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCustomers.map((c) => (
                            <tr key={c.name} className="border-b hover:bg-amber-50">
                              <td className="p-3 text-black">{c.name}</td>
                              <td className="p-3 text-black">{c.locality}</td>
                              <td className="p-3 text-right text-black">{c.orders}</td>
                              <td className="p-3 text-right font-medium text-black">
                                ${c.total.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                              </td>
                              <td className="p-3 text-right text-black">
                                ${c.avgTicket.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          ))}
                          {filteredCustomers.length === 0 && (
                            <tr><td colSpan={5} className="p-6 text-center text-black">Sin datos</td></tr>
                          )}
                        </tbody>
                        {filteredCustomers.length > 0 && (
                          <tfoot>
                            <tr className="bg-amber-50 font-bold">
                              <td className="p-3 text-black">TOTAL</td>
                              <td className="p-3"></td>
                              <td className="p-3 text-right text-black">
                                {filteredCustomers.reduce((s, c) => s + c.orders, 0)}
                              </td>
                              <td className="p-3 text-right text-black">
                                ${filteredCustomers.reduce((s, c) => s + c.total, 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                              </td>
                              <td className="p-3"></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ── Productos Table ── */}
              {reportTab === "productos" && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Productos</CardTitle>
                    <Button variant="outline" size="sm" onClick={exportProducts}>
                      <FileDown className="w-4 h-4 mr-1" />
                      Exportar PDF
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-3 font-medium text-black">Producto</th>
                            <th className="text-left p-3 font-medium text-black">Código</th>
                            <th className="text-right p-3 font-medium text-black">Cantidad</th>
                            <th className="text-right p-3 font-medium text-black">Ingresos</th>
                            <th className="text-right p-3 font-medium text-black">Precio Prom.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.productReport.map((p) => (
                            <tr key={p.code} className="border-b hover:bg-amber-50">
                              <td className="p-3 text-black">{p.name}</td>
                              <td className="p-3 text-black">{p.code}</td>
                              <td className="p-3 text-right text-black">{p.quantity.toFixed(1)}</td>
                              <td className="p-3 text-right font-medium text-black">
                                ${p.revenue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                              </td>
                              <td className="p-3 text-right text-black">
                                ${p.avgPrice.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          ))}
                          {reportData.productReport.length === 0 && (
                            <tr><td colSpan={5} className="p-6 text-center text-black">Sin datos</td></tr>
                          )}
                        </tbody>
                        {reportData.productReport.length > 0 && (
                          <tfoot>
                            <tr className="bg-amber-50 font-bold">
                              <td className="p-3 text-black">TOTAL</td>
                              <td className="p-3"></td>
                              <td className="p-3"></td>
                              <td className="p-3 text-right text-black">
                                ${reportData.productReport.reduce((s, p) => s + p.revenue, 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                              </td>
                              <td className="p-3"></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ── Entregas Table ── */}
              {reportTab === "entregas" && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Entregas por Ruta</CardTitle>
                    <Button variant="outline" size="sm" onClick={exportRoutes}>
                      <FileDown className="w-4 h-4 mr-1" />
                      Exportar PDF
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-3 font-medium text-black">Ruta</th>
                            <th className="text-left p-3 font-medium text-black">Fecha</th>
                            <th className="text-left p-3 font-medium text-black">Chofer</th>
                            <th className="text-left p-3 font-medium text-black">Estado</th>
                            <th className="text-right p-3 font-medium text-black">Paradas</th>
                            <th className="text-right p-3 font-medium text-black">Entreg.</th>
                            <th className="text-right p-3 font-medium text-black">No Entreg.</th>
                            <th className="text-right p-3 font-medium text-black">Tasa</th>
                            <th className="text-right p-3 font-medium text-black">Dist (km)</th>
                            <th className="text-right p-3 font-medium text-black">Costo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.routeReport.map((r) => (
                            <tr key={r.routeCode} className="border-b hover:bg-amber-50">
                              <td className="p-3 font-medium text-black">{r.routeCode}</td>
                              <td className="p-3 text-black">{r.date}</td>
                              <td className="p-3 text-black">{r.driver}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  r.status === "completada" ? "bg-green-100 text-green-700" :
                                  r.status === "en_curso" ? "bg-blue-100 text-blue-700" :
                                  r.status === "cancelada" ? "bg-red-100 text-red-700" :
                                  "bg-yellow-100 text-yellow-700"
                                }`}>
                                  {r.status}
                                </span>
                              </td>
                              <td className="p-3 text-right text-black">{r.stops}</td>
                              <td className="p-3 text-right text-green-600 font-medium">{r.delivered}</td>
                              <td className="p-3 text-right text-red-600 font-medium">{r.notDelivered}</td>
                              <td className="p-3 text-right text-black">{r.successRate.toFixed(0)}%</td>
                              <td className="p-3 text-right text-black">{r.distanceKm.toFixed(1)}</td>
                              <td className="p-3 text-right text-black">
                                ${r.cost.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          ))}
                          {reportData.routeReport.length === 0 && (
                            <tr><td colSpan={10} className="p-6 text-center text-black">Sin datos</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ── Documentos Table ── */}
              {reportTab === "documentos" && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Documentos</CardTitle>
                    <Button variant="outline" size="sm" onClick={exportDocuments}>
                      <FileDown className="w-4 h-4 mr-1" />
                      Exportar PDF
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-3 font-medium text-black">Tipo</th>
                            <th className="text-right p-3 font-medium text-black">Total</th>
                            <th className="text-right p-3 font-medium text-black">Emitidos</th>
                            <th className="text-right p-3 font-medium text-black">Anulados</th>
                            <th className="text-right p-3 font-medium text-black">Borradores</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.documentReport.map((d) => (
                            <tr key={d.type} className="border-b hover:bg-amber-50">
                              <td className="p-3 font-medium text-black capitalize">
                                {d.type.replace("_", " ")}
                              </td>
                              <td className="p-3 text-right text-black">{d.total}</td>
                              <td className="p-3 text-right text-green-600 font-medium">{d.emitidos}</td>
                              <td className="p-3 text-right text-red-600 font-medium">{d.anulados}</td>
                              <td className="p-3 text-right text-black">{d.borradores}</td>
                            </tr>
                          ))}
                          {reportData.documentReport.length === 0 && (
                            <tr><td colSpan={5} className="p-6 text-center text-black">Sin datos</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-black">Error al cargar reportes. Intente nuevamente.</div>
          )}
        </>
      )}
    </div>
  );
}
