import { notFound } from "next/navigation";
import Link from "next/link";
import { rutasInteligentesService } from "@/lib/services/rutas-inteligentes.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MapPin,
  Truck,
  Clock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const DELIVERY_STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  entregado: "bg-green-100 text-green-800",
  no_entregado: "bg-red-100 text-red-800",
  reprogramado: "bg-blue-100 text-blue-800",
};

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const route = await rutasInteligentesService.getRouteById(id);

  if (!route) notFound();

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/rutas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {route.route_code}
          </h1>
          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(route.scheduled_date).toLocaleDateString("es-AR")}
            </span>
            <span className="flex items-center gap-1">
              <Truck className="w-3 h-3" />
              {route.driver.name}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {route.route_orders.length}
            </p>
            <p className="text-xs text-gray-500">Paradas</p>
          </CardContent>
        </Card>
        {route.total_distance_km && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">
                {Number(route.total_distance_km).toFixed(1)} km
              </p>
              <p className="text-xs text-gray-500">Distancia</p>
            </CardContent>
          </Card>
        )}
        {route.estimated_duration && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{route.estimated_duration} min</p>
              <p className="text-xs text-gray-500">Duración</p>
            </CardContent>
          </Card>
        )}
        {route.total_cost && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">
                ${Number(route.total_cost).toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">Costo Total</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Map link */}
      {route.google_maps_url && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <a
              href={route.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full">
                <ExternalLink className="w-4 h-4" />
                Ver Ruta en Google Maps
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* Stops */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Paradas ({route.route_orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {route.route_orders.map((ro) => (
              <div
                key={ro.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
              >
                <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {ro.delivery_order}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {ro.order.customer.commercial_name}
                    </p>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs capitalize",
                        DELIVERY_STATUS_COLORS[ro.status]
                      )}
                    >
                      {ro.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {ro.order.customer.street}{" "}
                    {ro.order.customer.street_number},{" "}
                    {ro.order.customer.locality}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Pedido: {ro.order.order_number} · $
                    {Number(ro.order.total).toLocaleString("es-AR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
