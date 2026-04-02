"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/analytics/shared/loading";
import { KPICard } from "@/components/analytics/shared/kpi-card";
import { YearSelector } from "@/components/analytics/shared/year-selector";
import {
  MapPin,
  Users,
  Loader2,
} from "lucide-react";

// Lazy load map to avoid SSR issues with Leaflet
const VendedorMap = dynamic(
  () => import("@/components/analytics/vendedor-map"),
  { ssr: false, loading: () => <div className="h-[500px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">Cargando mapa...</div> }
);

interface VendedorYearData {
  traumer: number;
  vitea: number;
  beermut: number;
  mixology: number;
  total: number;
  revenue: number;
}

interface Vendedor {
  name: string;
  years: Record<string, VendedorYearData>;
}

interface VendedoresData {
  vendedores: Vendedor[];
  years: number[];
}

interface VendedorVisitCustomer {
  name: string;
  locality: string;
  channel: string;
  isReal: boolean;
  orders: number;
  revenue: number;
  hasCoords: boolean;
}

interface VendedorVisitLocality {
  locality: string;
  count: number;
  revenue: number;
  real: number;
  potencial: number;
}

interface VendedorVisitDetail {
  name: string;
  totalClientes: number;
  realClientes: number;
  potencialClientes: number;
  conversionRate: number;
  revenue: number;
  orders: number;
  localities: VendedorVisitLocality[];
  customers: VendedorVisitCustomer[];
}

interface HeatmapEntry {
  locality: string;
  orders: number;
  revenue: number;
  vendedores: number;
  vendedorNames: string[];
  realClientes: number;
  potencialClientes: number;
}

interface VisitData {
  vendedores: VendedorVisitDetail[];
  heatmapData: HeatmapEntry[];
  conversion: {
    totalCustomers: number;
    realClientes: number;
    potencialClientes: number;
    conversionRate: number;
  };
  year: number;
}

type SubTab = "ventas" | "mapa" | "conversion" | "clientes";

const formatCurrency = (v: number) =>
  "$ " + v.toLocaleString("es-AR", { maximumFractionDigits: 0 });

const BRAND_KEYS: { key: keyof VendedorYearData; label: string }[] = [
  { key: "traumer", label: "Träumer" },
  { key: "vitea", label: "Vitea" },
  { key: "beermut", label: "Beermut" },
  { key: "mixology", label: "Mixology" },
];

const PIE_COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#6b7280"];

const HEAT_COLORS = [
  { threshold: 0, bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  { threshold: 5, bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  { threshold: 20, bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  { threshold: 50, bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
];

function getHeatColor(orders: number) {
  for (let i = HEAT_COLORS.length - 1; i >= 0; i--) {
    if (orders >= HEAT_COLORS[i].threshold) return HEAT_COLORS[i];
  }
  return HEAT_COLORS[0];
}

export function VendedoresTab({ origin = "all" }: { origin?: string }) {
  const [salesData, setSalesData] = useState<VendedoresData | null>(null);
  const [visitData, setVisitData] = useState<VisitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitLoading, setVisitLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>("ventas");
  const [selectedVendedor, setSelectedVendedor] = useState<string>("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<string | null>(null);

  // Fetch sales data
  useEffect(() => {
    setLoading(true);
    const params = origin !== "all" ? `?origin=${origin}` : "";
    fetch(`/api/analytics/vendedores-analytics${params}`)
      .then((r) => r.json())
      .then((d) => { setSalesData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [origin]);

  // Fetch visit/conversion data
  const fetchVisitData = useCallback(() => {
    setVisitLoading(true);
    fetch(`/api/analytics/vendedores-visits?year=${year}`)
      .then((r) => r.json())
      .then((d) => { setVisitData(d); setVisitLoading(false); })
      .catch(() => setVisitLoading(false));
  }, [year]);

  useEffect(() => {
    if (subTab !== "ventas") fetchVisitData();
  }, [subTab, fetchVisitData]);

  const handleGeocode = async () => {
    setGeocoding(true);
    setGeocodeResult(null);
    try {
      const res = await fetch("/api/geocode?limit=100", { method: "POST" });
      const data = await res.json();
      setGeocodeResult(
        `Geocodificados: ${data.geocoded} de ${data.processed} (${data.failed} fallidos)`
      );
      if (data.geocoded > 0) fetchVisitData();
    } catch {
      setGeocodeResult("Error al geocodificar");
    } finally {
      setGeocoding(false);
    }
  };

  const latestYear = useMemo(
    () => (salesData ? Math.max(...salesData.years) : new Date().getFullYear()),
    [salesData]
  );

  const kpis = useMemo(() => {
    if (!salesData) return { totalVendedores: 0, totalLatas: 0, totalRevenue: 0 };
    const ly = String(latestYear);
    let totalLatas = 0;
    let totalRevenue = 0;
    for (const v of salesData.vendedores) {
      const yd = v.years[ly];
      if (yd) { totalLatas += yd.total; totalRevenue += yd.revenue; }
    }
    return { totalVendedores: salesData.vendedores.length, totalLatas, totalRevenue };
  }, [salesData, latestYear]);

  const revenueChart = useMemo(() => {
    if (!salesData) return [];
    const ly = String(latestYear);
    return salesData.vendedores
      .map((v) => ({ name: v.name, revenue: v.years[ly]?.revenue ?? 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [salesData, latestYear]);

  // Selected vendedor detail
  const selectedDetail = useMemo(() => {
    if (!visitData || !selectedVendedor) return null;
    return visitData.vendedores.find((v) => v.name === selectedVendedor) || null;
  }, [visitData, selectedVendedor]);

  if (loading || !salesData) return <Loading />;

  const years = [...salesData.years].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex flex-wrap gap-1 border-b border-gray-200">
          {([
            { key: "ventas" as SubTab, label: "Ventas" },
            { key: "mapa" as SubTab, label: "Mapa de Calor" },
            { key: "conversion" as SubTab, label: "Conversión" },
            { key: "clientes" as SubTab, label: "Clientes x Vendedor" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSubTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                subTab === key
                  ? "border-amber-500 text-amber-600"
                  : "border-transparent text-black hover:text-amber-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {subTab !== "ventas" && (
          <YearSelector year={year} onChange={setYear} />
        )}
      </div>

      {/* VENTAS TAB */}
      {subTab === "ventas" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard title="Total Vendedores" value={kpis.totalVendedores.toString()} />
            <KPICard title={`Total Latas (${latestYear})`} value={kpis.totalLatas.toLocaleString("es-AR")} />
            <KPICard title={`Facturación Total (${latestYear})`} value={formatCurrency(kpis.totalRevenue)} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-black">Latas Totales por Vendedor</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-black">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Vendedor</th>
                      {years.map((y) => (<th key={y} className="text-right py-2 px-3">{y}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.vendedores.map((v) => (
                      <tr key={v.name} className="border-b hover:bg-amber-50">
                        <td className="py-2 px-3">{v.name}</td>
                        {years.map((y) => (
                          <td key={y} className="text-right py-2 px-3 font-bold">
                            {(v.years[String(y)]?.total ?? 0).toLocaleString("es-AR")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BRAND_KEYS.map(({ key, label }) => (
              <Card key={key}>
                <CardHeader><CardTitle className="text-black">{label}</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-black">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3">Vendedor</th>
                          {years.map((y) => (<th key={y} className="text-right py-2 px-3">{y}</th>))}
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.vendedores.map((v) => (
                          <tr key={v.name} className="border-b hover:bg-amber-50">
                            <td className="py-2 px-3">{v.name}</td>
                            {years.map((y) => (
                              <td key={y} className="text-right py-2 px-3">
                                {((v.years[String(y)]?.[key] as number) ?? 0).toLocaleString("es-AR")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-black">Facturación por Vendedor ({latestYear})</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChart} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis type="category" dataKey="name" width={110} />
                    <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Facturación"]} />
                    <Legend />
                    <Bar dataKey="revenue" name="Facturación" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* MAPA DE CALOR TAB */}
      {subTab === "mapa" && (
        <>
          {visitLoading ? <Loading /> : visitData && (
            <div className="space-y-6">
              {/* Geocode button */}
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="outline" onClick={handleGeocode} disabled={geocoding}>
                  {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  Geocodificar Clientes
                </Button>
                <span className="text-xs text-gray-500">
                  Obtiene lat/lng de la dirección con OpenStreetMap (tarda ~1s por cliente)
                </span>
                {geocodeResult && (
                  <span className={`text-sm ${geocodeResult.includes("Error") ? "text-red-600" : "text-green-600"}`}>
                    {geocodeResult}
                  </span>
                )}
              </div>

              {/* Vendedor selector for map */}
              <div className="flex items-center gap-3">
                <select
                  value={selectedVendedor}
                  onChange={(e) => setSelectedVendedor(e.target.value)}
                  className="h-9 rounded-md border border-gray-300 px-3 text-sm text-black"
                >
                  <option value="">Todos los vendedores</option>
                  {visitData.vendedores.map((v) => (
                    <option key={v.name} value={v.name}>{v.name} ({v.totalClientes} clientes)</option>
                  ))}
                </select>
              </div>

              {/* Map */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-black flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Mapa de Actividad {selectedVendedor ? `- ${selectedVendedor}` : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <VendedorMap
                    vendedores={visitData.vendedores}
                    selectedVendedor={selectedVendedor}
                  />
                </CardContent>
              </Card>

              {/* Heatmap by locality */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-black">Mapa de Calor por Localidad</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(selectedVendedor
                      ? visitData.vendedores.find(v => v.name === selectedVendedor)?.localities || []
                      : visitData.heatmapData
                    ).slice(0, 20).map((loc) => {
                      const heat = getHeatColor("orders" in loc ? loc.orders : loc.count);
                      const orders = "orders" in loc ? loc.orders : loc.count;
                      const revenue = loc.revenue;
                      return (
                        <div
                          key={loc.locality}
                          className={`p-3 rounded-lg border ${heat.bg} ${heat.border}`}
                        >
                          <p className={`font-medium text-sm ${heat.text}`}>{loc.locality}</p>
                          <p className={`text-lg font-bold ${heat.text}`}>{orders} pedidos</p>
                          <p className="text-xs text-gray-600">{formatCurrency(revenue)}</p>
                          {"vendedores" in loc && (
                            <p className="text-xs text-gray-500 mt-1">{loc.vendedores} vendedor{loc.vendedores > 1 ? "es" : ""}</p>
                          )}
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs text-green-600">
                              {("realClientes" in loc ? loc.realClientes : loc.real)} reales
                            </span>
                            <span className="text-xs text-amber-600">
                              {("potencialClientes" in loc ? loc.potencialClientes : loc.potencial)} pot.
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* CONVERSIÓN TAB */}
      {subTab === "conversion" && (
        <>
          {visitLoading ? <Loading /> : visitData && (
            <div className="space-y-6">
              {/* Global KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                  title="Total Clientes"
                  value={visitData.conversion.totalCustomers.toString()}
                  color="text-blue-600"
                />
                <KPICard
                  title="Clientes Reales"
                  value={visitData.conversion.realClientes.toString()}
                  color="text-green-600"
                />
                <KPICard
                  title="Clientes Potenciales"
                  value={visitData.conversion.potencialClientes.toString()}
                  color="text-amber-600"
                />
                <KPICard
                  title="Tasa de Conversión"
                  value={`${visitData.conversion.conversionRate.toFixed(1)}%`}
                  color="text-purple-600"
                />
              </div>

              {/* Conversion by vendedor chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-black">Conversión por Vendedor</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={visitData.vendedores.map((v) => ({
                        name: v.name,
                        reales: v.realClientes,
                        potenciales: v.potencialClientes,
                        conversion: v.conversionRate,
                      }))}
                      layout="vertical"
                      margin={{ left: 130, right: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: "#000" }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="reales" name="Reales" fill="#10b981" stackId="a" />
                      <Bar dataKey="potenciales" name="Potenciales" fill="#f59e0b" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Conversion pie */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-black">Distribución Global</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Reales", value: visitData.conversion.realClientes },
                            { name: "Potenciales", value: visitData.conversion.potencialClientes },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#f59e0b" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Conversion table */}
                <Card>
                  <CardHeader><CardTitle className="text-black">Detalle por Vendedor</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-black">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2">Vendedor</th>
                            <th className="text-right py-2 px-2">Clientes</th>
                            <th className="text-right py-2 px-2">Reales</th>
                            <th className="text-right py-2 px-2">Pot.</th>
                            <th className="text-right py-2 px-2">Conv. %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visitData.vendedores.map((v) => (
                            <tr key={v.name} className="border-b hover:bg-amber-50">
                              <td className="py-1.5 px-2 font-medium">{v.name}</td>
                              <td className="py-1.5 px-2 text-right">{v.totalClientes}</td>
                              <td className="py-1.5 px-2 text-right text-green-600">{v.realClientes}</td>
                              <td className="py-1.5 px-2 text-right text-amber-600">{v.potencialClientes}</td>
                              <td className="py-1.5 px-2 text-right font-bold">
                                {v.conversionRate.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {/* CLIENTES x VENDEDOR TAB */}
      {subTab === "clientes" && (
        <>
          {visitLoading ? <Loading /> : visitData && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={selectedVendedor}
                  onChange={(e) => setSelectedVendedor(e.target.value)}
                  className="h-9 rounded-md border border-gray-300 px-3 text-sm text-black"
                >
                  <option value="">Seleccionar vendedor</option>
                  {visitData.vendedores.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.totalClientes} clientes)
                    </option>
                  ))}
                </select>
              </div>

              {selectedDetail && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPICard title="Clientes" value={selectedDetail.totalClientes.toString()} />
                    <KPICard title="Pedidos" value={selectedDetail.orders.toLocaleString("es-AR")} />
                    <KPICard title="Facturación" value={formatCurrency(selectedDetail.revenue)} />
                    <KPICard title="Conversión" value={`${selectedDetail.conversionRate.toFixed(1)}%`} />
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-black">
                        Clientes de {selectedDetail.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-black">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3">Cliente</th>
                              <th className="text-left py-2 px-3">Localidad</th>
                              <th className="text-left py-2 px-3">Canal</th>
                              <th className="text-center py-2 px-3">Tipo</th>
                              <th className="text-right py-2 px-3">Pedidos</th>
                              <th className="text-right py-2 px-3">Facturación</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDetail.customers.map((c) => (
                              <tr key={c.name} className="border-b hover:bg-gray-50">
                                <td className="py-1.5 px-3 font-medium">{c.name}</td>
                                <td className="py-1.5 px-3 text-gray-600">{c.locality}</td>
                                <td className="py-1.5 px-3 text-gray-600">{c.channel}</td>
                                <td className="py-1.5 px-3 text-center">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                    c.isReal
                                      ? "bg-green-100 text-green-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}>
                                    {c.isReal ? "Real" : "Potencial"}
                                  </span>
                                </td>
                                <td className="py-1.5 px-3 text-right">{c.orders}</td>
                                <td className="py-1.5 px-3 text-right font-bold">{formatCurrency(c.revenue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {!selectedDetail && (
                <div className="text-center py-12 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3" />
                  <p>Seleccioná un vendedor para ver sus clientes</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
