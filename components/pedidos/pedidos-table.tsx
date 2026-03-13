"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckSquare,
  Square,
  Filter,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Order {
  id: string;
  order_number: string;
  order_date: string;
  delivery_date: string | null;
  status: string;
  priority: string;
  subtotal: string;
  total: string;
  customer: {
    id: string;
    commercial_name: string;
    locality: string;
    phone: string | null;
  };
  _count: { items: number; documents: number };
}

interface Customer {
  id: string;
  commercial_name: string;
  locality: string;
}

const STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  confirmado: "bg-blue-100 text-blue-800",
  documentado: "bg-green-100 text-green-800",
  en_ruta: "bg-purple-100 text-purple-800",
  entregado: "bg-gray-100 text-gray-800",
  cancelado: "bg-red-100 text-red-800",
};

const PRIORITY_COLORS: Record<string, string> = {
  baja: "text-gray-700",
  normal: "text-blue-600",
  alta: "text-orange-600",
  urgente: "text-red-600 font-bold",
};

interface PedidosTableProps {
  onGenerateDocuments?: (orderIds: string[]) => void;
}

export function PedidosTable({ onGenerateDocuments }: PedidosTableProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/clientes")
      .then((r) => r.json())
      .then(setCustomers);
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (customerFilter) params.set("customerId", customerFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", String(page));
    params.set("limit", "15");

    const res = await fetch(`/api/pedidos?${params}`);
    const data = await res.json();
    setOrders(data.orders);
    setTotalPages(data.totalPages);
    setTotal(data.total);
    setLoading(false);
  }, [search, statusFilter, customerFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === orders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map((o) => o.id)));
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setCustomerFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const hasActiveFilters =
    search || statusFilter || customerFilter || dateFrom || dateTo;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Pedidos{" "}
            <span className="text-sm font-normal text-gray-700">
              ({total})
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {selected.size > 0 && onGenerateDocuments && (
              <Button
                size="sm"
                onClick={() => onGenerateDocuments(Array.from(selected))}
              >
                <FileText className="w-4 h-4" />
                Generar Docs ({selected.size})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>
        </div>

        {/* Search bar - always visible */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por N° pedido o cliente..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-700 mb-1 block">
                  Estado
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="documentado">Documentado</option>
                  <option value="en_ruta">En Ruta</option>
                  <option value="entregado">Entregado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-700 mb-1 block">
                  Cliente
                </label>
                <select
                  value={customerFilter}
                  onChange={(e) => {
                    setCustomerFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                >
                  <option value="">Todos</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.commercial_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-700 mb-1 block">
                  Fecha desde
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-700 mb-1 block">
                  Fecha hasta
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-3 h-3" />
                Limpiar filtros
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-gray-700 text-center py-12">
            {hasActiveFilters
              ? "No se encontraron pedidos con los filtros seleccionados."
              : "No hay pedidos registrados."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-700">
                    <th className="pb-3 pr-3">
                      <button
                        onClick={toggleAll}
                        className="hover:text-gray-700"
                      >
                        {selected.size === orders.length &&
                        orders.length > 0 ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="pb-3 pr-3">Pedido</th>
                    <th className="pb-3 pr-3">Cliente</th>
                    <th className="pb-3 pr-3">Fecha</th>
                    <th className="pb-3 pr-3">Estado</th>
                    <th className="pb-3 pr-3">Prioridad</th>
                    <th className="pb-3 pr-3 text-right">Total</th>
                    <th className="pb-3 pr-3 text-center">Items</th>
                    <th className="pb-3 pr-3 text-center">Docs</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 pr-3">
                        <button onClick={() => toggleSelect(order.id)}>
                          {selected.has(order.id) ? (
                            <CheckSquare className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 pr-3 font-medium">
                        {order.order_number}
                      </td>
                      <td className="py-3 pr-3">
                        <div>{order.customer.commercial_name}</div>
                        <div className="text-xs text-gray-600">
                          {order.customer.locality}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-gray-600">
                        {new Date(order.order_date).toLocaleDateString("es-AR")}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium capitalize",
                            STATUS_COLORS[order.status]
                          )}
                        >
                          {order.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={cn(
                            "text-xs capitalize",
                            PRIORITY_COLORS[order.priority]
                          )}
                        >
                          {order.priority}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-right font-medium">
                        ${Number(order.total).toLocaleString("es-AR")}
                      </td>
                      <td className="py-3 pr-3 text-center text-gray-700">
                        {order._count.items}
                      </td>
                      <td className="py-3 pr-3 text-center text-gray-700">
                        {order._count.documents}
                      </td>
                      <td className="py-3">
                        <Link href={`/dashboard/pedidos/${order.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-700">
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
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
  );
}
