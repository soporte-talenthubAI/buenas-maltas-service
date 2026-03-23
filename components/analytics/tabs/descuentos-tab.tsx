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
import { YearSelector } from "@/components/analytics/shared/year-selector";

interface ClientDiscount {
  client: string;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  orderCount: number;
  months: Record<string, number>;
}

interface DescuentosSummary {
  totalDiscountAmount: number;
  avgDiscountPercent: number;
  ordersWithDiscount: number;
  totalOrders: number;
}

interface DescuentosData {
  clients: ClientDiscount[];
  summary: DescuentosSummary;
  monthKeys: string[];
}

const formatCurrency = (v: number) =>
  "$ " + v.toLocaleString("es-AR", { maximumFractionDigits: 0 });

export function DescuentosTab({ origin = "all" }: { origin?: string }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<DescuentosData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ year: String(year) });
    if (origin !== "all") params.set("origin", origin);
    fetch(`/api/analytics/descuentos?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year, origin]);

  const filteredClients = useMemo(() => {
    if (!data) return [];
    return data.clients
      .filter((c) => c.discountAmount > 0)
      .sort((a, b) => b.discountAmount - a.discountAmount);
  }, [data]);

  const chartData = useMemo(
    () =>
      filteredClients.slice(0, 10).map((c) => ({
        name: c.client,
        descuento: c.discountAmount,
      })),
    [filteredClients]
  );

  if (loading || !data) return <Loading />;

  const { summary } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <YearSelector year={year} onChange={setYear} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Total Descuentos"
          value={formatCurrency(summary.totalDiscountAmount)}
        />
        <KPICard
          title="% Descuento Promedio"
          value={`${summary.avgDiscountPercent.toFixed(1)}%`}
        />
        <KPICard
          title="Pedidos con Descuento"
          value={`${summary.ordersWithDiscount} / ${summary.totalOrders}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-black">Descuentos por Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-black">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Cliente</th>
                  <th className="text-right py-2 px-3">Subtotal</th>
                  <th className="text-right py-2 px-3">Monto Dto</th>
                  <th className="text-right py-2 px-3">% Dto</th>
                  <th className="text-right py-2 px-3">Pedidos</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c) => (
                  <tr key={c.client} className="border-b hover:bg-amber-50">
                    <td className="py-2 px-3">{c.client}</td>
                    <td className="text-right py-2 px-3">
                      {formatCurrency(c.subtotal)}
                    </td>
                    <td className="text-right py-2 px-3">
                      {formatCurrency(c.discountAmount)}
                    </td>
                    <td className="text-right py-2 px-3">
                      {c.discountPercent.toFixed(1)}%
                    </td>
                    <td className="text-right py-2 px-3">{c.orderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-black">
            Top 10 Clientes por Monto de Descuento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
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
                  formatter={(v) => [formatCurrency(Number(v)), "Descuento"]}
                />
                <Legend />
                <Bar dataKey="descuento" name="Descuento" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
