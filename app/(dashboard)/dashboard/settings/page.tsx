"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Save,
  Loader2,
  Warehouse,
  Navigation,
  Check,
  Users,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  X,
  Truck,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ─── Types ───────────────────────────────────────────────────────

interface DepotConfig {
  id: string;
  name: string;
  street: string;
  street_number: string;
  locality: string;
  province: string;
  postal_code: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

interface Driver {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  last_access: string | null;
  created_at: string;
  _count: { routes_as_driver: number };
}

interface Vendedor {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  last_access: string | null;
  created_at: string;
  _count: { visit_routes: number; created_orders: number };
}

type Tab = "deposito" | "choferes" | "vendedores";

// ─── Main Page ───────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("deposito");

  return (
    <div>
      <h1 className="text-2xl font-bold text-black mb-6">Configuracion</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("deposito")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
            activeTab === "deposito"
              ? "border-amber-600 text-amber-700"
              : "border-transparent text-black hover:text-black"
          )}
        >
          <Warehouse className="w-4 h-4" />
          Deposito
        </button>
        <button
          onClick={() => setActiveTab("choferes")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
            activeTab === "choferes"
              ? "border-amber-600 text-amber-700"
              : "border-transparent text-black hover:text-black"
          )}
        >
          <Users className="w-4 h-4" />
          Choferes
        </button>
        <button
          onClick={() => setActiveTab("vendedores")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
            activeTab === "vendedores"
              ? "border-amber-600 text-amber-700"
              : "border-transparent text-black hover:text-black"
          )}
        >
          <ShoppingBag className="w-4 h-4" />
          Vendedores
        </button>
      </div>

      {activeTab === "deposito" && <DepotSection />}
      {activeTab === "choferes" && <DriversSection />}
      {activeTab === "vendedores" && <VendedoresSection />}
    </div>
  );
}

// ─── Depot Section ───────────────────────────────────────────────

function DepotSection() {
  const [depot, setDepot] = useState<DepotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState("Deposito Principal");
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [locality, setLocality] = useState("Cordoba");
  const [province, setProvince] = useState("Cordoba");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radiusMeters, setRadiusMeters] = useState("200");

  useEffect(() => {
    fetch("/api/depot-config")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.id) {
          setDepot(data);
          setName(data.name);
          setStreet(data.street);
          setStreetNumber(data.street_number);
          setLocality(data.locality);
          setProvince(data.province);
          setPostalCode(data.postal_code || "");
          setLatitude(String(data.latitude));
          setLongitude(String(data.longitude));
          setRadiusMeters(String(data.radius_meters));
        }
        setLoading(false);
      });
  }, []);

  const handleGeocode = async () => {
    if (!street || !streetNumber || !locality) return;
    setGeocoding(true);
    try {
      const address = `${street} ${streetNumber}, ${locality}, ${province}, Argentina`;
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
        );
        const data = await res.json();
        if (data.results?.[0]) {
          const { lat, lng } = data.results[0].geometry.location;
          setLatitude(String(lat));
          setLongitude(String(lng));
        }
      }
    } catch {
      // Silently fail
    } finally {
      setGeocoding(false);
    }
  };

  const handleSave = async () => {
    if (!street || !streetNumber || !latitude || !longitude) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/depot-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          street,
          street_number: streetNumber,
          locality,
          province,
          postal_code: postalCode || null,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius_meters: parseInt(radiusMeters) || 200,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDepot(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // Error saving
    } finally {
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

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-amber-600" />
            Configuracion del Deposito
          </CardTitle>
          <p className="text-sm text-black">
            Punto de partida y llegada para la generacion de rutas.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-black mb-1 block">
              Nombre del deposito
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Deposito Principal"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-sm text-black mb-1 block">Calle</label>
              <Input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Av. Colon"
              />
            </div>
            <div>
              <label className="text-sm text-black mb-1 block">
                Numero
              </label>
              <Input
                value={streetNumber}
                onChange={(e) => setStreetNumber(e.target.value)}
                placeholder="1200"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-black mb-1 block">
                Localidad
              </label>
              <Input
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="Cordoba"
              />
            </div>
            <div>
              <label className="text-sm text-black mb-1 block">
                Provincia
              </label>
              <Input
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="Cordoba"
              />
            </div>
            <div>
              <label className="text-sm text-black mb-1 block">
                Codigo Postal
              </label>
              <Input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="5000"
              />
            </div>
          </div>

          {/* Geocoding */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-black flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Coordenadas
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeocode}
                disabled={geocoding || !street || !streetNumber}
              >
                {geocoding ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Navigation className="w-3 h-3" />
                )}
                Geocodificar
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-black mb-1 block">
                  Latitud
                </label>
                <Input
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="-31.4167"
                  type="number"
                  step="0.0000001"
                />
              </div>
              <div>
                <label className="text-xs text-black mb-1 block">
                  Longitud
                </label>
                <Input
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="-64.1835"
                  type="number"
                  step="0.0000001"
                />
              </div>
            </div>
          </div>

          {/* Radius */}
          <div>
            <label className="text-sm text-black mb-1 block">
              Radio de validacion (metros)
            </label>
            <Input
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(e.target.value)}
              type="number"
              placeholder="200"
            />
            <p className="text-xs text-black mt-1">
              Distancia maxima para validar check-in/check-out del repartidor.
            </p>
          </div>

          {/* Current depot info */}
          {depot && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800 font-medium">
                Deposito actual: {depot.name}
              </p>
              <p className="text-xs text-green-700">
                {depot.street} {depot.street_number}, {depot.locality} · (
                {depot.latitude}, {depot.longitude})
              </p>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !street || !streetNumber || !latitude || !longitude}
            className="w-full"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? "Guardado" : "Guardar Configuracion"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Drivers Section ─────────────────────────────────────────────

function DriversSection() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await fetch("/api/drivers");
      const data = await res.json();
      setDrivers(data);
    } catch {
      // Error fetching
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  const handleEdit = (driver: Driver) => {
    setFormName(driver.name);
    setFormEmail(driver.email);
    setFormPassword("");
    setEditingId(driver.id);
    setShowForm(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!formName || !formEmail) {
      setError("Nombre y email son requeridos");
      return;
    }
    if (!editingId && !formPassword) {
      setError("La contraseña es requerida para nuevos choferes");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editingId ? `/api/drivers/${editingId}` : "/api/drivers";
      const method = editingId ? "PATCH" : "POST";

      const body: Record<string, string> = {
        name: formName,
        email: formEmail,
      };
      if (formPassword) body.password = formPassword;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al guardar");
        return;
      }

      resetForm();
      await fetchDrivers();
    } catch {
      setError("Error de conexion");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (driver: Driver) => {
    try {
      await fetch(`/api/drivers/${driver.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !driver.is_active }),
      });
      await fetchDrivers();
    } catch {
      // Error toggling
    }
  };

  const handleDelete = async (driver: Driver) => {
    if (
      !confirm(
        `Estas seguro de eliminar a ${driver.name}? Si tiene rutas asignadas, sera desactivado.`
      )
    ) {
      return;
    }

    try {
      await fetch(`/api/drivers/${driver.id}`, { method: "DELETE" });
      await fetchDrivers();
    } catch {
      // Error deleting
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const activeDrivers = drivers.filter((d) => d.is_active);
  const inactiveDrivers = drivers.filter((d) => !d.is_active);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-black">
            {activeDrivers.length} activos
            {inactiveDrivers.length > 0 &&
              ` · ${inactiveDrivers.length} inactivos`}
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Nuevo Chofer
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>{editingId ? "Editar Chofer" : "Nuevo Chofer"}</span>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-black mb-1 block">
                  Nombre completo
                </label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Juan Perez"
                />
              </div>
              <div>
                <label className="text-sm text-black mb-1 block">
                  Email
                </label>
                <Input
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="chofer@buenasmaltas.com"
                  type="email"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-black mb-1 block">
                Contraseña{editingId && " (dejar vacio para no cambiar)"}
              </label>
              <Input
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder={editingId ? "••••••••" : "Minimo 6 caracteres"}
                type="password"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingId ? "Guardar Cambios" : "Crear Chofer"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drivers list */}
      {drivers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Truck className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-black">No hay choferes registrados.</p>
            <p className="text-sm text-black mt-1">
              Crea el primer chofer para asignarle rutas de entrega.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {drivers.map((driver) => (
            <Card
              key={driver.id}
              className={cn(
                "transition-opacity",
                !driver.is_active && "opacity-60"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm",
                        driver.is_active ? "bg-amber-600" : "bg-gray-400"
                      )}
                    >
                      {driver.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{driver.name}</p>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            driver.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-black"
                          )}
                        >
                          {driver.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <p className="text-sm text-black">{driver.email}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-black">
                        <span>
                          {driver._count.routes_as_driver} rutas asignadas
                        </span>
                        <span>
                          Creado:{" "}
                          {new Date(driver.created_at).toLocaleDateString(
                            "es-AR"
                          )}
                        </span>
                        {driver.last_access && (
                          <span>
                            Ultimo acceso:{" "}
                            {new Date(driver.last_access).toLocaleDateString(
                              "es-AR"
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(driver)}
                      title={driver.is_active ? "Desactivar" : "Activar"}
                    >
                      {driver.is_active ? (
                        <UserX className="w-4 h-4 text-black" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(driver)}
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4 text-black" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(driver)}
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Vendedores Section ─────────────────────────────────────────

function VendedoresSection() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");

  const fetchVendedores = useCallback(async () => {
    try {
      const res = await fetch("/api/vendedores");
      const data = await res.json();
      setVendedores(data);
    } catch {
      // Error fetching
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendedores();
  }, [fetchVendedores]);

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  const handleEdit = (v: Vendedor) => {
    setFormName(v.name);
    setFormEmail(v.email);
    setFormPassword("");
    setEditingId(v.id);
    setShowForm(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!formName || !formEmail) {
      setError("Nombre y email son requeridos");
      return;
    }
    if (!editingId && !formPassword) {
      setError("La contraseña es requerida para nuevos vendedores");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editingId ? `/api/vendedores/${editingId}` : "/api/vendedores";
      const method = editingId ? "PATCH" : "POST";

      const body: Record<string, string> = { name: formName, email: formEmail };
      if (formPassword) body.password = formPassword;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al guardar");
        return;
      }

      resetForm();
      await fetchVendedores();
    } catch {
      setError("Error de conexion");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (v: Vendedor) => {
    try {
      await fetch(`/api/vendedores/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !v.is_active }),
      });
      await fetchVendedores();
    } catch {
      // Error toggling
    }
  };

  const handleDelete = async (v: Vendedor) => {
    if (!confirm(`Estas seguro de eliminar a ${v.name}?`)) return;
    try {
      await fetch(`/api/vendedores/${v.id}`, { method: "DELETE" });
      await fetchVendedores();
    } catch {
      // Error deleting
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const active = vendedores.filter((v) => v.is_active);
  const inactive = vendedores.filter((v) => !v.is_active);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-black">
            {active.length} activos
            {inactive.length > 0 && ` · ${inactive.length} inactivos`}
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Nuevo Vendedor
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>{editingId ? "Editar Vendedor" : "Nuevo Vendedor"}</span>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-black mb-1 block">Nombre completo</label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Maria Lopez" />
              </div>
              <div>
                <label className="text-sm text-black mb-1 block">Email</label>
                <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="vendedor@buenasmaltas.com" type="email" />
              </div>
            </div>
            <div>
              <label className="text-sm text-black mb-1 block">
                Contraseña{editingId && " (dejar vacio para no cambiar)"}
              </label>
              <Input value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder={editingId ? "••••••••" : "Minimo 6 caracteres"} type="password" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? "Guardar Cambios" : "Crear Vendedor"}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {vendedores.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-black">No hay vendedores registrados.</p>
            <p className="text-sm text-black mt-1">Crea el primer vendedor para asignarle rutas de visita.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {vendedores.map((v) => (
            <Card key={v.id} className={cn("transition-opacity", !v.is_active && "opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm", v.is_active ? "bg-amber-600" : "bg-gray-400")}>
                      {v.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{v.name}</p>
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", v.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-black")}>
                          {v.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <p className="text-sm text-black">{v.email}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-black">
                        <span>{v._count.visit_routes} rutas de visita</span>
                        <span>{v._count.created_orders} pedidos creados</span>
                        <span>Creado: {new Date(v.created_at).toLocaleDateString("es-AR")}</span>
                        {v.last_access && <span>Ultimo acceso: {new Date(v.last_access).toLocaleDateString("es-AR")}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleToggleActive(v)} title={v.is_active ? "Desactivar" : "Activar"}>
                      {v.is_active ? <UserX className="w-4 h-4 text-black" /> : <UserCheck className="w-4 h-4 text-green-600" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(v)} title="Editar">
                      <Pencil className="w-4 h-4 text-black" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v)} title="Eliminar">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
