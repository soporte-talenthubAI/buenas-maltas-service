"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Route,
  Loader2,
  MapPin,
  Users,
  Star,
} from "lucide-react";

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
  has_orders?: boolean;
  order_count?: number;
}

export default function VendedorRutasPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"todos" | "potenciales" | "activos">("todos");

  useEffect(() => {
    fetch("/api/clientes?includeStats=true")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.customers || [];
        setCustomers(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredCustomers = customers.filter((c) => {
    if (filter === "potenciales") return !c.order_count || c.order_count === 0;
    if (filter === "activos") return (c.order_count || 0) > 0;
    return true;
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
    const selected = filteredCustomers.filter((c) => selectedIds.has(c.id) && c.latitude && c.longitude);
    if (selected.length === 0) return;

    const waypoints = selected.map((c) => `${c.latitude},${c.longitude}`);
    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const middle = waypoints.slice(1, -1).join("|");

    let url = `https://www.google.com/maps/dir/${origin}`;
    if (middle) url += `/${middle}`;
    url += `/${destination}`;

    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">Mis Rutas de Visita</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Route className="w-5 h-5" />
              Seleccioná clientes para generar tu ruta
            </CardTitle>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(["todos", "activos", "potenciales"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setSelectedIds(new Set()); }}
                  className={`px-3 py-1.5 text-sm capitalize ${
                    filter === f ? "bg-amber-600 text-white" : "bg-white text-black hover:bg-gray-50"
                  }`}
                >
                  {f === "potenciales" ? "Potenciales" : f === "activos" ? "Con Compras" : "Todos"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                    onChange={selectAll}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-black">
                    {selectedIds.size} seleccionado(s) de {filteredCustomers.length}
                  </span>
                </div>
                <Button
                  onClick={generateGoogleMapsUrl}
                  disabled={selectedIds.size < 2}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Generar Ruta ({selectedIds.size} paradas)
                </Button>
              </div>

              <div className="space-y-2">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => toggleSelect(customer.id)}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedIds.has(customer.id) ? "bg-amber-50 border-amber-300" : "hover:bg-gray-50"
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
                        <p className="font-medium text-black">{customer.commercial_name}</p>
                        {(!customer.order_count || customer.order_count === 0) && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Potencial
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-black">
                        {customer.street} {customer.street_number}, {customer.locality}
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
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-black">No hay clientes en esta categoría</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
