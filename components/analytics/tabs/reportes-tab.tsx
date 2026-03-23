"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, FileDown } from "lucide-react";
import { Loading } from "@/components/analytics/shared/loading";
import { exportTableToPDF } from "@/components/analytics/pdf-export";

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

const REPORT_TABS = [
  { id: "clientes", label: "Ventas por Cliente" },
  { id: "productos", label: "Productos" },
  { id: "entregas", label: "Entregas" },
  { id: "documentos", label: "Documentos" },
] as const;

type ReportTab = (typeof REPORT_TABS)[number]["id"];

const fmt = (n: number) => `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;

function ReportTable({ title, onExport, columns, rows, footer }: {
  title: string; onExport: () => void;
  columns: string[]; rows: (string | number)[][]; footer?: (string | number)[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button variant="outline" size="sm" onClick={onExport}><FileDown className="w-4 h-4 mr-1" /> Exportar PDF</Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-gray-50">
              {columns.map((col, i) => <th key={col} className={`p-3 font-medium text-black ${i > 1 ? "text-right" : "text-left"}`}>{col}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b hover:bg-amber-50">
                  {row.map((cell, ci) => <td key={ci} className={`p-3 text-black ${ci > 1 ? "text-right" : ""} ${ci === 0 ? "font-medium" : ""}`}>{cell}</td>)}
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={columns.length} className="p-6 text-center text-black">Sin datos</td></tr>}
            </tbody>
            {footer && (
              <tfoot><tr className="bg-amber-50 font-bold">
                {footer.map((cell, i) => <td key={i} className={`p-3 text-black ${i > 1 ? "text-right" : ""}`}>{cell}</td>)}
              </tr></tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportesTab({ origin = "all" }: { origin?: string }) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportTab, setReportTab] = useState<ReportTab>("clientes");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterLocality, setFilterLocality] = useState("");

  const fetchReports = () => {
    setReportLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (origin !== "all") params.set("origin", origin);
    fetch(`/api/analytics/reports?${params}`)
      .then((r) => r.json())
      .then((d) => { setReportData(d); setReportLoading(false); })
      .catch(() => setReportLoading(false));
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin]);

  const filteredCustomers = useMemo(() => {
    if (!reportData) return [];
    return reportData.customerReport.filter((c) => {
      if (filterCustomer && c.name !== filterCustomer) return false;
      if (filterLocality && c.locality !== filterLocality) return false;
      return true;
    });
  }, [reportData, filterCustomer, filterLocality]);

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
      rows: [...filteredCustomers.map((c) => [c.name, c.locality, c.orders, fmt(c.total), fmt(c.avgTicket)]), ["TOTAL", "", totalPedidos, fmt(totalVentas), ""]],
      filters: activeFilters, filename: "ventas-por-cliente.pdf",
    });
  };

  const exportProducts = () => {
    if (!reportData) return;
    const totalRev = reportData.productReport.reduce((s, p) => s + p.revenue, 0);
    exportTableToPDF({
      title: "Reporte de Productos",
      columns: ["Producto", "Código", "Cantidad", "Ingresos", "Precio Prom."],
      rows: [...reportData.productReport.map((p) => [p.name, p.code, p.quantity.toFixed(1), fmt(p.revenue), fmt(p.avgPrice)]), ["TOTAL", "", "", fmt(totalRev), ""]],
      filters: activeFilters, filename: "reporte-productos.pdf",
    });
  };

  const exportRoutes = () => {
    if (!reportData) return;
    exportTableToPDF({
      title: "Reporte de Entregas",
      columns: ["Ruta", "Fecha", "Chofer", "Estado", "Paradas", "Entreg.", "No Entreg.", "Tasa", "Dist (km)", "Costo"],
      rows: reportData.routeReport.map((r) => [r.routeCode, r.date, r.driver, r.status, r.stops, r.delivered, r.notDelivered, `${r.successRate.toFixed(0)}%`, r.distanceKm.toFixed(1), fmt(r.cost)]),
      filters: activeFilters, filename: "reporte-entregas.pdf",
    });
  };

  const exportDocuments = () => {
    if (!reportData) return;
    exportTableToPDF({
      title: "Reporte de Documentos",
      columns: ["Tipo", "Total", "Emitidos", "Anulados", "Borradores"],
      rows: reportData.documentReport.map((d) => [d.type.charAt(0).toUpperCase() + d.type.slice(1).replace("_", " "), d.total, d.emitidos, d.anulados, d.borradores]),
      filters: activeFilters, filename: "reporte-documentos.pdf", orientation: "portrait",
    });
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div><label className="block text-xs font-medium text-black mb-1">Desde</label><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm text-black" /></div>
            <div><label className="block text-xs font-medium text-black mb-1">Hasta</label><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm text-black" /></div>
            <div><label className="block text-xs font-medium text-black mb-1">Cliente</label>
              <select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm text-black min-w-[180px]">
                <option value="">Todos</option>{reportData?.filters.customers.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-black mb-1">Localidad</label>
              <select value={filterLocality} onChange={(e) => setFilterLocality(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm text-black min-w-[150px]">
                <option value="">Todas</option>{reportData?.filters.localities.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <Button onClick={fetchReports} className="bg-amber-600 hover:bg-amber-700 text-white"><Filter className="w-4 h-4 mr-1" /> Filtrar</Button>
            {(dateFrom || dateTo || filterCustomer || filterLocality) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); setFilterCustomer(""); setFilterLocality(""); }} className="text-sm text-amber-600 hover:underline">Limpiar filtros</button>
            )}
          </div>
        </CardContent>
      </Card>

      {reportLoading ? <Loading /> : reportData ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{reportData.summary.totalOrders}</p><p className="text-xs text-black">Pedidos</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{fmt(reportData.summary.totalSales)}</p><p className="text-xs text-black">Ventas</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{reportData.summary.totalRoutes}</p><p className="text-xs text-black">Rutas</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-purple-600">{reportData.summary.deliveryRate.toFixed(0)}%</p><p className="text-xs text-black">Tasa de Entrega</p></CardContent></Card>
          </div>

          <div className="flex border-b border-gray-200 overflow-x-auto">
            {REPORT_TABS.map((tab) => (
              <button key={tab.id} onClick={() => setReportTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${reportTab === tab.id ? "border-amber-600 text-amber-600" : "border-transparent text-black hover:text-amber-600"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {reportTab === "clientes" && <ReportTable title="Ventas por Cliente" onExport={exportCustomers}
            columns={["Cliente", "Localidad", "Pedidos", "Total", "Ticket Prom."]}
            rows={filteredCustomers.map((c) => [c.name, c.locality, c.orders, fmt(c.total), fmt(c.avgTicket)])}
            footer={filteredCustomers.length > 0 ? ["TOTAL", "", filteredCustomers.reduce((s, c) => s + c.orders, 0), fmt(filteredCustomers.reduce((s, c) => s + c.total, 0)), ""] : undefined}
          />}

          {reportTab === "productos" && <ReportTable title="Productos" onExport={exportProducts}
            columns={["Producto", "Código", "Cantidad", "Ingresos", "Precio Prom."]}
            rows={reportData.productReport.map((p) => [p.name, p.code, p.quantity.toFixed(1), fmt(p.revenue), fmt(p.avgPrice)])}
          />}

          {reportTab === "entregas" && <ReportTable title="Entregas por Ruta" onExport={exportRoutes}
            columns={["Ruta", "Fecha", "Chofer", "Estado", "Paradas", "Entreg.", "No Entreg.", "Tasa", "Dist (km)", "Costo"]}
            rows={reportData.routeReport.map((r) => [r.routeCode, r.date, r.driver, r.status, r.stops, r.delivered, r.notDelivered, `${r.successRate.toFixed(0)}%`, r.distanceKm.toFixed(1), fmt(r.cost)])}
          />}

          {reportTab === "documentos" && <ReportTable title="Documentos" onExport={exportDocuments}
            columns={["Tipo", "Total", "Emitidos", "Anulados", "Borradores"]}
            rows={reportData.documentReport.map((d) => [d.type.charAt(0).toUpperCase() + d.type.slice(1).replace("_", " "), d.total, d.emitidos, d.anulados, d.borradores])}
          />}
        </>
      ) : <div className="text-center py-10 text-black">Error al cargar reportes</div>}
    </>
  );
}
