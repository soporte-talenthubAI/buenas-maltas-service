import { SessionProvider } from "@/lib/auth/session-provider";
import { VendedorSidebar } from "@/components/vendedor/sidebar";
import { Header } from "@/components/dashboard/header";

export default function VendedorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50">
        <VendedorSidebar />
        <div className="ml-64">
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
