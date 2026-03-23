"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PedidosTable } from "@/components/pedidos/pedidos-table";
import { DocumentoGenerator } from "@/components/pedidos/documento-generator";

export default function PedidosPage() {
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleGenerateDocuments = useCallback((orderIds: string[]) => {
    setSelectedOrderIds(orderIds);
    setGeneratorOpen(true);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-black">Pedidos</h1>
        <Link href="/dashboard/pedidos/nuevo">
          <Button className="bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="w-4 h-4" /> Nuevo Pedido
          </Button>
        </Link>
      </div>

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
