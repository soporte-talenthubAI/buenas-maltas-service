import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ClipboardList,
  FileText,
  Route,
  TrendingUp,
} from "lucide-react";

const stats = [
  {
    title: "Pedidos Pendientes",
    value: "12",
    description: "3 urgentes",
    icon: ClipboardList,
    color: "text-blue-600 bg-blue-100",
  },
  {
    title: "Documentos Hoy",
    value: "8",
    description: "Facturas y remitos",
    icon: FileText,
    color: "text-green-600 bg-green-100",
  },
  {
    title: "Rutas Activas",
    value: "2",
    description: "15 entregas en curso",
    icon: Route,
    color: "text-amber-600 bg-amber-100",
  },
  {
    title: "Ventas del Mes",
    value: "$2.4M",
    description: "+12% vs mes anterior",
    icon: TrendingUp,
    color: "text-purple-600 bg-purple-100",
  },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-gray-900 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Últimos Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900 text-sm">
              Los pedidos se cargarán desde el módulo de pedidos.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rutas del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900 text-sm">
              Las rutas se cargarán desde el módulo de rutas inteligentes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
