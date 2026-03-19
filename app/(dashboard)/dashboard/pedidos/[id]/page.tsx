import { notFound } from "next/navigation";
import Link from "next/link";
import { pedidosService } from "@/lib/services/pedidos.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, User, FileText } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  confirmado: "bg-blue-100 text-blue-800",
  documentado: "bg-green-100 text-green-800",
  en_ruta: "bg-purple-100 text-purple-800",
  entregado: "bg-gray-100 text-black",
  cancelado: "bg-red-100 text-red-800",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  presupuesto: "Presupuesto",
  orden_venta: "Orden de Venta",
  remito: "Remito",
  factura: "Factura",
};

export default async function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await pedidosService.findById(id);

  if (!order) notFound();

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/pedidos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-black">
            {order.order_number}
          </h1>
          <span
            className={cn(
              "px-2 py-1 rounded-full text-xs font-medium capitalize",
              STATUS_COLORS[order.status]
            )}
          >
            {order.status.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{order.customer.commercial_name}</p>
            {order.customer.cuit && <p>CUIT: {order.customer.cuit}</p>}
            <p className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {order.customer.street} {order.customer.street_number},{" "}
              {order.customer.locality}
            </p>
            {order.customer.phone && <p>Tel: {order.customer.phone}</p>}
            {order.customer.iva_condition && (
              <p>IVA: {order.customer.iva_condition}</p>
            )}
          </CardContent>
        </Card>

        {/* Order info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalle del Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-black">Fecha pedido:</span>
              <span>
                {new Date(order.order_date).toLocaleDateString("es-AR")}
              </span>
            </div>
            {order.delivery_date && (
              <div className="flex justify-between">
                <span className="text-black">Fecha entrega:</span>
                <span>
                  {new Date(order.delivery_date).toLocaleDateString("es-AR")}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-black">Prioridad:</span>
              <span className="capitalize">{order.priority}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black">Creado por:</span>
              <span>{order.created_by.name}</span>
            </div>
            {order.observations && (
              <div className="pt-2 border-t">
                <span className="text-black">Observaciones:</span>
                <p className="mt-1">{order.observations}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Totales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-black">Subtotal:</span>
              <span>${Number(order.subtotal).toLocaleString("es-AR")}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between">
                <span className="text-black">Descuento:</span>
                <span>{Number(order.discount)}%</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>${Number(order.total).toLocaleString("es-AR")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            Items ({order.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-black">
                <th className="pb-2">Código</th>
                <th className="pb-2">Producto</th>
                <th className="pb-2 text-right">Cant.</th>
                <th className="pb-2 text-right">P. Unit.</th>
                <th className="pb-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2 text-black">{item.product_code}</td>
                  <td className="py-2">{item.product_name}</td>
                  <td className="py-2 text-right">{Number(item.quantity)}</td>
                  <td className="py-2 text-right">
                    ${Number(item.unit_price).toLocaleString("es-AR")}
                  </td>
                  <td className="py-2 text-right font-medium">
                    ${Number(item.subtotal).toLocaleString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            Documentos ({order.documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.documents.length === 0 ? (
            <p className="text-black text-sm">
              No hay documentos generados para este pedido.
            </p>
          ) : (
            <div className="space-y-2">
              {order.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div>
                    <span className="font-medium text-sm">
                      {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                    </span>
                    <span className="text-xs text-black ml-2">
                      {doc.number}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
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
                    <span className="text-xs text-black">
                      {new Date(doc.created_at).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
