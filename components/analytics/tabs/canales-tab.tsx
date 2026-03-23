"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/analytics/shared/loading";
import { KPICard } from "@/components/analytics/shared/kpi-card";
import { YearSelector } from "@/components/analytics/shared/year-selector";

interface ChannelBrandRow {
  channel: string;
  brand: string;
  quantity: number;
  revenue: number;
  cost: number;
  avgPrice: number;
  margin: number;
  marginPercent: number;
  months: Record<string, { quantity: number; revenue: number }>;
}

interface CanalesData {
  byChannelBrand: ChannelBrandRow[];
  monthKeys: string[];
}

const BRANDS = ["Todos", "Träumer", "Vitea", "Beermut", "Mixology"];
const CHANNEL_COLORS = [
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
];

const formatCurrency = (v: number) =>
  "$ " + v.toLocaleString("es-AR", { maximumFractionDigits: 0 });

export function CanalesTab() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<CanalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState("Todos");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/canales?year=${year}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year]);

  const grouped = useMemo(() => {
    if (!data) return [];
    const filtered =
      selectedBrand === "Todos"
        ? data.byChannelBrand
        : data.byChannelBrand.filter((r) => r.brand === selectedBrand);

    const map = new Map<
      string,
      {
        channel: string;
        quantity: number;
        revenue: number;
        avgPrice: number;
        margin: number;
        marginPercent: number;
        _count: number;
      }
    >();

    for (const row of filtered) {
      const existing = map.get(row.channel);
      if (existing) {
        existing.quantity += row.quantity;
        existing.revenue += row.revenue;
        existing.margin += row.margin;
        existing.marginPercent += row.marginPercent;
        existing._count += 1;
      } else {
        map.set(row.channel, {
          channel: row.channel,
          quantity: row.quantity,
          revenue: row.revenue,
          avgPrice: row.avgPrice,
          margin: row.margin,
          marginPercent: row.marginPercent,
          _count: 1,
        });
      }
    }

    return Array.from(map.values()).map((r) => ({
      ...r,
      avgPrice: r.revenue / (r.quantity || 1),
      marginPercent: r.marginPercent / (r._count || 1),
    }));
  }, [data, selectedBrand]);

  const totals = useMemo(() => {
    const totalRevenue = grouped.reduce((s, r) => s + r.revenue, 0);
    const totalMargin = grouped.reduce((s, r) => s + r.margin, 0);
    const avgMarginPercent =
      grouped.length > 0
        ? grouped.reduce((s, r) => s + r.marginPercent, 0) / grouped.length
        : 0;
    return { totalRevenue, totalMargin, avgMarginPercent };
  }, [grouped]);

  const chartData = useMemo(
    () =>
      grouped
        .map((r) => ({ name: r.channel, margen: r.margin }))
        .sort((a, b) => b.margen - a.margen),
    [grouped]
  );

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <YearSelector year={year} onChange={setYear} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard title="Total Facturado" value={formatCurrency(totals.totalRevenue)} />
        <KPICard title="Total Margen" value={formatCurrency(totals.totalMargin)} />
        <KPICard
          title="% Margen Promedio"
          value={`${totals.avgMarginPercent.toFixed(1)}%`}
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {BRANDS.map((b) => (
          <button
            key={b}
            onClick={() => setSelectedBrand(b)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedBrand === b
                ? "bg-amber-500 text-white"
                : "bg-gray-100 text-black hover:bg-gray-200"
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-black">
            Canales {selectedBrand !== "Todos" ? `— ${selectedBrand}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-black">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Canal</th>
                  <th className="text-right py-2 px-3">Cantidad</th>
                  <th className="text-right py-2 px-3">Facturado</th>
                  <th className="text-right py-2 px-3">Precio Promedio</th>
                  <th className="text-right py-2 px-3">Margen</th>
                  <th className="text-right py-2 px-3">% Margen</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((row) => (
                  <tr key={row.channel} className="border-b hover:bg-amber-50">
                    <td className="py-2 px-3">{row.channel}</td>
                    <td className="text-right py-2 px-3">
                      {row.quantity.toLocaleString("es-AR")}
                    </td>
                    <td className="text-right py-2 px-3">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className="text-right py-2 px-3">
                      {formatCurrency(row.avgPrice)}
                    </td>
                    <td className="text-right py-2 px-3">
                      {formatCurrency(row.margin)}
                    </td>
                    <td className="text-right py-2 px-3">
                      {row.marginPercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-black">Margen por Canal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <YAxis type="category" dataKey="name" width={90} />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v)), "Margen"]}
                />
                <Legend />
                <Bar dataKey="margen" name="Margen">
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
