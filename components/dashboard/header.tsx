"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Bienvenido, {session?.user?.name ?? "Usuario"}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-800">
          <User className="w-4 h-4" />
          <span>{session?.user?.email}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 capitalize">
            {(session?.user as { role?: string })?.role ?? "admin"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-4 h-4" />
          Salir
        </Button>
      </div>
    </header>
  );
}
