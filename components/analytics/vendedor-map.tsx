"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface CustomerCoord {
  name: string;
  locality: string;
  lat: number;
  lng: number;
  isReal: boolean;
  revenue: number;
  orders: number;
  vendedor: string;
}

interface VendedorDetail {
  name: string;
  customers: {
    name: string;
    locality: string;
    isReal: boolean;
    orders: number;
    revenue: number;
    hasCoords: boolean;
  }[];
}

interface VendedorMapProps {
  vendedores: VendedorDetail[];
  selectedVendedor: string;
}

const formatCurrency = (v: number) =>
  "$ " + v.toLocaleString("es-AR", { maximumFractionDigits: 0 });

// Vendedor color palette
const VENDEDOR_COLORS = [
  "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  "#06b6d4", "#e11d44", "#a855f7", "#eab308", "#22c55e",
];

export default function VendedorMap({ vendedores, selectedVendedor }: VendedorMapProps) {
  const [customerCoords, setCustomerCoords] = useState<CustomerCoord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch customers with coordinates from DB
    fetch("/api/customers-coords")
      .then((r) => r.json())
      .then((data: { id: string; commercial_name: string; locality: string; latitude: number; longitude: number }[]) => {
        // Map customers to vendedores
        const coords: CustomerCoord[] = [];
        const customerMap = new Map(data.map(c => [c.commercial_name, c]));

        for (const v of vendedores) {
          for (const c of v.customers) {
            const cData = customerMap.get(c.name);
            if (cData && cData.latitude && cData.longitude) {
              coords.push({
                name: c.name,
                locality: c.locality,
                lat: cData.latitude,
                lng: cData.longitude,
                isReal: c.isReal,
                revenue: c.revenue,
                orders: c.orders,
                vendedor: v.name,
              });
            }
          }
        }
        setCustomerCoords(coords);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [vendedores]);

  const filteredCoords = useMemo(() => {
    if (!selectedVendedor) return customerCoords;
    return customerCoords.filter(c => c.vendedor === selectedVendedor);
  }, [customerCoords, selectedVendedor]);

  // Deduplicate by customer name (same customer may appear for multiple vendedores)
  const uniqueCoords = useMemo(() => {
    if (selectedVendedor) return filteredCoords;
    const seen = new Map<string, CustomerCoord>();
    for (const c of filteredCoords) {
      if (!seen.has(c.name) || c.revenue > (seen.get(c.name)?.revenue || 0)) {
        seen.set(c.name, c);
      }
    }
    return [...seen.values()];
  }, [filteredCoords, selectedVendedor]);

  const vendedorColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    vendedores.forEach((v, i) => {
      map[v.name] = VENDEDOR_COLORS[i % VENDEDOR_COLORS.length];
    });
    return map;
  }, [vendedores]);

  if (loading) {
    return (
      <div className="h-[500px] bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
        Cargando coordenadas...
      </div>
    );
  }

  if (uniqueCoords.length === 0) {
    return (
      <div className="h-[500px] bg-gray-50 rounded-lg flex flex-col items-center justify-center text-gray-400 gap-2">
        <p className="text-lg font-medium">Sin coordenadas disponibles</p>
        <p className="text-sm">Usá el botón &quot;Geocodificar Clientes&quot; para obtener las coordenadas de las direcciones</p>
      </div>
    );
  }

  // Center on Córdoba, Argentina
  const center: [number, number] = [-31.4135, -64.1811];

  // Calculate bounds
  const avgLat = uniqueCoords.reduce((s, c) => s + c.lat, 0) / uniqueCoords.length;
  const avgLng = uniqueCoords.reduce((s, c) => s + c.lng, 0) / uniqueCoords.length;
  const mapCenter: [number, number] = [avgLat || center[0], avgLng || center[1]];

  // Max revenue for radius scaling
  const maxRevenue = Math.max(...uniqueCoords.map(c => c.revenue), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Clientes Reales
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Potenciales
        </span>
        <span>{uniqueCoords.length} clientes con coordenadas</span>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={11}
        style={{ height: "500px", borderRadius: "0.5rem" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {uniqueCoords.map((c, i) => {
          const radius = Math.max(6, Math.min(20, (c.revenue / maxRevenue) * 20));
          const color = selectedVendedor
            ? (c.isReal ? "#10b981" : "#f59e0b")
            : (vendedorColorMap[c.vendedor] || "#6b7280");

          return (
            <CircleMarker
              key={`${c.name}-${i}`}
              center={[c.lat, c.lng]}
              radius={radius}
              fillColor={color}
              fillOpacity={0.7}
              color={c.isReal ? "#059669" : "#d97706"}
              weight={2}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">{c.name}</p>
                  <p className="text-gray-600">{c.locality}</p>
                  <p>Vendedor: <strong>{c.vendedor}</strong></p>
                  <p>Tipo: <span className={c.isReal ? "text-green-600" : "text-amber-600"}>{c.isReal ? "Real" : "Potencial"}</span></p>
                  <p>{c.orders} pedidos · {formatCurrency(c.revenue)}</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
