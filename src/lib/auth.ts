/**
 * auth.ts — NODE.JS ONLY auth configuration
 *
 * This file runs exclusively in the Node.js runtime (API routes, Server Components).
 * It extends authConfig with:
 *  - PrismaAdapter for OAuth account/user persistence
 *  - Real Credentials authorize() logic with DB access
 *  - JWT callback that syncs user data from DB on first sign-in
 *
 * DO NOT import this file from middleware — use auth.edge.ts instead.
 */
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { prisma } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  // PrismaAdapter persists OAuth accounts and users to the database.
  // Not needed for JWT-only sessions but required for OAuth account linking.
  adapter: PrismaAdapter(prisma),

  // Override the stub Credentials provider with the real authorize logic.
  providers: [
    // Keep all non-credentials providers (Google, etc.) from authConfig
    ...authConfig.providers.filter((p) => p.id !== "credentials"),

    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");

        // Demo account — hardcoded for MVP testing
        if (email !== "student@example.com" || password !== "password") {
          return null; // Returning null triggers "Invalid credentials" on client
        }

        // Ensure the demo user exists in the DB (upsert is idempotent)
        const user = await prisma.user.upsert({
          where: { email },
          update: { name: "Demo Student" },
          create: { email, name: "Demo Student", grade: "9", role: "STUDENT" },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          isOnboarded: user.isOnboarded,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * JWT callback — runs server-side only (Node.js).
     * On first sign-in (user is populated): syncs user from DB and stores key
     * fields in the JWT so subsequent requests don't need DB lookups.
     * On subsequent requests: token already has the data, no DB call needed.
     */
    async jwt({ token, user, trigger, session }) {
      // `user` is only populated on the initial sign-in event
      if (user) {
        // For Credentials: authorize() already returned the DB user with isOnboarded.
        // For OAuth (Google): sync with DB to get/create the user record.
        if (user.id?.startsWith("demo-") || !user.email) {
          // Fallback path — should not normally be reached
          token.id = user.id;
          token.isOnboarded = false;
          token.role = "STUDENT";
        } else {
          try {
            const dbUser = await prisma.user.upsert({
              where: { email: user.email },
              update: { name: user.name, image: user.image },
              create: { email: user.email, name: user.name, image: user.image, grade: "9", role: "STUDENT" },
              select: { id: true, isOnboarded: true, role: true },
            });
            token.id = dbUser.id;
            token.isOnboarded = dbUser.isOnboarded;
            token.role = dbUser.role;
          } catch (err) {
            console.error("[auth] jwt callback DB sync failed:", err);
            token.id = user.id;
            token.isOnboarded = false;
            token.role = "STUDENT";
          }
        }
      }

      // Handle session.update() calls (e.g. after completing onboarding flow)
      if (trigger === "update" && session?.isOnboarded !== undefined) {
        token.isOnboarded = session.isOnboarded;
      }

      return token;
    },

    /**
     * Session callback — shapes what the client-side useSession() receives.
     * Reads from the JWT token only, no DB access.
     */
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
        session.user.isOnboarded = (token.isOnboarded as boolean) ?? false;
        session.user.role = (token.role as string) ?? "STUDENT";
      }
      return session;
    },
  },
});
