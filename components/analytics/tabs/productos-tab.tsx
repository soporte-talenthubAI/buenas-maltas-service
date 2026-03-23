"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/analytics/shared/loading";
import { KPICard } from "@/components/analytics/shared/kpi-card";
import { YearSelector } from "@/components/analytics/shared/year-selector";
import { MonthTable } from "@/components/analytics/shared/month-table";

interface ProductRow {
  product: string;
  brand: string;
  unit: string;
  months: Record<string, { quantity: number; revenue: number }>;
  totalQty: number;
  totalRevenue: number;
}

interface MonthlyTotal {
  month: string;
  latas: number;
  barriles: number;
  litrosLatas: number;
  litrosBarriles: number;
  revenue: number;
}

interface BrandTotal {
  brand: string;
  latas: number;
  litros: number;
  revenue: number;
}

interface ProductosData {
  products: ProductRow[];
  monthKeys: string[];
  monthlyTotals: MonthlyTotal[];
  brandTotals: BrandTotal[];
}

const fmtCurrency = (v: number) =>
  "$ " + v.toLocaleString("es-AR", { maximumFractionDigits: 0 });

const fmtQty = (v: number) => v.toLocaleString("es-AR");

export function ProductosTab({ origin = "all" }: { origin?: string }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<ProductosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"qty" | "revenue">("qty");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: String(year) });
      if (origin !== "all") params.set("origin", origin);
      const res = await fetch(`/api/analytics/productos?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Error fetching productos:", err);
    } finally {
      setLoading(false);
    }
  }, [year, origin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <Loading />;
  if (!data) return <p className="text-black">No se encontraron datos.</p>;

  const { products, monthKeys, monthlyTotals, brandTotals } = data;

  // Group products by brand for subtotals
  const brands = Array.from(new Set(products.map((p) => p.brand)));
  const groupedRows: (ProductRow & { _isBrandSubtotal?: boolean })[] = [];

  brands.forEach((brand) => {
    const brandProducts = products.filter((p) => p.brand === brand);
    groupedRows.push(...brandProducts);
    // Add subtotal row
    const subtotal: ProductRow & { _isBrandSubtotal?: boolean } = {
      product: `Subtotal ${brand}`,
      brand,
      unit: "",
      months: {},
      totalQty: 0,
      totalRevenue: 0,
      _isBrandSubtotal: true,
    };
    monthKeys.forEach((mk) => {
      let qty = 0;
      let rev = 0;
      brandProducts.forEach((p) => {
        qty += p.months[mk]?.quantity || 0;
        rev += p.months[mk]?.revenue || 0;
      });
      subtotal.months[mk] = { quantity: qty, revenue: rev };
    });
    subtotal.totalQty = brandProducts.reduce((s, p) => s + p.totalQty, 0);
    subtotal.totalRevenue = brandProducts.reduce((s, p) => s + p.totalRevenue, 0);
    groupedRows.push(subtotal);
  });

  // KPI totals
  const totalLatas = monthlyTotals.reduce((s, m) => s + m.latas, 0);
  const totalBarriles = monthlyTotals.reduce((s, m) => s + m.barriles, 0);
  const totalLitros = monthlyTotals.reduce(
    (s, m) => s + m.litrosLatas + m.litrosBarriles,
    0
  );
  const totalRevenue = monthlyTotals.reduce((s, m) => s + m.revenue, 0);

  const filteredBrands = brandTotals.filter((b) => b.brand !== "Servicio");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold text-black">Productos</h2>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-gray-300 overflow-hidden">
            <button
              onClick={() => setView("qty")}
              className={`px-3 py-1.5 text-sm font-medium ${
                view === "qty"
                  ? "bg-amber-500 text-white"
                  : "bg-white text-black hover:bg-gray-50"
              }`}
            >
              Cantidades
            </button>
            <button
              onClick={() => setView("revenue")}
              className={`px-3 py-1.5 text-sm font-medium ${
                view === "revenue"
                  ? "bg-amber-500 text-white"
                  : "bg-white text-black hover:bg-gray-50"
              }`}
            >
              Facturación
            </button>
          </div>
          <YearSelector year={year} onChange={setYear} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Total Latas" value={fmtQty(totalLatas)} />
        <KPICard title="Total Barriles" value={fmtQty(totalBarriles)} />
        <KPICard title="Total Litros" value={fmtQty(totalLitros)} />
        <KPICard
          title="Facturación Total"
          value={fmtCurrency(totalRevenue)}
          color="text-amber-600"
        />
      </div>

      {/* Month Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">
            {view === "qty" ? "Cantidades por Producto" : "Facturación por Producto"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MonthTable<ProductRow & { _isBrandSubtotal?: boolean }>
            data={groupedRows}
            monthKeys={monthKeys}
            labelKey="product"
            getMonthValue={(row, mk) =>
              view === "qty"
                ? row.months[mk]?.quantity || 0
                : row.months[mk]?.revenue || 0
            }
            getTotal={(row) => (view === "qty" ? row.totalQty : row.totalRevenue)}
            formatValue={view === "qty" ? fmtQty : fmtCurrency}
          />
        </CardContent>
      </Card>

      {/* Stacked Bar Chart: Latas vs Barriles por mes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">Latas vs Barriles por Mes</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={monthlyTotals}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: "#000" }} />
              <YAxis tick={{ fill: "#000" }} />
              <Tooltip
                formatter={(value, name) => [
                  fmtQty(Number(value)),
                  String(name),
                ]}
              />
              <Legend />
              <Bar
                dataKey="latas"
                name="Latas"
                stackId="a"
                fill="#f59e0b"
              />
              <Bar
                dataKey="barriles"
                name="Barriles"
                stackId="a"
                fill="#d97706"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Brand Totals */}
      {filteredBrands.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-black mb-3">Totales por Marca</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredBrands.map((b) => (
              <Card key={b.brand}>
                <CardContent className="p-4">
                  <p className="font-semibold text-black text-sm">{b.brand}</p>
                  <p className="text-black text-xs mt-1">
                    Latas: {fmtQty(b.latas)}
                  </p>
                  <p className="text-black text-xs">
                    Litros: {fmtQty(b.litros)}
                  </p>
                  <p className="text-amber-600 font-bold text-sm mt-1">
                    {fmtCurrency(b.revenue)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
