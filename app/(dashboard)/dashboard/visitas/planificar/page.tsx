"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Search,
  Star,
  UserCheck,
  Save,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface Vendedor {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
}

interface Customer {
  id: string;
  code: string;
  commercial_name: string;
  contact_name: string | null;
  phone: string | null;
  locality: string;
  street: string;
  street_number: string;
  latitude: number | null;
  longitude: number | null;
  order_count?: number;
}

export default function PlanificarVisitaPage() {
  const router = useRouter();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedVendedor, setSelectedVendedor] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "activos" | "potenciales">("todos");

  // Default to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/vendedores").then((r) => r.json()),
      fetch("/api/clientes?includeStats=true").then((r) => r.json()),
    ])
      .then(([vData, cData]) => {
        setVendedores((vData || []).filter((v: Vendedor) => v.is_active));
        const list = Array.isArray(cData) ? cData : cData.customers || [];
        setCustomers(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredCustomers = customers.filter((c) => {
    if (filter === "potenciales") return !c.order_count || c.order_count === 0;
    if (filter === "activos") return (c.order_count || 0) > 0;
    return true;
  }).filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.commercial_name.toLowerCase().includes(s) ||
      c.locality.toLowerCase().includes(s) ||
      c.code.toLowerCase().includes(s)
    );
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredCustomers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map((c) => c.id)));
    }
  };

  const generateGoogleMapsUrl = () => {
    const selected = filteredCustomers.filter(
      (c) => selectedIds.has(c.id) && c.latitude && c.longitude
    );
    if (selected.length < 2) return null;

    const waypoints = selected.map((c) => `${c.latitude},${c.longitude}`);
    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const middle = waypoints.slice(1, -1).join("|");

    let url = `https://www.google.com/maps/dir/${origin}`;
    if (middle) url += `/${middle}`;
    url += `/${destination}`;
    return url;
  };

  const handleSave = async () => {
    if (!selectedVendedor || !scheduledDate || selectedIds.size === 0) return;

    setSaving(true);
    try {
      const googleMapsUrl = generateGoogleMapsUrl();
      const orderedIds = filteredCustomers
        .filter((c) => selectedIds.has(c.id))
        .map((c) => c.id);

      const res = await fetch("/api/visit-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendedor_id: selectedVendedor,
          scheduled_date: scheduledDate,
          customer_ids: orderedIds,
          google_maps_url: googleMapsUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error al crear la ruta");
        setSaving(false);
        return;
      }

      router.push("/dashboard/visitas");
    } catch {
      alert("Error de conexion");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const withCoords = filteredCustomers.filter(
    (c) => selectedIds.has(c.id) && c.latitude && c.longitude
  ).length;
  const withoutCoords = selectedIds.size - withCoords;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/visitas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-black">
          Planificar Ruta de Visita
        </h1>
      </div>

      {/* Config */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedVendedor}
              onChange={(e) => setSelectedVendedor(e.target.value)}
              className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm text-black"
            >
              <option value="">Seleccionar vendedor...</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fecha</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-black">{selectedIds.size} clientes seleccionados</p>
            {withCoords > 0 && (
              <p className="text-green-600">{withCoords} con coordenadas</p>
            )}
            {withoutCoords > 0 && (
              <p className="text-red-500">{withoutCoords} sin coordenadas</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Seleccionar Clientes para la Visita
            </CardTitle>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(["todos", "activos", "potenciales"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setSelectedIds(new Set());
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
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, localidad o codigo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={
                  selectedIds.size === filteredCustomers.length &&
                  filteredCustomers.length > 0
                }
                onChange={selectAll}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-black">
                {selectedIds.size} seleccionado(s) de {filteredCustomers.length}
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => toggleSelect(customer.id)}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedIds.has(customer.id)
                    ? "bg-amber-50 border-amber-300"
                    : "hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(customer.id)}
                  onChange={() => toggleSelect(customer.id)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-black">
                      {customer.commercial_name}
                    </p>
                    <span className="text-xs text-black">{customer.code}</span>
                    {(!customer.order_count || customer.order_count === 0) && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Potencial
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-black">
                    {customer.street} {customer.street_number},{" "}
                    {customer.locality}
                    {customer.contact_name && ` - ${customer.contact_name}`}
                    {customer.phone && ` - ${customer.phone}`}
                  </p>
                </div>
                {!customer.latitude && (
                  <span className="text-xs text-red-500">Sin coordenadas</span>
                )}
              </div>
            ))}
          </div>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-black">No hay clientes en esta categoria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Link href="/dashboard/visitas">
          <Button variant="outline">Cancelar</Button>
        </Link>
        <Button
          onClick={handleSave}
          disabled={saving || !selectedVendedor || selectedIds.size === 0}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Crear Ruta de Visita ({selectedIds.size} paradas)
        </Button>
      </div>
    </div>
  );
}
