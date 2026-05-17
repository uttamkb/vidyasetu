/**
 * GET /api/admin/health-check
 *
 * System diagnostics: Database, Inngest, Gemini API.
 * Admin-only. Read-only (writes to SystemHealthCheck table for tracking).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

async function checkDatabase(): Promise<{ status: string; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "HEALTHY", latencyMs: Date.now() - start };
  } catch (err) {
    return { status: "DOWN", latencyMs: Date.now() - start, error: (err as Error).message };
  }
}

async function checkGemini(): Promise<{ status: string; latencyMs: number; error?: string }> {
  const start = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { status: "DEGRADED", latencyMs: 0, error: "GEMINI_API_KEY not set" };
  }
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return { status: "HEALTHY", latencyMs: Date.now() - start };
    }
    return { status: "DEGRADED", latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
  } catch (err) {
    return { status: "DOWN", latencyMs: Date.now() - start, error: (err as Error).message };
  }
}

async function checkInngest(): Promise<{ status: string; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    // Check if Inngest dev server is reachable (local dev) or use event key presence
    const devUrl = "http://localhost:8288";
    const res = await fetch(`${devUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);

    if (res?.ok) {
      return { status: "HEALTHY", latencyMs: Date.now() - start };
    }

    // Fallback: check if event key is configured (production mode)
    if (process.env.INNGEST_EVENT_KEY) {
      return { status: "HEALTHY", latencyMs: Date.now() - start };
    }

    return { status: "DEGRADED", latencyMs: Date.now() - start, error: "Inngest dev server not reachable, no event key configured" };
  } catch (err) {
    return { status: "DOWN", latencyMs: Date.now() - start, error: (err as Error).message };
  }
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [db, gemini, inngestStatus] = await Promise.all([
    checkDatabase(),
    checkGemini(),
    checkInngest(),
  ]);

  const results = {
    database: db,
    gemini: gemini,
    inngest: inngestStatus,
    timestamp: new Date().toISOString(),
  };

  // Log to SystemHealthCheck table for historical tracking
  try {
    await prisma.systemHealthCheck.createMany({
      data: [
        { service: "DATABASE", status: db.status, latencyMs: db.latencyMs, errorMessage: db.error },
        { service: "GEMINI_API", status: gemini.status, latencyMs: gemini.latencyMs, errorMessage: gemini.error },
        { service: "INNGEST", status: inngestStatus.status, latencyMs: inngestStatus.latencyMs, errorMessage: inngestStatus.error },
      ],
    });
  } catch (logErr) {
    console.error("[health-check] Failed to log to SystemHealthCheck:", logErr);
  }

  return NextResponse.json(results);
}
