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

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("dashboard");
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">Analytics</h1>
        <div className="flex items-center gap-2">
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

      {activeTab === "dashboard" && <DashboardTab />}
      {activeTab === "productos" && <ProductosTab />}
      {activeTab === "clientes" && <ClientesTab />}
      {activeTab === "canales" && <CanalesTab />}
      {activeTab === "vendedores" && <VendedoresTab />}
      {activeTab === "descuentos" && <DescuentosTab />}
      {activeTab === "logistica" && <LogisticaTab />}
      {activeTab === "reportes" && <ReportesTab />}
    </div>
  );
}
