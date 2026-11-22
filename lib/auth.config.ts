import type { NextAuthConfig } from "next-auth";

import type { Role } from "@/types/role";

function isProtectedRoute(pathname: string) {
  return (
    pathname.startsWith("/trainer") ||
    pathname.startsWith("/subscription") ||
    pathname.startsWith("/admin")
  );
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const pathname = request.nextUrl.pathname;
      const isAuthRoute =
        pathname === "/login" || pathname === "/register";

      if (isProtectedRoute(pathname)) {
        return isLoggedIn;
      }

      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL("/trainer", request.nextUrl.origin));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      if (session.user) {
        session.user.role = (token.role as Role | undefined) ?? "USER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;