"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NuevoClientePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    commercial_name: "",
    contact_name: "",
    phone: "",
    email: "",
    cuit: "",
    iva_condition: "",
    street: "",
    street_number: "",
    locality: "Córdoba",
    province: "Córdoba",
    postal_code: "",
    customer_type: "minorista",
    has_time_restriction: false,
    delivery_window_start: "08:00",
    delivery_window_end: "18:00",
  });

  const handleChange = (field: string, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.commercial_name || !form.street || !form.street_number || !form.locality) {
      setError("Completá los campos obligatorios: Nombre comercial, Calle, Número, Localidad");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear cliente");
      }

      router.push("/ventas/clientes");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/ventas/clientes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-black">Nuevo Cliente</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-black mb-1">
                  Nombre Comercial *
                </label>
                <Input
                  value={form.commercial_name}
                  onChange={(e) => handleChange("commercial_name", e.target.value)}
                  placeholder="Ej: Bar El Refugio"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Contacto</label>
                <Input
                  value={form.contact_name}
                  onChange={(e) => handleChange("contact_name", e.target.value)}
                  placeholder="Nombre del contacto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Teléfono</label>
                <Input
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="351-456-7890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="email@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">CUIT</label>
                <Input
                  value={form.cuit}
                  onChange={(e) => handleChange("cuit", e.target.value)}
                  placeholder="30-12345678-9"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Condición IVA</label>
                <select
                  value={form.iva_condition}
                  onChange={(e) => handleChange("iva_condition", e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm text-black"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Responsable Inscripto">Responsable Inscripto</option>
                  <option value="Monotributista">Monotributista</option>
                  <option value="Exento">Exento</option>
                  <option value="Consumidor Final">Consumidor Final</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Tipo de Cliente</label>
                <select
                  value={form.customer_type}
                  onChange={(e) => handleChange("customer_type", e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm text-black"
                >
                  <option value="minorista">Minorista</option>
                  <option value="mayorista">Mayorista</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Dirección</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Calle *</label>
                <Input
                  value={form.street}
                  onChange={(e) => handleChange("street", e.target.value)}
                  placeholder="Av. Colón"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Número *</label>
                <Input
                  value={form.street_number}
                  onChange={(e) => handleChange("street_number", e.target.value)}
                  placeholder="1200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Localidad *</label>
                <Input
                  value={form.locality}
                  onChange={(e) => handleChange("locality", e.target.value)}
                  placeholder="Córdoba"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Provincia</label>
                <Input
                  value={form.province}
                  onChange={(e) => handleChange("province", e.target.value)}
                  placeholder="Córdoba"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Código Postal</label>
                <Input
                  value={form.postal_code}
                  onChange={(e) => handleChange("postal_code", e.target.value)}
                  placeholder="5000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Ventana de Entrega</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.has_time_restriction}
                onChange={(e) => handleChange("has_time_restriction", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label className="text-sm text-black">
                Este cliente tiene restricción horaria de entrega
              </label>
            </div>
            {form.has_time_restriction && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Desde</label>
                  <Input
                    type="time"
                    value={form.delivery_window_start}
                    onChange={(e) => handleChange("delivery_window_start", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Hasta</label>
                  <Input
                    type="time"
                    value={form.delivery_window_end}
                    onChange={(e) => handleChange("delivery_window_end", e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-4">
          <Link href="/ventas/clientes">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar Cliente
          </Button>
        </div>
      </form>
    </div>
  );
}
