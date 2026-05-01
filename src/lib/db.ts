import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    // Lazy fail: only throw when actually trying to use the DB
    // This prevents build-time / middleware evaluation crashes
    console.warn("[db.ts] DATABASE_URL is not set — Prisma client will not work.");
    // Return a Proxy that throws on usage
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error("DATABASE_URL is not set. Please configure your environment.");
      },
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaNeon({ connectionString: databaseUrl } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();
