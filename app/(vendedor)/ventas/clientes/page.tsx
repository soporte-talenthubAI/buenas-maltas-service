"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  UserPlus,
  Search,
  Loader2,
  MapPin,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Edit,
  Star,
  ShoppingCart,
} from "lucide-react";

interface Customer {
  id: string;
  code: string;
  commercial_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  cuit: string | null;
  locality: string;
  province: string;
  customer_type: string;
  is_active: boolean;
  has_orders: boolean;
  order_count: number;
  total_spent: number;
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "activos" | "potenciales">("todos");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("includeStats", "true");
    if (filter === "potenciales") params.set("potenciales", "true");

    const res = await fetch(`/api/clientes?${params}`);
    const data = await res.json();

    if (Array.isArray(data)) {
      // Old API format - just array of customers
      setCustomers(data.map((c: Customer) => ({ ...c, has_orders: true, order_count: 0, total_spent: 0 })));
      setTotal(data.length);
    } else {
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [search, filter, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = filter === "potenciales"
    ? customers.filter((c) => !c.has_orders || c.order_count === 0)
    : filter === "activos"
      ? customers.filter((c) => c.has_orders && c.order_count > 0)
      : customers;

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">Clientes</h1>
        <Link href="/ventas/clientes/nuevo">
          <Button className="bg-amber-600 hover:bg-amber-700 text-white">
            <UserPlus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, código, contacto..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(["todos", "activos", "potenciales"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setPage(1); }}
                  className={`px-3 py-1.5 text-sm capitalize ${
                    filter === f
                      ? "bg-amber-600 text-white"
                      : "bg-white text-black hover:bg-gray-50"
                  }`}
                >
                  {f === "potenciales" ? "Potenciales" : f === "activos" ? "Con Compras" : "Todos"}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5" />
            {filter === "potenciales"
              ? "Clientes Potenciales (sin compras)"
              : filter === "activos"
                ? "Clientes con Compras"
                : "Todos los Clientes"}
            <span className="text-sm font-normal text-black ml-2">({total})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-black">
                {search ? "No se encontraron clientes" : "No hay clientes registrados"}
              </p>
              <Link href="/ventas/clientes/nuevo">
                <Button variant="outline" className="mt-3">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Registrar Cliente
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-3">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                        {customer.commercial_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-black">{customer.commercial_name}</p>
                          <span className="text-xs text-black bg-gray-100 px-2 py-0.5 rounded">
                            {customer.code}
                          </span>
                          {customer.order_count === 0 && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              Potencial
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-black">
                          {customer.contact_name && (
                            <span>{customer.contact_name}</span>
                          )}
                          {customer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </span>
                          )}
                          {customer.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {customer.email}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {customer.locality}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-black">
                          {customer.order_count} pedidos
                        </p>
                        {customer.total_spent > 0 && (
                          <p className="text-xs text-black">
                            ${customer.total_spent.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Link href={`/ventas/clientes/${customer.id}`}>
                          <Button variant="ghost" size="icon" title="Editar">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/ventas/pedidos/nuevo?clienteId=${customer.id}`}>
                          <Button variant="ghost" size="icon" title="Crear Pedido">
                            <ShoppingCart className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-black">Página {page} de {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
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

