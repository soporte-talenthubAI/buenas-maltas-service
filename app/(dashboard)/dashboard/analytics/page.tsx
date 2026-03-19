"use client";

import { useState, useEffect } from "react";
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

const STATUS_COLORS: Record<string, string> = {
  pendiente: "#eab308",
  confirmado: "#3b82f6",
  documentado: "#8b5cf6",
  en_ruta: "#f59e0b",
  entregado: "#22c55e",
  cancelado: "#ef4444",
};

const PIE_COLORS = ["#eab308", "#3b82f6", "#8b5cf6", "#f59e0b", "#22c55e", "#ef4444"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [period]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(["week", "month", "year"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm ${
                  period === p
                    ? "bg-amber-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {p === "week" ? "Semana" : p === "month" ? "Mes" : "Año"}
              </button>
            ))}
          </div>
          <Link href="/dashboard/analytics/chat">
            <Button variant="outline">
              <MessageSquare className="w-4 h-4" />
              Chat IA
            </Button>
          </Link>
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
                <p className="text-xs text-gray-800">Ventas Totales</p>
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
                <p className="text-xs text-gray-800">Pedidos</p>
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
                <p className="text-xs text-gray-800">Ticket Promedio</p>
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
                <p className="text-xs text-gray-800">Rutas Completadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales over time */}
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
                      new Date(d).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    }
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip
                    formatter={(value) => [
                      `$${Number(value).toLocaleString("es-AR")}`,
                      "Ventas",
                    ]}
                    labelFormatter={(d) =>
                      new Date(d).toLocaleDateString("es-AR")
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#d97706"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-700 text-sm text-center py-10">
                Sin datos para el período seleccionado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Orders by status */}
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
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] || PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-700 text-sm text-center py-10">Sin datos</p>
            )}
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {data.ordersByStatus.map((s, i) => (
                <span key={s.status} className="flex items-center gap-1 text-xs">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        STATUS_COLORS[s.status] || PIE_COLORS[i % PIE_COLORS.length],
                    }}
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
        {/* Top Customers */}
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
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    fontSize={11}
                    tickFormatter={(v) => (v.length > 15 ? v.slice(0, 15) + "..." : v)}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `$${Number(value).toLocaleString("es-AR")}`,
                      "Total",
                    ]}
                  />
                  <Bar dataKey="total" fill="#d97706" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-700 text-sm text-center py-10">Sin datos</p>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
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
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    fontSize={11}
                    tickFormatter={(v) => (v.length > 15 ? v.slice(0, 15) + "..." : v)}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `$${Number(value).toLocaleString("es-AR")}`,
                      "Revenue",
                    ]}
                  />
                  <Bar dataKey="revenue" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-700 text-sm text-center py-10">Sin datos</p>
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
              <p className="text-2xl font-bold text-amber-600">
                {data.routeEfficiency.totalRoutes}
              </p>
              <p className="text-xs text-gray-800">Rutas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">
                {data.routeEfficiency.totalDistance.toFixed(1)} km
              </p>
              <p className="text-xs text-gray-800">Distancia Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">
                ${data.routeEfficiency.totalCost.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-800">Costo Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">
                {data.routeEfficiency.avgStopsPerRoute.toFixed(1)}
              </p>
              <p className="text-xs text-gray-800">Paradas/Ruta Prom.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
