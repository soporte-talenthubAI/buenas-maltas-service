"use client";

import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { NuevoPedidoForm } from "@/components/pedidos/nuevo-pedido-form";

export default function AdminNuevoPedidoPage() {
  const { data: session } = useSession();

  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <NuevoPedidoForm
      backUrl="/dashboard/pedidos"
      userId={session.user.id}
    />
  );
}
