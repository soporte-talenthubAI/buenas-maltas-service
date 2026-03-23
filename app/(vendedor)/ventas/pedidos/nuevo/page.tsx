"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Search,
} from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  unit_price: number;
  unit: string;
}

interface Customer {
  id: string;
  code: string;
  commercial_name: string;
  locality: string;
}

interface OrderItem {
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export default function NuevoPedidoPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>}>
      <NuevoPedidoPage />
    </Suspense>
  );
}

function NuevoPedidoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clienteId");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Order form
  const [customerId, setCustomerId] = useState(preselectedClientId || "");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [priority, setPriority] = useState("normal");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [orderType, setOrderType] = useState("presencial");
  const [observations, setObservations] = useState("");
  const [discount, setDiscount] = useState(0);

  // Items
  const [items, setItems] = useState<OrderItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductList, setShowProductList] = useState(false);

  // Set default delivery date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDeliveryDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  // Fetch customers and products
  useEffect(() => {
    Promise.all([
      fetch("/api/clientes").then((r) => r.json()),
      fetch("/api/productos").then((r) => r.json()),
    ]).then(([customersData, productsData]) => {
      setCustomers(Array.isArray(customersData) ? customersData : customersData.customers || []);
      setProducts(Array.isArray(productsData) ? productsData : productsData.products || []);
      setLoadingData(false);
    }).catch(() => setLoadingData(false));
  }, []);

  // Filtered products for search
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.brand.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Add product to items
  const addProduct = (product: Product) => {
    const existing = items.find((i) => i.product_code === product.code);
    if (existing) {
      setItems(
        items.map((i) =>
          i.product_code === product.code
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price }
            : i
        )
      );
    } else {
      setItems([
        ...items,
        {
          product_code: product.code,
          product_name: product.name,
          quantity: 1,
          unit_price: Number(product.unit_price),
          subtotal: Number(product.unit_price),
        },
      ]);
    }
    setProductSearch("");
    setShowProductList(false);
  };

  // Update item quantity
  const updateQuantity = (code: string, qty: number) => {
    if (qty <= 0) {
      removeItem(code);
      return;
    }
    setItems(
      items.map((i) =>
        i.product_code === code
          ? { ...i, quantity: qty, subtotal: qty * i.unit_price }
          : i
      )
    );
  };

  // Remove item
  const removeItem = (code: string) => {
    setItems(items.filter((i) => i.product_code !== code));
  };

  // Calculate totals
  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const discountAmount = discount > 0 ? subtotal * (discount / 100) : 0;
  const total = subtotal - discountAmount;

  // Submit
  const handleSubmit = async () => {
    if (!customerId) {
      setError("Seleccioná un cliente");
      return;
    }
    if (items.length === 0) {
      setError("Agregá al menos un producto");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          delivery_date: deliveryDate || undefined,
          priority,
          payment_method: paymentMethod,
          order_type: orderType,
          observations: observations || undefined,
          discount,
          items,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear pedido");
      }

      router.push("/ventas/pedidos");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/ventas/pedidos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-black">Nuevo Pedido</h1>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Order details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm text-black"
              >
                <option value="">Seleccionar cliente...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.commercial_name} ({c.code}) - {c.locality}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Productos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar producto por nombre o código..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductList(true);
                  }}
                  onFocus={() => setShowProductList(true)}
                  className="pl-10"
                />
                {showProductList && productSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <p className="p-3 text-sm text-black">No se encontraron productos</p>
                    ) : (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => addProduct(product)}
                          className="w-full text-left px-3 py-2 hover:bg-amber-50 flex items-center justify-between text-sm border-b last:border-0"
                        >
                          <div>
                            <p className="font-medium text-black">{product.name}</p>
                            <p className="text-xs text-black">
                              {product.code} - {product.brand} ({product.unit})
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-amber-600">
                              ${Number(product.unit_price).toLocaleString("es-AR")}
                            </p>
                            <Plus className="w-4 h-4 text-green-600 ml-auto" />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Items Table */}
              {items.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-black">
                      <th className="pb-2">Producto</th>
                      <th className="pb-2 text-center w-24">Cant.</th>
                      <th className="pb-2 text-right">P. Unit.</th>
                      <th className="pb-2 text-right">Subtotal</th>
                      <th className="pb-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.product_code} className="border-b">
                        <td className="py-2">
                          <p className="font-medium text-black">{item.product_name}</p>
                          <p className="text-xs text-black">{item.product_code}</p>
                        </td>
                        <td className="py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => updateQuantity(item.product_code, item.quantity - 1)}
                              className="w-7 h-7 rounded border flex items-center justify-center hover:bg-gray-100"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.product_code, Number(e.target.value))}
                              className="w-14 h-7 text-center border rounded text-sm text-black"
                              min="1"
                            />
                            <button
                              onClick={() => updateQuantity(item.product_code, item.quantity + 1)}
                              className="w-7 h-7 rounded border flex items-center justify-center hover:bg-gray-100"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2 text-right text-black">
                          ${item.unit_price.toLocaleString("es-AR")}
                        </td>
                        <td className="py-2 text-right font-medium text-black">
                          ${item.subtotal.toLocaleString("es-AR")}
                        </td>
                        <td className="py-2 text-center">
                          <button
                            onClick={() => removeItem(item.product_code)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {items.length === 0 && (
                <p className="text-center text-black py-6">
                  Buscá y agregá productos al pedido
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - Order config + totals */}
        <div className="space-y-4">
          {/* Order Config */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-black mb-1">Fecha de Entrega</label>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1">Prioridad</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm text-black"
                >
                  <option value="baja">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1">Tipo de Pedido</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm text-black"
                >
                  <option value="presencial">Presencial</option>
                  <option value="telefono">Teléfono</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="web">Web</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1">Medio de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm text-black"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                  <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                  <option value="Cuenta Corriente">Cuenta Corriente</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1">Descuento (%)</label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1">Observaciones</label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
                  rows={3}
                  placeholder="Notas del pedido..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-black">Subtotal:</span>
                <span className="font-medium text-black">${subtotal.toLocaleString("es-AR")}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Descuento ({discount}%):</span>
                  <span>-${discountAmount.toLocaleString("es-AR")}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span className="text-black">Total:</span>
                <span className="text-amber-600">${total.toLocaleString("es-AR")}</span>
              </div>
              <p className="text-xs text-black">{items.length} producto(s)</p>

              <Button
                onClick={handleSubmit}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white mt-3"
                disabled={saving || items.length === 0 || !customerId}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Confirmar Pedido
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
