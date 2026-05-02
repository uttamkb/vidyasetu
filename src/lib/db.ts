/**
 * db.ts — Prisma client singleton
 *
 * Prisma v7 uses a Wasm-based query engine that REQUIRES a driver adapter.
 * We use @prisma/adapter-neon which connects to Neon PostgreSQL over HTTP
 * (no WebSocket / no `ws` package needed for serverless HTTP connections).
 *
 * The singleton pattern (globalForPrisma) prevents multiple client instances
 * during Next.js hot-module replacement in development.
 *
 * IMPORTANT: This file must only be imported in Node.js server contexts
 * (API routes, Server Components, server actions). Never import from middleware.
 */
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "[db] DATABASE_URL is not set.\n" +
      "Make sure .env.local contains:\n" +
      "  DATABASE_URL=postgresql://user:pass@host/db\n"
    );
  }

  // PrismaNeon accepts a PoolConfig (connection string or object), not a Pool instance.
  // It manages its own connection pool internally.
  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
