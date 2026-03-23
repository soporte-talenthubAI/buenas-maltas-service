"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Truck,
  Table2,
  MessageSquare,
  Package,
  Users,
  Store,
  UserCheck,
  Percent,
  Upload,
  FileSpreadsheet,
  Database,
} from "lucide-react";
import { ExcelImportModal } from "@/components/analytics/excel-import-modal";
import { DashboardTab } from "@/components/analytics/tabs/dashboard-tab";
import { LogisticaTab } from "@/components/analytics/tabs/logistica-tab";
import { ReportesTab } from "@/components/analytics/tabs/reportes-tab";
import { ProductosTab } from "@/components/analytics/tabs/productos-tab";
import { ClientesTab } from "@/components/analytics/tabs/clientes-tab";
import { CanalesTab } from "@/components/analytics/tabs/canales-tab";
import { VendedoresTab } from "@/components/analytics/tabs/vendedores-tab";
import { DescuentosTab } from "@/components/analytics/tabs/descuentos-tab";

type MainTab = "dashboard" | "productos" | "clientes" | "canales" | "vendedores" | "descuentos" | "logistica" | "reportes";
type DataOrigin = "all" | "excel_import" | "tango";

const tabs: { id: MainTab; label: string; icon: typeof BarChart3 }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "productos", label: "Productos", icon: Package },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "canales", label: "Canales", icon: Store },
  { id: "vendedores", label: "Vendedores", icon: UserCheck },
  { id: "descuentos", label: "Descuentos", icon: Percent },
  { id: "logistica", label: "Logística", icon: Truck },
  { id: "reportes", label: "Reportes", icon: Table2 },
];

const originOptions: { id: DataOrigin; label: string; icon: typeof Database }[] = [
  { id: "all", label: "Todos", icon: Database },
  { id: "excel_import", label: "Excel", icon: FileSpreadsheet },
  { id: "tango", label: "Tango", icon: Database },
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("dashboard");
  const [showImport, setShowImport] = useState(false);
  const [origin, setOrigin] = useState<DataOrigin>("all");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-black">Analytics</h1>
        <div className="flex items-center gap-2">
          {/* Origin filter */}
          <div className="flex rounded-md border border-gray-300 overflow-hidden">
            {originOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setOrigin(opt.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                  origin === opt.id
                    ? "bg-amber-500 text-white"
                    : "bg-white text-black hover:bg-gray-50"
                }`}
              >
                <opt.icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4" /> Importar Excel
          </Button>
          <Link href="/dashboard/analytics/chat">
            <Button variant="outline"><MessageSquare className="w-4 h-4" /> Chat IA</Button>
          </Link>
        </div>
      </div>

      <ExcelImportModal open={showImport} onClose={() => setShowImport(false)} />

      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? "border-amber-600 text-amber-600" : "border-transparent text-black hover:text-amber-600"}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && <DashboardTab origin={origin} />}
      {activeTab === "productos" && <ProductosTab origin={origin} />}
      {activeTab === "clientes" && <ClientesTab origin={origin} />}
      {activeTab === "canales" && <CanalesTab origin={origin} />}
      {activeTab === "vendedores" && <VendedoresTab origin={origin} />}
      {activeTab === "descuentos" && <DescuentosTab origin={origin} />}
      {activeTab === "logistica" && <LogisticaTab />}
      {activeTab === "reportes" && <ReportesTab origin={origin} />}
    </div>
  );
}
