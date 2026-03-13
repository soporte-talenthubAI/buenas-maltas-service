import type { NextAuthConfig } from "next-auth";

// Edge-compatible config (no Prisma, no bcrypt)
// Only contains callbacks and pages needed for middleware
export const authEdgeConfig: NextAuthConfig = {
  providers: [], // Providers are in the full config only
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        if (isLoggedIn) {
          const role = (auth?.user as { role?: string })?.role;
          const redirectTo =
            role === "repartidor" ? "/mis-rutas" : "/dashboard";
          return Response.redirect(new URL(redirectTo, nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
