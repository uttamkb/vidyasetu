import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateRemedialAssignment } from "@/services/recommendation-engine";
import { z } from "zod";

const remedialSchema = z.object({
  subtopicId: z.string().uuid("Invalid subtopic ID"),
});

// POST /api/recommendations/remedial — generate remedial assignment for a weak subtopic
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = remedialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const { assignment } = await generateRemedialAssignment(
      session.user.id,
      parsed.data.subtopicId
    );

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        type: assignment.type,
        difficulty: assignment.difficulty,
        maxMarks: assignment.maxMarks,
        isAIGenerated: assignment.isAIGenerated,
      },
    });
  } catch (err) {
    console.error("[POST /api/recommendations/remedial]", err);
    return NextResponse.json({ error: "Failed to generate remedial assignment" }, { status: 500 });
  }
}
