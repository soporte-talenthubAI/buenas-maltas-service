"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Download,
  X,
} from "lucide-react";
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

interface DocDetail {
  id: string;
  type: string;
  number: string | null;
  status: string;
  created_at: string;
  data: {
    order_number: string;
    customer: {
      name: string;
      cuit: string | null;
      address: string;
      iva_condition: string | null;
    };
    items: {
      code: string;
      name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }[];
    subtotal: number;
    discount: number;
    total: number;
    date: string;
  } | null;
  order: {
    order_number: string;
    customer: { commercial_name: string; cuit: string | null };
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [preview, setPreview] = useState<DocDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", "20");

    const res = await fetch(`/api/documentos?${params}`);
    const data = await res.json();
    setDocs(data.documents);
    setTotalPages(data.totalPages);
    setLoading(false);
  }, [typeFilter, search, page]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const openPreview = async (docId: string) => {
    setPreviewLoading(true);
    setPreview(null);
    const res = await fetch(`/api/documentos/${docId}`);
    const data = await res.json();
    setPreview(data);
    setPreviewLoading(false);
  };

  const handleDownload = async (docId: string) => {
    const res = await fetch(`/api/documentos/${docId}`);
    const data: DocDetail = await res.json();
    downloadDoc(data);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-black mb-6">Documentos</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Historial de Documentos
            </CardTitle>
          </div>
          <div className="flex gap-3 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Buscar por N° pedido, N° documento o cliente..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
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
            <p className="text-black text-center py-12">
              {search
                ? "No se encontraron documentos con ese criterio."
                : "No hay documentos generados. Generá documentos desde la sección de Pedidos."}
            </p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-black">
                    <th className="pb-3">Número</th>
                    <th className="pb-3">Tipo</th>
                    <th className="pb-3">Pedido</th>
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3">Fecha</th>
                    <th className="pb-3 text-right">Acciones</th>
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
                              : doc.status === "anulado"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-black"
                          )}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3 text-black">
                        {new Date(doc.created_at).toLocaleDateString("es-AR")}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPreview(doc.id)}
                            title="Previsualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(doc.id)}
                            title="Descargar"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-black">
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

      {/* Preview Modal */}
      {(preview || previewLoading) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {previewLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
              </div>
            ) : preview ? (
              <>
                <div className="flex items-center justify-between p-4 border-b">
                  <div>
                    <h2 className="text-lg font-bold">
                      {TYPE_LABELS[preview.type]} {preview.number}
                    </h2>
                    <p className="text-sm text-black">
                      Pedido: {preview.order.order_number}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadDoc(preview)}
                    >
                      <Download className="w-4 h-4" />
                      Descargar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPreview(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  <DocumentPreview doc={preview} />
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentPreview({ doc }: { doc: DocDetail }) {
  const data = doc.data;
  if (!data) {
    return (
      <p className="text-black">
        Sin datos de previsualización disponibles.
      </p>
    );
  }

  return (
    <div className="space-y-6 text-sm">
      {/* Header */}
      <div className="flex justify-between">
        <div>
          <p className="text-xl font-bold text-amber-700">Buenas Maltas</p>
          <p className="text-black">Cervecería Artesanal</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">{TYPE_LABELS[doc.type]}</p>
          <p className="text-black">N° {doc.number}</p>
          <p className="text-black">
            {new Date(data.date).toLocaleDateString("es-AR")}
          </p>
        </div>
      </div>

      <hr />

      {/* Customer */}
      <div>
        <p className="text-xs text-black uppercase tracking-wider mb-1">
          Cliente
        </p>
        <p className="font-medium">{data.customer.name}</p>
        {data.customer.cuit && (
          <p className="text-black">CUIT: {data.customer.cuit}</p>
        )}
        <p className="text-black">{data.customer.address}</p>
        {data.customer.iva_condition && (
          <p className="text-black">IVA: {data.customer.iva_condition}</p>
        )}
      </div>

      {/* Items */}
      <div>
        <p className="text-xs text-black uppercase tracking-wider mb-2">
          Detalle
        </p>
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-black text-xs">
              <th className="pb-2">Código</th>
              <th className="pb-2">Producto</th>
              <th className="pb-2 text-right">Cant.</th>
              <th className="pb-2 text-right">P. Unit.</th>
              <th className="pb-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className="border-b">
                <td className="py-2 text-black">{item.code}</td>
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">
                  ${item.unit_price.toLocaleString("es-AR")}
                </td>
                <td className="py-2 text-right font-medium">
                  ${item.subtotal.toLocaleString("es-AR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-48 space-y-1">
          <div className="flex justify-between">
            <span className="text-black">Subtotal:</span>
            <span>${data.subtotal.toLocaleString("es-AR")}</span>
          </div>
          {data.discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Descuento:</span>
              <span>-{data.discount}%</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t pt-1">
            <span>Total:</span>
            <span>${data.total.toLocaleString("es-AR")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

async function downloadDoc(doc: DocDetail) {
  const data = doc.data;
  if (!data) return;

  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const pdf = new jsPDF();

  // Header - Brand
  pdf.setFontSize(20);
  pdf.setTextColor(180, 100, 0);
  pdf.text("Buenas Maltas", 14, 22);
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text("Cervecería Artesanal", 14, 28);

  // Header - Document type
  pdf.setFontSize(16);
  pdf.setTextColor(40);
  pdf.text(TYPE_LABELS[doc.type], 196, 18, { align: "right" });
  pdf.setFontSize(10);
  pdf.setTextColor(80);
  pdf.text(`N° ${doc.number}`, 196, 24, { align: "right" });
  pdf.text(new Date(data.date).toLocaleDateString("es-AR"), 196, 30, {
    align: "right",
  });
  pdf.text(`Pedido: ${data.order_number}`, 196, 36, { align: "right" });

  // Separator
  pdf.setDrawColor(200);
  pdf.line(14, 42, 196, 42);

  // Customer
  let y = 50;
  pdf.setFontSize(8);
  pdf.setTextColor(140);
  pdf.text("CLIENTE", 14, y);
  y += 6;
  pdf.setFontSize(11);
  pdf.setTextColor(40);
  pdf.text(data.customer.name, 14, y);
  y += 5;
  pdf.setFontSize(9);
  pdf.setTextColor(80);
  if (data.customer.cuit) {
    pdf.text(`CUIT: ${data.customer.cuit}`, 14, y);
    y += 5;
  }
  pdf.text(data.customer.address, 14, y);
  y += 5;
  if (data.customer.iva_condition) {
    pdf.text(`IVA: ${data.customer.iva_condition}`, 14, y);
    y += 5;
  }

  // Items table
  y += 5;
  autoTable(pdf, {
    startY: y,
    head: [["Código", "Producto", "Cant.", "P. Unit.", "Subtotal"]],
    body: data.items.map((item) => [
      item.code,
      item.name,
      String(item.quantity),
      `$${item.unit_price.toLocaleString("es-AR")}`,
      `$${item.subtotal.toLocaleString("es-AR")}`,
    ]),
    headStyles: {
      fillColor: [180, 100, 0],
      textColor: 255,
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  // Totals
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (pdf as any).lastAutoTable?.finalY ?? y + 40;
  let totY = finalY + 10;

  pdf.setFontSize(10);
  pdf.setTextColor(80);
  pdf.text("Subtotal:", 150, totY);
  pdf.text(`$${data.subtotal.toLocaleString("es-AR")}`, 196, totY, {
    align: "right",
  });
  totY += 6;

  if (data.discount > 0) {
    pdf.setTextColor(200, 50, 50);
    pdf.text("Descuento:", 150, totY);
    pdf.text(`-${data.discount}%`, 196, totY, { align: "right" });
    totY += 6;
  }

  pdf.setDrawColor(200);
  pdf.line(150, totY, 196, totY);
  totY += 6;
  pdf.setFontSize(12);
  pdf.setTextColor(40);
  pdf.setFont("helvetica", "bold");
  pdf.text("TOTAL:", 150, totY);
  pdf.text(`$${data.total.toLocaleString("es-AR")}`, 196, totY, {
    align: "right",
  });

  // Footer
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(160);
  pdf.text(
    "Documento generado por Buenas Maltas - Sistema de Gestión",
    105,
    285,
    { align: "center" }
  );

  pdf.save(`${TYPE_LABELS[doc.type]}_${doc.number ?? doc.id}.pdf`);
}
