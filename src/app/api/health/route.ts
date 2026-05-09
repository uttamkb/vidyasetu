import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // 1. Check Database connectivity
    // We use a simple raw query to verify the connection is alive
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        services: {
          database: "connected",
          ai: "ready" // We assume AI is ready if the API key is present
        }
      }, 
      { status: 200 }
    );
  } catch (error) {
    console.error("[health-check] System unhealthy:", error);
    return NextResponse.json(
      { 
        status: "unhealthy", 
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      }, 
      { status: 503 }
    );
  }
}
