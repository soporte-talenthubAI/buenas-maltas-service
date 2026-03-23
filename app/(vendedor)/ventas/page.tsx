"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Users,
  PlusCircle,
  TrendingUp,
  Loader2,
  UserPlus,
} from "lucide-react";

interface Stats {
  totalPedidos: number;
  pedidosPendientes: number;
  totalClientes: number;
  clientesPotenciales: number;
  ventasMes: number;
}

export default function VendedorDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<
    { id: string; order_number: string; status: string; total: number; customer: { commercial_name: string } }[]
  >([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/pedidos?limit=5").then((r) => r.json()),
      fetch("/api/clientes").then((r) => r.json()),
    ]).then(([ordersData, customers]) => {
      const orders = ordersData.orders || [];
      setRecentOrders(orders.slice(0, 5));

      // Calculate stats
      const pendientes = orders.filter((o: { status: string }) => o.status === "pendiente").length;
      const ventasMes = orders.reduce((s: number, o: { total: number }) => s + Number(o.total || 0), 0);

      // Potential clients: customers without orders (we approximate from the data we have)
      setStats({
        totalPedidos: ordersData.total || orders.length,
        pedidosPendientes: pendientes,
        totalClientes: customers.length,
        clientesPotenciales: 0, // Will be calculated server-side
        ventasMes,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">Dashboard Vendedor</h1>
        <Link href="/ventas/pedidos/nuevo">
          <Button className="bg-amber-600 hover:bg-amber-700 text-white">
            <PlusCircle className="w-4 h-4 mr-2" />
            Nuevo Pedido
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalPedidos || 0}</p>
                <p className="text-xs text-black">Pedidos Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pedidosPendientes || 0}</p>
                <p className="text-xs text-black">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalClientes || 0}</p>
                <p className="text-xs text-black">Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${(stats?.ventasMes || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-black">Ventas del Mes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/ventas/pedidos/nuevo" className="block">
              <Button variant="outline" className="w-full justify-start">
                <PlusCircle className="w-4 h-4 mr-2" />
                Crear Pedido
              </Button>
            </Link>
            <Link href="/ventas/clientes/nuevo" className="block">
              <Button variant="outline" className="w-full justify-start">
                <UserPlus className="w-4 h-4 mr-2" />
                Nuevo Cliente
              </Button>
            </Link>
            <Link href="/ventas/clientes" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                Ver Clientes
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Últimos Pedidos</CardTitle>
            <Link href="/ventas/pedidos">
              <Button variant="ghost" size="sm">Ver todos</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-black text-center py-6">No hay pedidos aún</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-black">
                    <th className="pb-2">Pedido</th>
                    <th className="pb-2">Cliente</th>
                    <th className="pb-2">Estado</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-medium text-black">{order.order_number}</td>
                      <td className="py-2 text-black">{order.customer?.commercial_name}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          order.status === "entregado" ? "bg-green-100 text-green-700" :
                          order.status === "pendiente" ? "bg-yellow-100 text-yellow-700" :
                          order.status === "confirmado" ? "bg-blue-100 text-blue-700" :
                          order.status === "cancelado" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-black"
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-2 text-right font-medium text-black">
                        ${Number(order.total).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
