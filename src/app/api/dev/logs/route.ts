import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * /api/dev/logs — Development-only diagnostic route to view SystemLog table.
 * Usage: visit http://localhost:3000/api/dev/logs in your browser.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const logs = await prisma.systemLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      count: logs.length,
      logs: logs.map(log => ({
        id: log.id,
        time: log.createdAt.toISOString(),
        level: log.level,
        category: log.category,
        message: log.message,
        metadata: log.metadata,
        userId: log.userId
      }))
    });
  } catch (error) {
    console.error("[api/dev/logs] Failed to fetch logs:", error);
    return NextResponse.json({ 
      error: "Failed to fetch logs from database",
      details: String(error)
    }, { status: 500 });
  }
}
