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
import { authConfig } from "./auth.config";
import { prisma } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  // PrismaAdapter persists OAuth accounts and users to the database.
  // Not needed for JWT-only sessions but required for OAuth account linking.
  adapter: PrismaAdapter(prisma),

  callbacks: {
    /**
     * JWT callback — runs server-side only (Node.js).
     * On first sign-in (user is populated): syncs user from DB and stores key
     * fields in the JWT so subsequent requests don't need DB lookups.
     * On subsequent requests: token already has the data, no DB call needed.
     */
    async jwt({ token, user, trigger, session }) {
      /**
       * `user` is only populated on the initial sign-in event.
       * With PrismaAdapter, the adapter has ALREADY created/linked the User+Account
       * in the database by the time this callback fires. The `user` object here
       * is the fully-resolved DB record from the adapter. We just copy fields to token.
       */
      if (user) {
        const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
        const isOwner = ownerEmail && user.email?.toLowerCase() === ownerEmail;

        token.id = user.id;
        token.name = user.name;
        token.image = user.image;
        token.isOnboarded = (user as any).isOnboarded ?? false;
        token.isActive = (user as any).isActive ?? true;

        // Determine role: owner always gets SUPER_ADMIN, otherwise use the DB role
        if (isOwner && (user as any).role !== "SUPER_ADMIN") {
          // Promote owner asynchronously — fire-and-forget, non-blocking
          prisma.user.update({
            where: { id: user.id! },
            data: { role: "SUPER_ADMIN" },
          }).then(() => {
            console.log(`[auth] Promoted ${user.email} to SUPER_ADMIN`);
          }).catch((e: unknown) => {
            console.error("[auth] Failed to promote owner:", e);
          });
          token.role = "SUPER_ADMIN";
        } else {
          token.role = ((user as any).role as "STUDENT" | "ADMIN" | "SUPER_ADMIN") ?? "STUDENT";
        }
      }

      // Handle session.update() calls (e.g., after onboarding completes)
      if (trigger === "update" && session) {
        if (session.name !== undefined) token.name = session.name;
        if (session.image !== undefined) token.image = session.image;
        if (session.isOnboarded !== undefined) token.isOnboarded = session.isOnboarded;
        if (session.state !== undefined) token.state = session.state;
        if (session.district !== undefined) token.district = session.district;
        if (session.school !== undefined) token.school = session.school;
        if (session.role !== undefined) token.role = session.role;
        if (session.isActive !== undefined) token.isActive = session.isActive;
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
        session.user.name = token.name as string;
        session.user.image = token.image as string;
        session.user.isOnboarded = (token.isOnboarded as boolean) ?? false;
        session.user.role = (token.role as "STUDENT" | "ADMIN" | "SUPER_ADMIN") ?? "STUDENT";
        session.user.isActive = (token.isActive as boolean) ?? true;
        session.user.state = token.state as string | null;
        session.user.district = token.district as string | null;
        session.user.school = token.school as string | null;
      }
      return session;
    },
  },
});
