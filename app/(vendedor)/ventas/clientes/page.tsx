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
  RefreshCw,
  Building2,
  FileText,
} from "lucide-react";

interface Customer {
  id: string;
  code: string;
  commercial_name: string;
  razon_social: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  cuit: string | null;
  locality: string;
  province: string;
  street: string | null;
  sales_channel: string | null;
  condicion_venta: string | null;
  zona: string | null;
  tango_id: number | null;
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
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    totalFromTango: number;
    created: number;
    updated: number;
    skipped: number;
  } | null>(null);
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

    setCustomers(data.customers || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [search, filter, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/tango/sync-clientes", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncResult(data);
        fetchCustomers();
      } else {
        alert("Error sincronizando: " + (data.error || "Error desconocido"));
      }
    } catch {
      alert("Error de conexión con Tango");
    } finally {
      setSyncing(false);
    }
  };

  const filteredCustomers =
    filter === "potenciales"
      ? customers.filter((c) => !c.has_orders || c.order_count === 0)
      : filter === "activos"
        ? customers.filter((c) => c.has_orders && c.order_count > 0)
        : customers;

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">Clientes</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sincronizar Tango
          </Button>
          <Link href="/ventas/clientes/nuevo">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white">
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo Cliente
            </Button>
          </Link>
        </div>
      </div>

      {/* Sync Result Banner */}
      {syncResult && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <p className="text-sm text-green-800 font-medium">
              Sincronización completada: {syncResult.totalFromTango} clientes de Tango
              {" | "}{syncResult.created} creados, {syncResult.updated} actualizados, {syncResult.skipped} omitidos
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, razón social, código, CUIT, localidad..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(["todos", "activos", "potenciales"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-sm capitalize ${
                    filter === f
                      ? "bg-amber-600 text-white"
                      : "bg-white text-black hover:bg-gray-50"
                  }`}
                >
                  {f === "potenciales"
                    ? "Potenciales"
                    : f === "activos"
                      ? "Con Compras"
                      : "Todos"}
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
            <span className="text-sm font-normal text-black ml-2">
              ({total})
            </span>
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
                {search
                  ? "No se encontraron clientes"
                  : "No hay clientes registrados"}
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
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-black">
                            {customer.commercial_name}
                          </p>
                          <span className="text-xs text-black bg-gray-100 px-2 py-0.5 rounded">
                            {customer.code}
                          </span>
                          {customer.tango_id && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              Tango
                            </span>
                          )}
                          {!customer.is_active && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                              Inactivo
                            </span>
                          )}
                          {customer.order_count === 0 && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              Potencial
                            </span>
                          )}
                        </div>
                        {customer.razon_social &&
                          customer.razon_social !== customer.commercial_name && (
                            <p className="text-xs text-gray-500">
                              <Building2 className="w-3 h-3 inline mr-1" />
                              {customer.razon_social}
                            </p>
                          )}
                        <div className="flex items-center gap-4 text-xs text-black flex-wrap">
                          {customer.cuit && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {customer.cuit}
                            </span>
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
                            {customer.street ? ` - ${customer.street}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          {customer.sales_channel &&
                            customer.sales_channel !== "Sin especificar" && (
                              <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                                {customer.sales_channel}
                              </span>
                            )}
                          {customer.condicion_venta && (
                            <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded">
                              {customer.condicion_venta}
                            </span>
                          )}
                          {customer.zona && (
                            <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded">
                              Zona: {customer.zona}
                            </span>
                          )}
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
                            $
                            {customer.total_spent.toLocaleString("es-AR", {
                              maximumFractionDigits: 0,
                            })}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Link href={`/ventas/clientes/${customer.id}`}>
                          <Button variant="ghost" size="icon" title="Editar">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link
                          href={`/ventas/pedidos/nuevo?clienteId=${customer.id}`}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Crear Pedido"
                          >
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
    </div>
  );
}
