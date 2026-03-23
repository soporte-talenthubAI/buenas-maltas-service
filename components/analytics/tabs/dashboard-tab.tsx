"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Truck,
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
import { Loading } from "@/components/analytics/shared/loading";

interface AnalyticsData {
  overview: { totalSales: number; totalOrders: number; avgOrderValue: number; period: string };
  salesByDay: { date: string; total: number; count: number }[];
  ordersByStatus: { status: string; count: number }[];
  topCustomers: { name: string; total: number; orders: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  routeEfficiency: { totalRoutes: number; totalDistance: number; totalCost: number; avgStopsPerRoute: number };
}

const STATUS_COLORS: Record<string, string> = {
  pendiente: "#eab308", confirmado: "#3b82f6", documentado: "#8b5cf6",
  en_ruta: "#f59e0b", entregado: "#22c55e", cancelado: "#ef4444",
};

const PIE_COLORS = ["#22c55e", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#eab308"];

const fmt = (n: number) => `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;

function KPICard({ icon: Icon, color, value, label }: { icon: typeof DollarSign; color: string; value: string; label: string }) {
  const colorMap: Record<string, string> = {
    green: "bg-green-100 text-green-600", blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-600", purple: "bg-purple-100 text-purple-600",
    red: "bg-red-100 text-red-600",
  };
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.amber}`}><Icon className="w-5 h-5" /></div>
        <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-black">{label}</p></div>
      </div>
    </CardContent></Card>
  );
}

export function DashboardTab({ origin = "all" }: { origin?: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (origin !== "all") params.set("origin", origin);
    fetch(`/api/analytics?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period, origin]);

  if (loading || !data) return <Loading />;

  return (
    <>
      <div className="flex justify-end">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(["week", "month", "year"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-sm ${period === p ? "bg-amber-600 text-white" : "bg-white text-black hover:bg-gray-50"}`}>
              {p === "week" ? "Semana" : p === "month" ? "Mes" : "Año"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={DollarSign} color="green" value={fmt(data.overview.totalSales)} label="Ventas Totales" />
        <KPICard icon={ShoppingCart} color="blue" value={String(data.overview.totalOrders)} label="Pedidos" />
        <KPICard icon={TrendingUp} color="amber" value={fmt(data.overview.avgOrderValue)} label="Ticket Promedio" />
        <KPICard icon={Truck} color="purple" value={String(data.routeEfficiency.totalRoutes)} label="Rutas Completadas" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Ventas por Día</CardTitle></CardHeader>
          <CardContent>
            {data.salesByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })} fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value) => [fmt(Number(value)), "Ventas"]} labelFormatter={(d) => new Date(d).toLocaleDateString("es-AR")} />
                  <Line type="monotone" dataKey="total" stroke="#d97706" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-black text-sm text-center py-10">Sin datos</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Pedidos por Estado</CardTitle></CardHeader>
          <CardContent>
            {data.ordersByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart><Pie data={data.ordersByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="count" nameKey="status">
                  {data.ordersByStatus.map((entry, i) => <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            ) : <p className="text-black text-sm text-center py-10">Sin datos</p>}
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {data.ordersByStatus.map((s, i) => (
                <span key={s.status} className="flex items-center gap-1 text-xs">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] || PIE_COLORS[i % PIE_COLORS.length] }} />{s.status} ({s.count})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Top Clientes</CardTitle></CardHeader>
          <CardContent>
            {data.topCustomers.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.topCustomers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={120} fontSize={11} tickFormatter={(v) => v.length > 15 ? v.slice(0, 15) + "..." : v} />
                  <Tooltip formatter={(value) => [fmt(Number(value)), "Total"]} /><Bar dataKey="total" fill="#d97706" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-black text-sm text-center py-10">Sin datos</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top Productos</CardTitle></CardHeader>
          <CardContent>
            {data.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={120} fontSize={11} tickFormatter={(v) => v.length > 15 ? v.slice(0, 15) + "..." : v} />
                  <Tooltip formatter={(value) => [fmt(Number(value)), "Revenue"]} /><Bar dataKey="revenue" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-black text-sm text-center py-10">Sin datos</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
