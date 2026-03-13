import NextAuth from "next-auth";
import { authEdgeConfig } from "@/lib/auth/auth.edge";

const { auth } = NextAuth(authEdgeConfig);

export default auth;

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
