"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { NuevoPedidoForm } from "@/components/pedidos/nuevo-pedido-form";

export default function NuevoPedidoPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>}>
      <NuevoPedidoPageInner />
    </Suspense>
  );
}

function NuevoPedidoPageInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clienteId");

  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <NuevoPedidoForm
      backUrl="/ventas/pedidos"
      userId={session.user.id}
      preselectedClientId={preselectedClientId}
    />
  );
}
