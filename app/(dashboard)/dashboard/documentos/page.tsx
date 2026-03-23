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
      contact_name?: string | null;
      cuit: string | null;
      address: string;
      locality?: string;
      province?: string;
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
    payment_condition?: string;
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

  const isRemito = doc.type === "remito";

  return (
    <div className="space-y-4 text-sm">
      {/* Header */}
      <div className="flex justify-between border p-3">
        <div>
          <p className="text-lg font-bold text-black">BUENAS MALTAS S.A.S</p>
          <p className="text-xs text-black">CUIT: 30-71630332-9</p>
          <p className="text-xs text-black">Ruta Nacional 19 km 313 - Monte Cristo</p>
          <p className="text-xs text-black">Córdoba - 5125</p>
          <p className="text-xs text-black">info@traumerbier.com.ar</p>
          <p className="text-xs font-bold text-black mt-1">IVA RESPONSABLE INSCRIPTO</p>
        </div>
        <div className="text-right border-l pl-4">
          <span className="text-2xl font-bold">{isRemito ? "R" : "A"}</span>
          <p className="font-bold text-lg">{TYPE_LABELS[doc.type]}</p>
          <p className="text-black">N° 0002 - {(doc.number || "").replace(/[A-Z]+-/, "").padStart(8, "0")}</p>
          <p className="text-black mt-1">
            Fecha: {new Date(data.date).toLocaleDateString("es-AR")}
          </p>
        </div>
      </div>

      {/* Customer */}
      <div className="border p-3 space-y-1">
        <p className="text-xs font-bold text-black">Señor/es:</p>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          <span className="font-bold text-black">RAZON SOCIAL</span>
          <span className="text-black">: {data.customer.name}</span>
          <span className="font-bold text-black">DOMICILIO</span>
          <span className="text-black">: {data.customer.address} {data.customer.province || "Córdoba"}</span>
          <span className="font-bold text-black">CUIT</span>
          <span className="text-black">: {data.customer.cuit || "-"}</span>
          <span className="font-bold text-black">COND. IVA</span>
          <span className="text-black">
            : {data.customer.iva_condition || "-"}
            <span className="float-right font-bold">{data.payment_condition || "CONTADO"}</span>
          </span>
        </div>
      </div>

      {/* Items */}
      <div>
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100 text-left text-black text-xs border-b">
              <th className="p-2 border-r">Artículo</th>
              <th className="p-2 border-r">Descripción</th>
              <th className="p-2 text-right">Cantidad</th>
              {!isRemito && <th className="p-2 text-right border-l">P. Unit.</th>}
              {!isRemito && <th className="p-2 text-right border-l">Subtotal</th>}
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className="border-b">
                <td className="p-2 text-black border-r">{item.code}</td>
                <td className="p-2 text-black border-r">{item.name}</td>
                <td className="p-2 text-right text-black">{item.quantity.toFixed(2)}</td>
                {!isRemito && (
                  <td className="p-2 text-right text-black border-l">
                    ${item.unit_price.toLocaleString("es-AR")}
                  </td>
                )}
                {!isRemito && (
                  <td className="p-2 text-right font-medium text-black border-l">
                    ${item.subtotal.toLocaleString("es-AR")}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals (only for non-remito) */}
      {!isRemito && (
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
      )}

      {/* Remito-specific sections */}
      {isRemito && (
        <>
          {/* Brands */}
          <div className="flex justify-around py-2 text-xs font-bold text-gray-500">
            <span>TRÄUMER BIER</span>
            <span>VITEA KOMBUCHA</span>
            <span>BEERMUT</span>
            <span>MIXOLOGY</span>
          </div>

          {/* Transport & Signatures */}
          <div className="border">
            <div className="bg-gray-50 p-2 border-b">
              <p className="font-bold text-xs text-black">Datos del transportista:</p>
            </div>
            <div className="grid grid-cols-3 divide-x min-h-[60px]">
              <div className="p-2">
                <p className="font-bold text-xs text-black">Preparó:</p>
              </div>
              <div className="p-2">
                <p className="font-bold text-xs text-black">Entregó:</p>
              </div>
              <div className="p-2">
                <p className="font-bold text-xs text-black">Recibí conforme:</p>
                <p className="text-center text-xs text-black mt-6">Firma y sello</p>
              </div>
            </div>
          </div>

          {/* Observations */}
          <div className="border p-2 min-h-[40px]">
            <p className="font-bold text-xs text-black">Observaciones:</p>
          </div>
        </>
      )}
    </div>
  );
}

async function downloadDoc(doc: DocDetail) {
  const data = doc.data;
  if (!data) return;

  // Use specific PDF generator for remitos
  if (doc.type === "remito") {
    const { generateRemitoPDF } = await import("@/components/documentos/remito-pdf");
    generateRemitoPDF({
      number: doc.number,
      date: data.date,
      customer: data.customer,
      items: data.items,
      subtotal: data.subtotal,
      discount: data.discount,
      total: data.total,
      order_number: data.order_number,
      payment_condition: data.payment_condition,
    });
    return;
  }

  // Generic PDF for other document types (presupuesto, orden_venta, factura)
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const { COMPANY } = await import("@/lib/constants/company");

  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 12;
  const rightCol = pageWidth - margin;

  // Header border
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.5);
  pdf.rect(margin, 10, pageWidth - margin * 2, 35);

  // Company logo text
  pdf.rect(margin, 10, 45, 35, "S");
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0);
  pdf.text("BUENAS", margin + 5, 22);
  pdf.text("MALTAS", margin + 5, 29);

  // Company details
  const companyX = margin + 48;
  pdf.setFontSize(9);
  pdf.text(COMPANY.name, companyX, 16);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text(`Cuit: ${COMPANY.cuit}`, companyX, 20);
  pdf.text(COMPANY.address, companyX, 24);
  pdf.text(`${COMPANY.locality} - ${COMPANY.postalCode}`, companyX, 28);
  pdf.text(COMPANY.email, companyX, 32);
  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "bold");
  pdf.text(COMPANY.ivaCondition, companyX, 38);

  // Document type (right)
  const typeBoxX = pageWidth - margin - 50;
  pdf.rect(typeBoxX, 10, 50, 35);

  const typeCode: Record<string, string> = {
    presupuesto: "X", orden_venta: "X", factura: "A",
  };
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text(typeCode[doc.type] || "X", typeBoxX - 10, 20);

  pdf.setFontSize(14);
  pdf.text(TYPE_LABELS[doc.type], typeBoxX + 10, 18);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(`N° ${COMPANY.puntoVenta} - ${(doc.number || "").replace(/[A-Z]+-/, "").padStart(8, "0")}`, typeBoxX + 5, 25);

  const dateObj = new Date(data.date);
  pdf.setFontSize(8);
  pdf.text(`Fecha: ${dateObj.toLocaleDateString("es-AR")}`, typeBoxX + 5, 32);

  // Client section
  const clientY = 50;
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.3);
  pdf.rect(margin, clientY, pageWidth - margin * 2, 27);

  pdf.setFontSize(8);
  let cy = clientY + 5;
  pdf.setFont("helvetica", "bold");
  pdf.text("Señor/es:", margin + 3, cy);
  cy += 5;
  pdf.text("RAZON SOCIAL", margin + 3, cy);
  pdf.setFont("helvetica", "normal");
  pdf.text(`: ${data.customer.name}`, margin + 35, cy);
  cy += 5;
  pdf.setFont("helvetica", "bold");
  pdf.text("DOMICILIO", margin + 3, cy);
  pdf.setFont("helvetica", "normal");
  pdf.text(`: ${data.customer.address}`, margin + 35, cy);
  pdf.text(data.customer.province || "Córdoba", rightCol - 30, cy);
  cy += 5;
  pdf.setFont("helvetica", "bold");
  pdf.text("CUIT", margin + 3, cy);
  pdf.setFont("helvetica", "normal");
  pdf.text(`: ${data.customer.cuit || "-"}`, margin + 35, cy);
  cy += 5;
  pdf.setFont("helvetica", "bold");
  pdf.text("COND. IVA", margin + 3, cy);
  pdf.setFont("helvetica", "normal");
  pdf.text(`: ${data.customer.iva_condition || "-"}`, margin + 35, cy);
  pdf.setFont("helvetica", "bold");
  pdf.text(data.payment_condition || "CONTADO", rightCol - 30, cy);

  // Items table
  const tableStartY = clientY + 32;
  autoTable(pdf, {
    startY: tableStartY,
    head: [["Código", "Producto", "Cant.", "P. Unit.", "Subtotal"]],
    body: data.items.map((item) => [
      item.code,
      item.name,
      String(item.quantity),
      `$${item.unit_price.toLocaleString("es-AR")}`,
      `$${item.subtotal.toLocaleString("es-AR")}`,
    ]),
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 9,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    bodyStyles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
    margin: { left: margin, right: margin },
    theme: "grid",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (pdf as any).lastAutoTable?.finalY ?? tableStartY + 40;
  let totY = finalY + 10;

  pdf.setFontSize(10);
  pdf.setTextColor(0);
  pdf.setFont("helvetica", "normal");
  pdf.text("Subtotal:", 150, totY);
  pdf.text(`$${data.subtotal.toLocaleString("es-AR")}`, rightCol, totY, { align: "right" });
  totY += 6;

  if (data.discount > 0) {
    pdf.setTextColor(200, 50, 50);
    pdf.text("Descuento:", 150, totY);
    pdf.text(`-${data.discount}%`, rightCol, totY, { align: "right" });
    totY += 6;
  }

  pdf.setDrawColor(0);
  pdf.line(150, totY, rightCol, totY);
  totY += 6;
  pdf.setFontSize(12);
  pdf.setTextColor(0);
  pdf.setFont("helvetica", "bold");
  pdf.text("TOTAL:", 150, totY);
  pdf.text(`$${data.total.toLocaleString("es-AR")}`, rightCol, totY, { align: "right" });

  // Footer
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(150);
  pdf.text("Documento generado por Buenas Maltas - Sistema de Gestión", pageWidth / 2, 285, { align: "center" });

  pdf.save(`${TYPE_LABELS[doc.type]}_${doc.number ?? doc.id}.pdf`);
}
