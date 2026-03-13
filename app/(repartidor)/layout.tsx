import { SessionProvider } from "@/lib/auth/session-provider";

export default function RepartidorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="h-16 bg-amber-600 text-white flex items-center justify-between px-6 shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">Buenas Maltas</span>
            <span className="text-sm opacity-80">| Repartidor</span>
          </div>
        </header>
        <main className="p-4 max-w-lg mx-auto">{children}</main>
      </div>
    </SessionProvider>
  );
}
