import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/subjects
 * Flat list of subjects for selection dropdowns.
 */
export async function GET(req: NextRequest) {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: [
        { grade: "asc" },
        { name: "asc" }
      ],
      select: {
        id: true,
        name: true,
        grade: true,
        board: true,
        color: true,
      }
    });

    return NextResponse.json(subjects);
  } catch (error) {
    console.error("[api/subjects] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
