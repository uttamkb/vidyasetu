import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/submissions/[id]/status
// Lightweight endpoint for polling evaluation status
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const submission = await prisma.submission.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        status: true,
        totalScore: true,
        maxMarks: true,
        percentageScore: true,
        aiFeedback: true,
        evaluatedAt: true,
      },
    });

    return NextResponse.json(submission);
  } catch (err) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
}
