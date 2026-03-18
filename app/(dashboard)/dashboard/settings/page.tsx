"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

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

export default function SettingsPage() {
  const [depot, setDepot] = useState<DepotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form
  const [name, setName] = useState("Depósito Principal");
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [locality, setLocality] = useState("Córdoba");
  const [province, setProvince] = useState("Córdoba");
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
      // Silently fail geocoding
    } finally {
      setGeocoding(false);
    }
  };

  const handleSave = async () => {
    if (!street || !streetNumber || !locality || !latitude || !longitude) return;
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
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configuración</h1>

      <div className="grid gap-6 max-w-2xl">
        {/* Depot config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-amber-600" />
              Configuración del Depósito
            </CardTitle>
            <p className="text-sm text-gray-600">
              Punto de partida y llegada para la generación de rutas.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-700 mb-1 block">
                Nombre del depósito
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Depósito Principal"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-sm text-gray-700 mb-1 block">
                  Calle
                </label>
                <Input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Av. Colón"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-1 block">
                  Número
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
                <label className="text-sm text-gray-700 mb-1 block">
                  Localidad
                </label>
                <Input
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="Córdoba"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-1 block">
                  Provincia
                </label>
                <Input
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="Córdoba"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-1 block">
                  Código Postal
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
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
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
                  <label className="text-xs text-gray-600 mb-1 block">
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
                  <label className="text-xs text-gray-600 mb-1 block">
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
              <label className="text-sm text-gray-700 mb-1 block">
                Radio de validación (metros)
              </label>
              <Input
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(e.target.value)}
                type="number"
                placeholder="200"
              />
              <p className="text-xs text-gray-600 mt-1">
                Distancia máxima para validar check-in/check-out del repartidor.
              </p>
            </div>

            {/* Current depot info */}
            {depot && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800 font-medium">
                  Depósito actual: {depot.name}
                </p>
                <p className="text-xs text-green-700">
                  {depot.street} {depot.street_number}, {depot.locality} · ({depot.latitude}, {depot.longitude})
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
              {saved ? "Guardado" : "Guardar Configuración"}
            </Button>
          </CardContent>
        </Card>

        {/* Info cards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información del Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-medium">Usuarios:</span> admin@buenasmaltas.com (Admin) / chofer@buenasmaltas.com (Repartidor)
            </p>
            <p>
              <span className="font-medium">Microservicio Rutas:</span>{" "}
              {process.env.NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL || "No configurado"}
            </p>
            <p>
              <span className="font-medium">Google Maps:</span>{" "}
              {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "Configurado" : "No configurado"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
