"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  priority: string;
  order_date: string;
  delivery_date: string | null;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string | null;
  order_type: string | null;
  observations: string | null;
  customer: {
    commercial_name: string;
    contact_name: string | null;
    phone: string | null;
    cuit: string | null;
    street: string;
    street_number: string;
    locality: string;
  };
  items: {
    id: string;
    product_code: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[];
  documents: { id: string; type: string; number: string | null; status: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-700",
  confirmado: "bg-blue-100 text-blue-700",
  documentado: "bg-purple-100 text-purple-700",
  en_ruta: "bg-amber-100 text-amber-700",
  entregado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
};

export default function DetallePedidoPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/pedidos/${id}`)
      .then((r) => r.json())
      .then((data) => { setOrder(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!order) {
    return <p className="text-center py-20 text-black">Pedido no encontrado</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/ventas/pedidos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-black">{order.order_number}</h1>
          <p className="text-sm text-black">{order.customer.commercial_name}</p>
        </div>
        <span className={cn("px-3 py-1 rounded-full text-sm font-medium", STATUS_COLORS[order.status])}>
          {order.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium text-black">{order.customer.commercial_name}</p>
            {order.customer.contact_name && <p className="text-black">{order.customer.contact_name}</p>}
            <p className="text-black">{order.customer.street} {order.customer.street_number}, {order.customer.locality}</p>
            {order.customer.phone && <p className="text-black">Tel: {order.customer.phone}</p>}
            {order.customer.cuit && <p className="text-black">CUIT: {order.customer.cuit}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Detalles</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="text-black">Fecha: {new Date(order.order_date).toLocaleDateString("es-AR")}</p>
            {order.delivery_date && <p className="text-black">Entrega: {new Date(order.delivery_date).toLocaleDateString("es-AR")}</p>}
            <p className="text-black">Prioridad: <span className="capitalize">{order.priority}</span></p>
            {order.payment_method && <p className="text-black">Pago: {order.payment_method}</p>}
            {order.order_type && <p className="text-black">Tipo: {order.order_type}</p>}
            {order.observations && <p className="text-black mt-2 italic">{order.observations}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Productos</CardTitle></CardHeader>
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
                  <td className="py-2 text-black">{item.product_name}</td>
                  <td className="py-2 text-right text-black">{Number(item.quantity)}</td>
                  <td className="py-2 text-right text-black">${Number(item.unit_price).toLocaleString("es-AR")}</td>
                  <td className="py-2 text-right font-medium text-black">${Number(item.subtotal).toLocaleString("es-AR")}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mt-4">
            <div className="w-48 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-black">Subtotal:</span><span className="text-black">${Number(order.subtotal).toLocaleString("es-AR")}</span></div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-red-600"><span>Descuento:</span><span>-{Number(order.discount)}%</span></div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-1"><span className="text-black">Total:</span><span className="text-amber-600">${Number(order.total).toLocaleString("es-AR")}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {order.documents.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Documentos</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {order.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm text-black capitalize">{doc.type.replace("_", " ")}</span>
                  <span className="text-sm text-black">{doc.number || "-"}</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs", doc.status === "emitido" ? "bg-green-100 text-green-700" : "bg-gray-100 text-black")}>
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
