"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Truck,
  MapPin,
  Clock,
  Loader2,
  Navigation,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface RouteForDriver {
  id: string;
  route_code: string;
  scheduled_date: string;
  status: string;
  total_distance_km: string | null;
  estimated_duration: number | null;
  google_maps_url: string | null;
  _count: { route_orders: number };
}

const STATUS_COLORS: Record<string, string> = {
  planificada: "bg-blue-100 text-blue-800",
  en_curso: "bg-amber-100 text-amber-800",
  completada: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-800",
};

export default function MisRutasPage() {
  const { data: session } = useSession();
  const [routes, setRoutes] = useState<RouteForDriver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/rutas?driverId=${session.user.id}`)
      .then((r) => r.json())
      .then((data) => {
        setRoutes(data);
        setLoading(false);
      });
  }, [session?.user?.id]);

  const today = new Date().toISOString().split("T")[0];
  const todayRoutes = routes.filter(
    (r) => r.scheduled_date.split("T")[0] === today
  );
  const otherRoutes = routes.filter(
    (r) => r.scheduled_date.split("T")[0] !== today
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Truck className="w-6 h-6 text-amber-600" />
        <h1 className="text-xl font-bold text-black">Mis Rutas</h1>
      </div>

      {/* Today's routes */}
      <div>
        <h2 className="text-sm font-medium text-black mb-3">
          Hoy · {new Date().toLocaleDateString("es-AR")}
        </h2>
        {todayRoutes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Navigation className="w-10 h-10 text-gray-500 mx-auto mb-3" />
              <p className="text-black text-sm">
                No tenés rutas asignadas para hoy.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayRoutes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        )}
      </div>

      {/* Other routes */}
      {otherRoutes.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-black mb-3">
            Otras rutas
          </h2>
          <div className="space-y-3">
            {otherRoutes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RouteCard({ route }: { route: RouteForDriver }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium">{route.route_code}</p>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
              STATUS_COLORS[route.status]
            )}
          >
            {route.status.replace("_", " ")}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-black mb-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(route.scheduled_date).toLocaleDateString("es-AR")}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {route._count.route_orders} paradas
          </span>
          {route.total_distance_km && (
            <span>{Number(route.total_distance_km).toFixed(1)} km</span>
          )}
          {route.estimated_duration && <span>{route.estimated_duration} min</span>}
        </div>
        <div className="flex gap-2">
          <Link href={`/mis-rutas/${route.id}`} className="flex-1">
            <Button className="w-full" size="sm">
              <Navigation className="w-4 h-4" />
              {route.status === "en_curso" ? "Continuar" : "Ver Ruta"}
            </Button>
          </Link>
          {route.google_maps_url && (
            <a
              href={route.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
