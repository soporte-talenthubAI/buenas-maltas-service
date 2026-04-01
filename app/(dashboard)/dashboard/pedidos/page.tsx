"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PedidosTable } from "@/components/pedidos/pedidos-table";
import { DocumentoGenerator } from "@/components/pedidos/documento-generator";

export default function PedidosPage() {
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleGenerateDocuments = useCallback((orderIds: string[]) => {
    setSelectedOrderIds(orderIds);
    setGeneratorOpen(true);
  }, []);

  const handleSyncTango = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      // First sync customers so we can link pedidos
      await fetch("/api/tango/sync-clientes", { method: "POST" });
      const res = await fetch("/api/tango/sync-pedidos", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        setSyncResult(`Error: ${data.error}`);
        return;
      }

      let msg = `Pedidos: ${data.created} creados, ${data.skippedExisting} existentes (de ${data.totalFromTango})`;

      // Now sync line items for orders without items
      try {
        const itemsRes = await fetch("/api/tango/sync-pedido-items?limit=200", { method: "POST" });
        const itemsData = await itemsRes.json();
        if (itemsData.success && itemsData.itemsCreated > 0) {
          msg += ` | Items: ${itemsData.itemsCreated} creados en ${itemsData.processed} pedidos`;
        }
      } catch {
        // Items sync is optional, don't fail the whole operation
      }

      setSyncResult(msg);
      setRefreshKey((k) => k + 1);
    } catch {
      setSyncResult("Error de conexión con Tango");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-black">Pedidos</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSyncTango} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Sincronizar Tango
          </Button>
          <Link href="/dashboard/pedidos/nuevo">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="w-4 h-4" /> Nuevo Pedido
            </Button>
          </Link>
        </div>
      </div>

      {syncResult && (
        <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${syncResult.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {syncResult}
          <button onClick={() => setSyncResult(null)} className="ml-2 underline">cerrar</button>
        </div>
      )}

      <PedidosTable
        key={refreshKey}
        onGenerateDocuments={handleGenerateDocuments}
      />

      {generatorOpen && (
        <DocumentoGenerator
          orderIds={selectedOrderIds}
          onClose={() => setGeneratorOpen(false)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
