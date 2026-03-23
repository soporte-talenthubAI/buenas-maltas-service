"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
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

const formatCurrency = (v: number) =>
  "$ " + v.toLocaleString("es-AR", { maximumFractionDigits: 0 });

const BRAND_KEYS: { key: keyof VendedorYearData; label: string }[] = [
  { key: "traumer", label: "Träumer" },
  { key: "vitea", label: "Vitea" },
  { key: "beermut", label: "Beermut" },
  { key: "mixology", label: "Mixology" },
];

export function VendedoresTab() {
  const [data, setData] = useState<VendedoresData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/vendedores-analytics")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const latestYear = useMemo(
    () => (data ? Math.max(...data.years) : new Date().getFullYear()),
    [data]
  );

  const kpis = useMemo(() => {
    if (!data) return { totalVendedores: 0, totalLatas: 0, totalRevenue: 0 };
    const ly = String(latestYear);
    let totalLatas = 0;
    let totalRevenue = 0;
    for (const v of data.vendedores) {
      const yd = v.years[ly];
      if (yd) {
        totalLatas += yd.total;
        totalRevenue += yd.revenue;
      }
    }
    return {
      totalVendedores: data.vendedores.length,
      totalLatas,
      totalRevenue,
    };
  }, [data, latestYear]);

  const revenueChart = useMemo(() => {
    if (!data) return [];
    const ly = String(latestYear);
    return data.vendedores
      .map((v) => ({
        name: v.name,
        revenue: v.years[ly]?.revenue ?? 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [data, latestYear]);

  if (loading || !data) return <Loading />;

  const years = [...data.years].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Total Vendedores"
          value={kpis.totalVendedores.toString()}
        />
        <KPICard
          title={`Total Latas (${latestYear})`}
          value={kpis.totalLatas.toLocaleString("es-AR")}
        />
        <KPICard
          title={`Facturación Total (${latestYear})`}
          value={formatCurrency(kpis.totalRevenue)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-black">
            Latas Totales por Vendedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-black">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Vendedor</th>
                  {years.map((y) => (
                    <th key={y} className="text-right py-2 px-3">
                      {y}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.vendedores.map((v) => (
                  <tr key={v.name} className="border-b hover:bg-amber-50">
                    <td className="py-2 px-3">{v.name}</td>
                    {years.map((y) => (
                      <td key={y} className="text-right py-2 px-3 font-bold">
                        {(v.years[String(y)]?.total ?? 0).toLocaleString(
                          "es-AR"
                        )}
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
            <CardHeader>
              <CardTitle className="text-black">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-black">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Vendedor</th>
                      {years.map((y) => (
                        <th key={y} className="text-right py-2 px-3">
                          {y}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.vendedores.map((v) => (
                      <tr
                        key={v.name}
                        className="border-b hover:bg-amber-50"
                      >
                        <td className="py-2 px-3">{v.name}</td>
                        {years.map((y) => (
                          <td key={y} className="text-right py-2 px-3">
                            {(
                              (v.years[String(y)]?.[key] as number) ?? 0
                            ).toLocaleString("es-AR")}
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
        <CardHeader>
          <CardTitle className="text-black">
            Facturación por Vendedor ({latestYear})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueChart}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <YAxis type="category" dataKey="name" width={110} />
                <Tooltip
                  formatter={(v) => [
                    formatCurrency(Number(v)),
                    "Facturación",
                  ]}
                />
                <Legend />
                <Bar dataKey="revenue" name="Facturación" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
