"use client";

import { useState, useCallback } from "react";
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pedidos</h1>

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
