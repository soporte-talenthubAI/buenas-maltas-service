"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Truck,
  Filter,
  MapPin,
  Users,
  Target,
  Receipt,
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
} from "recharts";
import { Loading } from "@/components/analytics/shared/loading";

interface LogisticsData {
  delivery: {
    totalRoutes: number; completedRoutes: number; totalStops: number;
    delivered: number; notDelivered: number; deliveryRate: number;
    totalDistanceKm: number; totalCost: number; avgStopsPerRoute: number;
    byStatus: { status: string; count: number }[];
  };
  visits: {
    totalRoutes: number; completedRoutes: number; totalStops: number;
    visited: number; notVisited: number; visitRate: number;
    geoVerified: number; geoVerificationRate: number;
  };
  driverPerformance: {
    name: string; routes: number; stops: number; delivered: number;
    notDelivered: number; distance: number; cost: number; deliveryRate: number;
  }[];
}

interface SalesData {
  overview: { totalSales: number; totalOrders: number; avgTicket: number };
  customers: {
    total: number; active: number; potential: number;
    visitedPotentials: number; convertedCustomers: number; conversionRate: number;
  };
  vendedorPerformance: {
    name: string; visitRoutes: number; totalVisits: number; visitedCount: number;
    customersConverted: number; ordersCreated: number; salesTotal: number; conversionRate: number;
  }[];
  incomeStatement: {
    facturacion: number; subtotal: number; descuentos: number;
    costoLogistica: number; costoCombustible: number; costoChoferes: number;
    margenBruto: number; nota: string;
  };
  salesByLocality: { locality: string; orders: number; total: number }[];
  salesByPaymentMethod: { method: string; count: number; total: number }[];
}

const PIE_COLORS = ["#22c55e", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#eab308"];
const fmt = (n: number) => `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
const pct = (n: number) => `${n.toFixed(1)}%`;

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

function DateFilter({ from, to, setFrom, setTo, onFilter }: { from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void; onFilter: () => void }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div><label className="block text-xs font-medium text-black mb-1">Desde</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm text-black" /></div>
        <div><label className="block text-xs font-medium text-black mb-1">Hasta</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm text-black" /></div>
        <Button onClick={onFilter} className="bg-amber-600 hover:bg-amber-700 text-white"><Filter className="w-4 h-4 mr-1" /> Filtrar</Button>
        {(from || to) && <button onClick={() => { setFrom(""); setTo(""); }} className="text-sm text-amber-600 hover:underline">Limpiar</button>}
      </div>
    </CardContent></Card>
  );
}

function IncomeRow({ label, value, type }: { label: string; value: number; type: "income" | "expense" | "subtotal" | "total" | "detail" }) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${type === "total" ? "text-lg font-bold" : type === "subtotal" ? "font-semibold" : type === "detail" ? "text-xs text-gray-500" : ""}`}>
      <span className="text-black">{label}</span>
      <span className={type === "expense" ? "text-red-600" : type === "total" ? (value >= 0 ? "text-green-600" : "text-red-600") : type === "income" ? "text-green-600" : type === "detail" ? "text-gray-500" : "text-black"}>
        {type === "expense" ? "-" : ""}{fmt(Math.abs(value))}
      </span>
    </div>
  );
}

export function LogisticaTab() {
  const [logData, setLogData] = useState<LogisticsData | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [logDateFrom, setLogDateFrom] = useState("");
  const [logDateTo, setLogDateTo] = useState("");

  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesDateFrom, setSalesDateFrom] = useState("");
  const [salesDateTo, setSalesDateTo] = useState("");

  const [subTab, setSubTab] = useState<"logistica" | "ventas">("logistica");

  const fetchLogistics = () => {
    setLogLoading(true);
    const params = new URLSearchParams();
    if (logDateFrom) params.set("dateFrom", logDateFrom);
    if (logDateTo) params.set("dateTo", logDateTo);
    fetch(`/api/analytics/logistics?${params}`)
      .then((r) => r.json())
      .then((d) => { setLogData(d); setLogLoading(false); })
      .catch(() => setLogLoading(false));
  };

  const fetchSales = () => {
    setSalesLoading(true);
    const params = new URLSearchParams();
    if (salesDateFrom) params.set("dateFrom", salesDateFrom);
    if (salesDateTo) params.set("dateTo", salesDateTo);
    fetch(`/api/analytics/sales?${params}`)
      .then((r) => r.json())
      .then((d) => { setSalesData(d); setSalesLoading(false); })
      .catch(() => setSalesLoading(false));
  };

  useEffect(() => {
    if (subTab === "logistica" && !logData) fetchLogistics();
    if (subTab === "ventas" && !salesData) fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab]);

  return (
    <>
      <div className="flex border-b border-gray-200 mb-4">
        {(["logistica", "ventas"] as const).map((t) => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === t ? "border-amber-600 text-amber-600" : "border-transparent text-black hover:text-amber-600"}`}>
            {t === "logistica" ? "Logística" : "Ventas"}
          </button>
        ))}
      </div>

      {subTab === "logistica" && (
        <>
          <DateFilter from={logDateFrom} to={logDateTo} setFrom={setLogDateFrom} setTo={setLogDateTo} onFilter={fetchLogistics} />
          {logLoading || !logData ? <Loading /> : (
            <>
              <h2 className="text-lg font-semibold text-black">Entregas</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KPICard icon={Truck} color="blue" value={String(logData.delivery.totalRoutes)} label="Rutas Totales" />
                <KPICard icon={MapPin} color="green" value={String(logData.delivery.delivered)} label="Entregados" />
                <KPICard icon={Target} color="amber" value={pct(logData.delivery.deliveryRate)} label="Tasa Entrega" />
                <KPICard icon={TrendingUp} color="purple" value={`${logData.delivery.totalDistanceKm.toFixed(0)} km`} label="Distancia Total" />
                <KPICard icon={DollarSign} color="red" value={fmt(logData.delivery.totalCost)} label="Costo Logístico" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Rutas por Estado</CardTitle></CardHeader>
                  <CardContent>
                    {logData.delivery.byStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart><Pie data={logData.delivery.byStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="count" nameKey="status">
                          {logData.delivery.byStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie><Tooltip /></PieChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-black text-center py-10">Sin datos</p>}
                    <div className="flex flex-wrap gap-2 justify-center">
                      {logData.delivery.byStatus.map((s, i) => (
                        <span key={s.status} className="flex items-center gap-1 text-xs">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />{s.status} ({s.count})
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Rendimiento por Chofer</CardTitle></CardHeader>
                  <CardContent>
                    {logData.driverPerformance.length > 0 ? (
                      <div className="space-y-3">
                        {logData.driverPerformance.map((d) => (
                          <div key={d.name} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium text-black">{d.name}</p>
                              <p className="text-xs text-black">{d.routes} rutas · {d.stops} paradas · {d.distance.toFixed(0)} km</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">{pct(d.deliveryRate)}</p>
                              <p className="text-xs text-black">{d.delivered}/{d.stops} entregados</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-black text-center py-10">Sin datos</p>}
                  </CardContent>
                </Card>
              </div>

              <h2 className="text-lg font-semibold text-black mt-4">Visitas de Vendedores</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard icon={MapPin} color="amber" value={String(logData.visits.totalRoutes)} label="Rutas de Visita" />
                <KPICard icon={Users} color="green" value={String(logData.visits.visited)} label="Clientes Visitados" />
                <KPICard icon={Target} color="blue" value={pct(logData.visits.visitRate)} label="Tasa de Visita" />
                <KPICard icon={MapPin} color="purple" value={pct(logData.visits.geoVerificationRate)} label="Verificación GPS" />
              </div>
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div><p className="text-2xl font-bold text-green-600">{logData.visits.geoVerified}</p><p className="text-xs text-black">Verificados ({"<"}200m)</p></div>
                    <div><p className="text-2xl font-bold text-amber-600">{logData.visits.visited - logData.visits.geoVerified}</p><p className="text-xs text-black">Sin verificar GPS</p></div>
                    <div><p className="text-2xl font-bold text-red-600">{logData.visits.notVisited}</p><p className="text-xs text-black">No Visitados</p></div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {subTab === "ventas" && (
        <>
          <DateFilter from={salesDateFrom} to={salesDateTo} setFrom={setSalesDateFrom} setTo={setSalesDateTo} onFilter={fetchSales} />
          {salesLoading || !salesData ? <Loading /> : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard icon={DollarSign} color="green" value={fmt(salesData.overview.totalSales)} label="Facturación" />
                <KPICard icon={ShoppingCart} color="blue" value={String(salesData.overview.totalOrders)} label="Pedidos" />
                <KPICard icon={TrendingUp} color="amber" value={fmt(salesData.overview.avgTicket)} label="Ticket Promedio" />
                <KPICard icon={Target} color="purple" value={pct(salesData.customers.conversionRate)} label="Tasa Conversión" />
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-5 h-5" /> Embudo de Clientes</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-2xl font-bold text-black">{salesData.customers.total}</p><p className="text-xs text-black">Total Clientes</p></div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg"><p className="text-2xl font-bold text-orange-600">{salesData.customers.potential}</p><p className="text-xs text-black">Potenciales</p></div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg"><p className="text-2xl font-bold text-blue-600">{salesData.customers.visitedPotentials}</p><p className="text-xs text-black">Potenciales Visitados</p></div>
                    <div className="text-center p-3 bg-green-50 rounded-lg"><p className="text-2xl font-bold text-green-600">{salesData.customers.convertedCustomers}</p><p className="text-xs text-black">Convertidos</p></div>
                    <div className="text-center p-3 bg-amber-50 rounded-lg"><p className="text-2xl font-bold text-amber-600">{salesData.customers.active}</p><p className="text-xs text-black">Clientes Activos</p></div>
                  </div>
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium">Tasa de Conversión: {pct(salesData.customers.conversionRate)}</p>
                    <p className="text-xs text-amber-700">De {salesData.customers.visitedPotentials} potenciales visitados, {salesData.customers.convertedCustomers} realizaron al menos una compra</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-5 h-5" /> Rendimiento de Vendedores</CardTitle></CardHeader>
                <CardContent>
                  {salesData.vendedorPerformance.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b bg-gray-50">
                          <th className="text-left p-3 font-medium text-black">Vendedor</th>
                          <th className="text-right p-3 font-medium text-black">Rutas</th>
                          <th className="text-right p-3 font-medium text-black">Visitas</th>
                          <th className="text-right p-3 font-medium text-black">Visitados</th>
                          <th className="text-right p-3 font-medium text-black">Convertidos</th>
                          <th className="text-right p-3 font-medium text-black">Conversión</th>
                        </tr></thead>
                        <tbody>
                          {salesData.vendedorPerformance.map((v) => (
                            <tr key={v.name} className="border-b hover:bg-amber-50">
                              <td className="p-3 font-medium text-black">{v.name}</td>
                              <td className="p-3 text-right text-black">{v.visitRoutes}</td>
                              <td className="p-3 text-right text-black">{v.totalVisits}</td>
                              <td className="p-3 text-right text-black">{v.visitedCount}</td>
                              <td className="p-3 text-right text-green-600 font-medium">{v.customersConverted}</td>
                              <td className="p-3 text-right">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.conversionRate >= 50 ? "bg-green-100 text-green-700" : v.conversionRate >= 25 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                                  {pct(v.conversionRate)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="text-sm text-black text-center py-10">No hay datos de vendedores</p>}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Ventas por Localidad</CardTitle></CardHeader>
                  <CardContent>
                    {salesData.salesByLocality.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={salesData.salesByLocality.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" fontSize={12} />
                          <YAxis dataKey="locality" type="category" width={100} fontSize={11} />
                          <Tooltip formatter={(value) => [fmt(Number(value)), "Total"]} /><Bar dataKey="total" fill="#d97706" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-black text-center py-10">Sin datos</p>}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Ventas por Medio de Pago</CardTitle></CardHeader>
                  <CardContent>
                    {salesData.salesByPaymentMethod.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart><Pie data={salesData.salesByPaymentMethod} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="total" nameKey="method">
                          {salesData.salesByPaymentMethod.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie><Tooltip formatter={(value) => [fmt(Number(value)), "Total"]} /></PieChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-black text-center py-10">Sin datos</p>}
                    <div className="flex flex-wrap gap-2 justify-center">
                      {salesData.salesByPaymentMethod.map((s, i) => (
                        <span key={s.method} className="flex items-center gap-1 text-xs">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />{s.method} ({s.count})
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Receipt className="w-5 h-5" /> Estado de Resultados</CardTitle></CardHeader>
                <CardContent>
                  <div className="max-w-lg mx-auto space-y-2">
                    <IncomeRow label="Facturación Bruta" value={salesData.incomeStatement.facturacion} type="income" />
                    <IncomeRow label="Descuentos" value={salesData.incomeStatement.descuentos} type="expense" />
                    <div className="border-t border-gray-300 pt-2">
                      <IncomeRow label="Facturación Neta" value={salesData.incomeStatement.facturacion - salesData.incomeStatement.descuentos} type="subtotal" />
                    </div>
                    <div className="mt-2" />
                    <IncomeRow label="Costo Logística" value={salesData.incomeStatement.costoLogistica} type="expense" />
                    <IncomeRow label="  - Combustible" value={salesData.incomeStatement.costoCombustible} type="detail" />
                    <IncomeRow label="  - Choferes" value={salesData.incomeStatement.costoChoferes} type="detail" />
                    <div className="border-t-2 border-gray-800 pt-2 mt-2">
                      <IncomeRow label="Margen Bruto" value={salesData.incomeStatement.margenBruto} type="total" />
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-700">{salesData.incomeStatement.nota}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </>
  );
}
