import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { transcribeExamPaper } from "@/services/transcription-engine";
import { z } from "zod";

const scanSchema = z.object({
  assignmentId: z.string().uuid(),
  images: z.array(z.string()).min(1), // Base64 data URLs
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = scanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { assignmentId, images } = parsed.data;

    // Fetch assignment questions to provide context to the transcription AI
    const assignment = await prisma.assignment.findUniqueOrThrow({
      where: { id: assignmentId },
      select: { questions: true },
    });

    // The questions field holds [{questionId, orderIndex}] pointers.
    const questions = (assignment.questions as any[]) || [];
    const questionIds = questions.map((q) => q.questionId).filter(Boolean);

    const fetchedQuestions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
    });

    // Map pointers to full question content
    const fullQuestions = questions.map((pointer) => {
      const q = fetchedQuestions.find((fq) => fq.id === pointer.questionId);
      return q || pointer; // Fallback to pointer if not found
    });

    // Perform AI transcription
    const result = await transcribeExamPaper(assignmentId, images, fullQuestions);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/assignments/scan] Error:", err);
    return NextResponse.json({ error: "Failed to process scan" }, { status: 500 });
  }
}
