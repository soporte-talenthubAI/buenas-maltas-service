"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Beer,
  LayoutDashboard,
  ClipboardList,
  FileText,
  Route,
  BarChart3,
  Settings,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/dashboard/documentos", label: "Documentos", icon: FileText },
  { href: "/dashboard/rutas", label: "Rutas Entrega", icon: Route },
  { href: "/dashboard/visitas", label: "Visitas Vendedor", icon: MapPin },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6 flex items-center gap-3 border-b border-gray-800">
        <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
          <Beer className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg">Buenas Maltas</h1>
          <p className="text-xs text-gray-400">Sistema de Gestión</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-amber-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 text-center">v1.0.0</p>
      </div>
    </aside>
  );
}
