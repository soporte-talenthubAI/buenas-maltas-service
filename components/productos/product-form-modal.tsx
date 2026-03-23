"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";

interface Product {
  id: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  unit_price: number;
  cost_price: number | null;
  unit: string;
  is_active: boolean;
}

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  product?: Product | null; // null = create mode
}

const BRANDS = ["Träumer", "Vitea", "Beermut", "Mixology", "Servicio"];
const CATEGORIES = ["cerveza", "bebida", "servicio", "insumo"];
const UNITS = ["unidad", "litro", "barril", "pack", "caja"];

export function ProductFormModal({ open, onClose, onSaved, product }: ProductFormModalProps) {
  const isEdit = !!product;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [syncTango, setSyncTango] = useState(false);

  const [form, setForm] = useState({
    code: "",
    name: "",
    brand: "Träumer",
    category: "cerveza",
    unit_price: "",
    cost_price: "",
    unit: "unidad",
    is_active: true,
  });

  useEffect(() => {
    if (product) {
      setForm({
        code: product.code,
        name: product.name,
        brand: product.brand,
        category: product.category,
        unit_price: String(product.unit_price),
        cost_price: product.cost_price ? String(product.cost_price) : "",
        unit: product.unit,
        is_active: product.is_active,
      });
    } else {
      setForm({
        code: "",
        name: "",
        brand: "Träumer",
        category: "cerveza",
        unit_price: "",
        cost_price: "",
        unit: "unidad",
        is_active: true,
      });
    }
    setError("");
    setSyncTango(false);
  }, [product, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        brand: form.brand,
        category: form.category,
        unit_price: parseFloat(form.unit_price),
        cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
        unit: form.unit,
        is_active: form.is_active,
        sync_tango: syncTango,
      };

      const url = isEdit ? `/api/productos/${product.id}` : "/api/productos";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar producto");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-black">
            {isEdit ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
                placeholder="ej: 0062"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
              placeholder="ej: Träumer IPA Lata 473ml"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <select
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
              >
                {BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta *</label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio de costo</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              Activo
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={syncTango}
                onChange={(e) => setSyncTango(e.target.checked)}
                className="rounded border-gray-300"
              />
              Sincronizar con Tango
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear producto"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
