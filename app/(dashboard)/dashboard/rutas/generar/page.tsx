import { SmartRouteGenerator } from "@/components/rutas/smart-route-generator";

export default function GenerarRutaPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-black mb-6">
        Generar Ruta Inteligente
      </h1>
      <SmartRouteGenerator />
    </div>
  );
}
