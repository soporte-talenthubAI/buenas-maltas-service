"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  BarChart,
  Bar,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/analytics/shared/loading";
import { YearSelector } from "@/components/analytics/shared/year-selector";
import { MonthTable } from "@/components/analytics/shared/month-table";
import { Search, X } from "lucide-react";

interface ClientRevenueRow {
  client: string;
  months: Record<string, number>;
  total: number;
}

interface ParetoRow {
  client: string;
  revenue: number;
  cumulativePercent: number;
}

interface ClientBrandRow {
  client: string;
  months: Record<string, number>;
  total: number;
}

interface ClientTypeRow {
  channel: string;
  invoices: number;
  revenue: number;
}

interface ClientesData {
  revenueByClient: ClientRevenueRow[];
  paretoData: ParetoRow[];
  clientsByBrand: Record<string, ClientBrandRow[]>;
  barrilesByClient: ClientRevenueRow[];
  clientTypeBreakdown: ClientTypeRow[];
  monthKeys: string[];
}

const PIE_COLORS = [
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
];

const BRAND_TABS = ["Träumer", "Vitea", "Beermut", "Mixology"] as const;

type SubTab =
  | "facturacion"
  | "Träumer"
  | "Vitea"
  | "Beermut"
  | "Mixology"
  | "barriles"
  | "tipos";

const SUB_TAB_LABELS: { key: SubTab; label: string }[] = [
  { key: "facturacion", label: "Facturación" },
  { key: "Träumer", label: "Träumer" },
  { key: "Vitea", label: "Vitea" },
  { key: "Beermut", label: "Beermut" },
  { key: "Mixology", label: "Mixology" },
  { key: "barriles", label: "Barriles" },
  { key: "tipos", label: "Tipos" },
];

const fmtCurrency = (v: number) =>
  "$ " + v.toLocaleString("es-AR", { maximumFractionDigits: 0 });

const fmtQty = (v: number) => v.toLocaleString("es-AR");

export function ClientesTab({ origin = "all" }: { origin?: string }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<ClientesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>("facturacion");
  const [clientFilter, setClientFilter] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: String(year) });
      if (origin !== "all") params.set("origin", origin);
      const res = await fetch(`/api/analytics/clientes?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Error fetching clientes:", err);
    } finally {
      setLoading(false);
    }
  }, [year, origin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get unique client names for autocomplete
  const allClientNames = useMemo(() => {
    if (!data) return [];
    return data.revenueByClient.map((c) => c.client).sort();
  }, [data]);

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!clientFilter.trim()) return [];
    const q = clientFilter.toLowerCase();
    return allClientNames.filter((name) => name.toLowerCase().includes(q)).slice(0, 10);
  }, [clientFilter, allClientNames]);

  // Apply client filter to all data
  const filteredData = useMemo(() => {
    if (!data) return null;
    if (!clientFilter.trim()) return data;

    const q = clientFilter.toLowerCase();
    const matchClient = (name: string) => name.toLowerCase().includes(q);

    const revenueByClient = data.revenueByClient.filter((c) => matchClient(c.client));

    // Recalculate pareto with filtered clients
    const sortedClients = [...revenueByClient].sort((a, b) => b.total - a.total);
    const grandTotal = sortedClients.reduce((s, c) => s + c.total, 0);
    let cumulative = 0;
    const paretoData = sortedClients.map((c) => {
      cumulative += c.total;
      return {
        client: c.client,
        revenue: c.total,
        cumulativePercent: grandTotal > 0 ? (cumulative / grandTotal) * 100 : 0,
      };
    });

    const clientsByBrand: Record<string, ClientBrandRow[]> = {};
    for (const [brand, rows] of Object.entries(data.clientsByBrand)) {
      clientsByBrand[brand] = rows.filter((c) => matchClient(c.client));
    }

    const barrilesByClient = data.barrilesByClient.filter((c) => matchClient(c.client));

    // Channel breakdown: keep as-is (doesn't filter by individual client)
    return {
      ...data,
      revenueByClient,
      paretoData,
      clientsByBrand,
      barrilesByClient,
    };
  }, [data, clientFilter]);

  if (loading) return <Loading />;
  if (!filteredData) return <p className="text-black">No se encontraron datos.</p>;

  const {
    revenueByClient,
    paretoData,
    clientsByBrand,
    barrilesByClient,
    clientTypeBreakdown,
    monthKeys,
  } = filteredData;

  const top15 = [...revenueByClient]
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold text-black">Clientes</h2>
        <div className="flex items-center gap-3">
          {/* Client search filter */}
          <div className="relative">
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
              <Search className="w-4 h-4 text-gray-400 ml-3" />
              <input
                type="text"
                value={clientFilter}
                onChange={(e) => {
                  setClientFilter(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Filtrar cliente..."
                className="px-2 py-1.5 text-sm text-black w-48 focus:outline-none"
              />
              {clientFilter && (
                <button
                  onClick={() => { setClientFilter(""); setShowDropdown(false); }}
                  className="px-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {/* Autocomplete dropdown */}
            {showDropdown && filteredSuggestions.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredSuggestions.map((name) => (
                  <button
                    key={name}
                    onMouseDown={() => {
                      setClientFilter(name);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-black hover:bg-amber-50 truncate"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <YearSelector year={year} onChange={setYear} />
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {SUB_TAB_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              subTab === key
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-black hover:text-amber-600 hover:border-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Facturación sub-tab */}
      {subTab === "facturacion" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Facturación por Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthTable<ClientRevenueRow>
                data={revenueByClient}
                monthKeys={monthKeys}
                labelKey="client"
                getMonthValue={(row, mk) => row.months[mk] || 0}
                getTotal={(row) => row.total}
                formatValue={fmtCurrency}
                highlightTop={5}
              />
            </CardContent>
          </Card>

          {/* Top 15 Horizontal Bar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Top 15 Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={top15} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tick={{ fill: "#000" }}
                    tickFormatter={(v) => fmtCurrency(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="client"
                    width={180}
                    tick={{ fill: "#000", fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [fmtCurrency(Number(value)), "Facturación"]}
                  />
                  <Bar dataKey="total" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pareto Chart */}
          {paretoData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-black">Análisis Pareto</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={paretoData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="client"
                      tick={{ fill: "#000", fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: "#000" }}
                      tickFormatter={(v) => fmtCurrency(v)}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: "#000" }}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        const v = Number(value);
                        if (name === "Facturación") return [fmtCurrency(v), name];
                        return [`${v.toFixed(1)}%`, String(name)];
                      }}
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      name="Facturación"
                      fill="#f59e0b"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cumulativePercent"
                      name="% Acumulado"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Brand sub-tabs */}
      {BRAND_TABS.includes(subTab as (typeof BRAND_TABS)[number]) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-black">Clientes - {subTab}</CardTitle>
          </CardHeader>
          <CardContent>
            {clientsByBrand[subTab] && clientsByBrand[subTab].length > 0 ? (
              <MonthTable<ClientBrandRow>
                data={clientsByBrand[subTab]}
                monthKeys={monthKeys}
                labelKey="client"
                getMonthValue={(row, mk) => row.months[mk] || 0}
                getTotal={(row) => row.total}
                formatValue={fmtQty}
                highlightTop={5}
              />
            ) : (
              <p className="text-black text-sm">No hay datos para esta marca.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Barriles sub-tab */}
      {subTab === "barriles" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-black">Barriles por Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {barrilesByClient.length > 0 ? (
              <MonthTable<ClientRevenueRow>
                data={barrilesByClient}
                monthKeys={monthKeys}
                labelKey="client"
                getMonthValue={(row, mk) => row.months[mk] || 0}
                getTotal={(row) => row.total}
                formatValue={fmtQty}
                highlightTop={5}
              />
            ) : (
              <p className="text-black text-sm">No hay datos de barriles.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tipos sub-tab */}
      {subTab === "tipos" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Distribución por Tipo de Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Tooltip
                      formatter={(value) => [fmtCurrency(Number(value)), "Facturación"]}
                    />
                    <Legend />
                    <Pie
                      data={clientTypeBreakdown}
                      dataKey="revenue"
                      nameKey="channel"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={(props) =>
                        `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {clientTypeBreakdown.map((_, i) => (
                        <Cell
                          key={`cell-${i}`}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-black">Detalle por Canal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium text-black">
                        Canal
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-black">
                        Facturas
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-black">
                        Facturación
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientTypeBreakdown.map((row, idx) => (
                      <tr
                        key={row.channel}
                        className={`border-b ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="py-1.5 px-3 text-black font-medium">
                          <span
                            className="inline-block w-3 h-3 rounded-full mr-2"
                            style={{
                              backgroundColor:
                                PIE_COLORS[idx % PIE_COLORS.length],
                            }}
                          />
                          {row.channel}
                        </td>
                        <td className="py-1.5 px-3 text-right text-black tabular-nums">
                          {row.invoices.toLocaleString("es-AR")}
                        </td>
                        <td className="py-1.5 px-3 text-right text-black font-bold tabular-nums">
                          {fmtCurrency(row.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2">
                      <td className="py-2 px-3 font-bold text-black">Total</td>
                      <td className="py-2 px-3 text-right font-bold text-black tabular-nums">
                        {clientTypeBreakdown
                          .reduce((s, r) => s + r.invoices, 0)
                          .toLocaleString("es-AR")}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-black tabular-nums">
                        {fmtCurrency(
                          clientTypeBreakdown.reduce((s, r) => s + r.revenue, 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
