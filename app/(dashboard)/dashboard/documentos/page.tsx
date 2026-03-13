"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface DocRecord {
  id: string;
  type: string;
  number: string | null;
  status: string;
  created_at: string;
  order: {
    order_number: string;
    customer: { commercial_name: string };
  };
}

const TYPE_LABELS: Record<string, string> = {
  presupuesto: "Presupuesto",
  orden_venta: "Orden de Venta",
  remito: "Remito",
  factura: "Factura",
};

const TYPE_COLORS: Record<string, string> = {
  presupuesto: "bg-blue-100 text-blue-800",
  orden_venta: "bg-indigo-100 text-indigo-800",
  remito: "bg-amber-100 text-amber-800",
  factura: "bg-green-100 text-green-800",
};

export default function DocumentosPage() {
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    params.set("page", String(page));
    params.set("limit", "20");

    const res = await fetch(`/api/documentos?${params}`);
    const data = await res.json();
    setDocs(data.documents);
    setTotalPages(data.totalPages);
    setLoading(false);
  }, [typeFilter, page]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Documentos</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Historial de Documentos
            </CardTitle>
          </div>
          <div className="flex gap-3 mt-3">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-gray-300 px-3 text-sm"
            >
              <option value="">Todos los tipos</option>
              <option value="presupuesto">Presupuesto</option>
              <option value="orden_venta">Orden de Venta</option>
              <option value="remito">Remito</option>
              <option value="factura">Factura</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            </div>
          ) : docs.length === 0 ? (
            <p className="text-gray-500 text-center py-12">
              No hay documentos generados. Generá documentos desde la sección de
              Pedidos.
            </p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3">Número</th>
                    <th className="pb-3">Tipo</th>
                    <th className="pb-3">Pedido</th>
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc) => (
                    <tr key={doc.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 font-medium">{doc.number ?? "-"}</td>
                      <td className="py-3">
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            TYPE_COLORS[doc.type]
                          )}
                        >
                          {TYPE_LABELS[doc.type]}
                        </span>
                      </td>
                      <td className="py-3">{doc.order.order_number}</td>
                      <td className="py-3">
                        {doc.order.customer.commercial_name}
                      </td>
                      <td className="py-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs capitalize",
                            doc.status === "emitido"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          )}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">
                        {new Date(doc.created_at).toLocaleDateString("es-AR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Página {page} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
