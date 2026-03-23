"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, Pencil, Trash2, RefreshCw, Package } from "lucide-react";
import { ProductFormModal } from "@/components/productos/product-form-modal";

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

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (showAll) params.set("all", "1");
      const res = await fetch(`/api/productos?${params}`);
      const data = await res.json();
      setProducts(data);
    } catch {
      console.error("Error loading products");
    } finally {
      setLoading(false);
    }
  }, [search, showAll]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (product: Product) => {
    if (!confirm(`¿Eliminar "${product.name}"? Se desactivará el producto.`)) return;
    setDeleting(product.id);
    try {
      await fetch(`/api/productos/${product.id}`, { method: "DELETE" });
      fetchProducts();
    } catch {
      console.error("Error deleting product");
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = (product: Product) => {
    setEditProduct(product);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditProduct(null);
    setShowForm(true);
  };

  const brandColor = (brand: string) => {
    switch (brand) {
      case "Träumer": return "bg-amber-100 text-amber-800";
      case "Vitea": return "bg-green-100 text-green-800";
      case "Beermut": return "bg-red-100 text-red-800";
      case "Mixology": return "bg-purple-100 text-purple-800";
      case "Servicio": return "bg-gray-100 text-gray-700";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-black">Productos</h1>
        <Button onClick={handleNew} className="bg-amber-600 hover:bg-amber-700 text-white">
          <Plus className="w-4 h-4" /> Nuevo Producto
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-black"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="rounded border-gray-300"
          />
          Mostrar inactivos
        </label>
        <Button variant="outline" size="sm" onClick={fetchProducts}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Código</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Marca</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Precio venta</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Precio costo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Unidad</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-400">
                    Cargando...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-400">
                    <Package className="w-8 h-8 mx-auto mb-2" />
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!p.is_active ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-mono text-gray-600">{p.code}</td>
                    <td className="px-4 py-3 text-black font-medium">{p.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${brandColor(p.brand)}`}>
                        {p.brand}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{p.category}</td>
                    <td className="px-4 py-3 text-right text-black">
                      ${Number(p.unit_price).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {p.cost_price
                        ? `$${Number(p.cost_price).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.unit}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {p.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-amber-600"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={deleting === p.id}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 disabled:opacity-50"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && products.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
            {products.length} producto{products.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      <ProductFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={fetchProducts}
        product={editProduct}
      />
    </div>
  );
}
