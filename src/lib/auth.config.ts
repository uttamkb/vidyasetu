/**
 * auth.config.ts — EDGE-SAFE configuration
 *
 * This file is imported by middleware (which runs on the Edge Runtime).
 * It must NOT import anything that uses Node.js-only APIs (fs, crypto, prisma, etc.).
 *
 * Rules:
 *  - No imports from ./db or @prisma/client
 *  - No imports from @neondatabase/serverless
 *  - Only provider definitions and JWT-based callbacks that read from the token
 */
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

export const authConfig = {
  providers: [
    // Google OAuth — clientId/Secret are loaded from env at runtime
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    // Credentials provider — authorize() logic lives in auth.ts (Node-only)
    // This stub is needed so NextAuth knows this provider exists at the Edge.
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // Intentionally returns null — real logic is in auth.ts
      authorize: () => null,
    }),
  ],

  session: { strategy: "jwt" },

  pages: { signIn: "/login" },

  callbacks: {
    /**
     * JWT callback — runs on Edge AND Node.
     * Only reads from token here (no DB access). DB sync happens in auth.ts.
     */
    jwt({ token, user, trigger, session }) {
      // On first sign-in, `user` is populated — copy fields to token
      if (user) {
        token.id = user.id;
        token.isOnboarded = (user as any).isOnboarded ?? false;
        token.role = (user as any).role ?? "STUDENT";
      }
      // Handle session.update() calls (e.g. after onboarding completes)
      if (trigger === "update" && session?.isOnboarded !== undefined) {
        token.isOnboarded = session.isOnboarded;
      }
      if (trigger === "update" && session?.role !== undefined) {
        token.role = session.role;
      }
      return token;
    },

    /**
     * Session callback — shapes the session object the client receives.
     * Only reads from token, no DB calls.
     */
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
        session.user.isOnboarded = (token.isOnboarded as boolean) ?? false;
        session.user.role = (token.role as string) ?? "STUDENT";
      }
      return session;
    },

    /**
     * Middleware route guard — runs on Edge.
     * Redirects unauthenticated users away from protected routes.
     */
    authorized({ auth: authSession, request: { nextUrl } }) {
      const isLoggedIn = !!authSession?.user;
      const isProtected =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/assignments") ||
        nextUrl.pathname.startsWith("/progress") ||
        nextUrl.pathname.startsWith("/study-materials") ||
        nextUrl.pathname.startsWith("/profile");

      if (isProtected && !isLoggedIn) return false; // → redirects to /login
      return true;
    },
  },
} satisfies NextAuthConfig;
