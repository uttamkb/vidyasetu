import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/schools
 * Returns a list of all schools for admin selection in the ingestion pipeline.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const schools = await prisma.school.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        state: true,
        district: true,
        board: true,
        _count: {
          select: {
            questions: true,
            sourceDocuments: true,
          }
        }
      }
    });

    return NextResponse.json(schools);
  } catch (error) {
    console.error("[api/admin/schools] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/schools
 * Create a new school record.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { name, state, district, board } = body;

    if (!name) {
      return NextResponse.json({ error: "School name is required" }, { status: 400 });
    }

    const school = await prisma.school.create({
      data: {
        name,
        state,
        district,
        board: board || "CBSE",
      }
    });

    return NextResponse.json(school);
  } catch (error) {
    console.error("[api/admin/schools] POST error:", error);
    return NextResponse.json({ error: "Failed to create school" }, { status: 500 });
  }
}
