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

export const authConfig = {
  providers: [
    // Google OAuth — clientId/Secret are loaded from env at runtime
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],

  session: { strategy: "jwt" },

  trustHost: true,

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
        token.role = ((user as any).role as "STUDENT" | "ADMIN" | "SUPER_ADMIN") ?? "STUDENT";
        token.isActive = (user as any).isActive ?? true;
      }
      // Handle session.update() calls (e.g. after onboarding completes)
      if (trigger === "update" && session?.isOnboarded !== undefined) {
        token.isOnboarded = session.isOnboarded;
      }
      if (trigger === "update" && session?.role !== undefined) {
        token.role = session.role;
      }
      if (trigger === "update" && session?.isActive !== undefined) {
        token.isActive = session.isActive;
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
        session.user.role = (token.role as "STUDENT" | "ADMIN" | "SUPER_ADMIN") ?? "STUDENT";
        session.user.isActive = (token.isActive as boolean) ?? true;
      }
      return session;
    },

    /**
     * Middleware route guard — runs on Edge.
     * Redirects unauthenticated users away from protected routes.
     */
    authorized({ auth: authSession, request: { nextUrl } }) {
      const isLoggedIn = !!authSession?.user;
      const role = (authSession?.user as any)?.role;
      const pathname = nextUrl.pathname;

      // 1. Unauthenticated users cannot access protected routes
      const PROTECTED_ROUTES = [
        "/dashboard",
        "/assignments",
        "/progress",
        "/study-materials",
        "/profile",
        "/onboarding",
        "/admin",
      ];
      
      const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

      if (isProtectedRoute && !isLoggedIn) return false;

      // 2. Redirect authenticated users from public pages to their dashboard
      if (isLoggedIn && (pathname === "/" || pathname === "/login")) {
        console.log(`[auth.config] Redirecting logged-in ${role} from ${pathname}`);
        if (role === "ADMIN" || role === "SUPER_ADMIN") {
          return Response.redirect(new URL("/admin", nextUrl));
        }
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // 3. Prevent role-mismatch (Student in Admin, Admin in Student)
      // This ensures smooth transitions when logging out and in with different roles
      if (isLoggedIn) {
        if (pathname.startsWith("/admin") && role === "STUDENT") {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        if (pathname.startsWith("/dashboard") && (role === "ADMIN" || role === "SUPER_ADMIN")) {
          return Response.redirect(new URL("/admin", nextUrl));
        }
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
