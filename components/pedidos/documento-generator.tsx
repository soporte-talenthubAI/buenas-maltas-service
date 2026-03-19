"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2, CheckCircle, XCircle } from "lucide-react";

const DOC_TYPES = [
  { value: "presupuesto", label: "Presupuesto" },
  { value: "orden_venta", label: "Orden de Venta" },
  { value: "remito", label: "Remito" },
  { value: "factura", label: "Factura" },
] as const;

interface DocumentoGeneratorProps {
  orderIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function DocumentoGenerator({
  orderIds,
  onClose,
  onSuccess,
}: DocumentoGeneratorProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    { orderId: string; success: boolean; error?: string }[] | null
  >(null);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const selectAll = () => {
    setSelectedTypes(DOC_TYPES.map((d) => d.value));
  };

  const handleGenerate = async () => {
    if (!selectedTypes.length) return;
    setLoading(true);

    try {
      if (orderIds.length === 1) {
        const res = await fetch("/api/documentos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: orderIds[0], types: selectedTypes }),
        });
        const data = await res.json();
        if (res.ok) {
          setResults([
            { orderId: orderIds[0], success: true },
          ]);
        } else {
          setResults([
            { orderId: orderIds[0], success: false, error: data.error },
          ]);
        }
      } else {
        const res = await fetch("/api/documentos/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderIds, types: selectedTypes }),
        });
        const data = await res.json();
        setResults(data.results);
      }
    } catch {
      setResults([{ orderId: "error", success: false, error: "Error de red" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generar Documentos
          </CardTitle>
          <p className="text-sm text-black">
            {orderIds.length} pedido{orderIds.length > 1 ? "s" : ""}{" "}
            seleccionado{orderIds.length > 1 ? "s" : ""}
          </p>
        </CardHeader>
        <CardContent>
          {!results ? (
            <>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Tipos de documento:</p>
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Todos
                  </Button>
                </div>
                {DOC_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type.value)}
                      onChange={() => toggleType(type.value)}
                      className="w-4 h-4 accent-amber-600"
                    />
                    <span className="text-sm">{type.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!selectedTypes.length || loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Generar"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
                  >
                    {r.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-sm">
                      {r.success
                        ? "Documentos generados correctamente"
                        : r.error}
                    </span>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="w-full"
              >
                Cerrar
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
