import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "@/lib/auth.config";
import { djangoJson, djangoPublicFetch } from "@/lib/django-client";
import type { Role } from "@/types/role";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type DjangoLoginResponse = {
  id: string;
  email: string;
  role: Role;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        const response = await djangoPublicFetch("/api/v1/auth/login/", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          return null;
        }

        const { data } = await djangoJson<DjangoLoginResponse>(response);
        if (!data) {
          return null;
        }

        return {
          id: data.id,
          email: data.email,
          role: data.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
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
});