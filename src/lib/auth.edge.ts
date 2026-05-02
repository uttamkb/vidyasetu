/**
 * auth.edge.ts — Thin Edge Runtime entry point for Middleware
 *
 * Middleware runs in the Edge Runtime which cannot use Node.js APIs.
 * This file re-exports only the `auth` function from a config that has
 * NO database imports, making it safe for middleware use.
 *
 * The `auth` exported here:
 *  - Can validate JWT session cookies (no DB needed)
 *  - Can check isLoggedIn / isOnboarded from the token
 *  - CANNOT make database queries
 */
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// We only need `auth` for middleware route protection.
// Callbacks in authConfig are pure (read token only) so this is safe on the Edge.
export const { auth } = NextAuth(authConfig);
