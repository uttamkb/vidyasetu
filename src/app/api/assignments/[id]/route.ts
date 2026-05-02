import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/assignments/[id] — full assignment with questions (for taking the test)
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
    const assignment = await prisma.assignment.findUniqueOrThrow({
      where: { id },
      include: {
        subject: true,
        chapter: true,
      },
    });

    // Fetch the actual question objects
    const questionList = assignment.questions as Array<{
      questionId: string;
      orderIndex: number;
    }>;

    const questionIds = questionList.map((q) => q.questionId);

    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true,
        type: true,
        difficulty: true,
        bloomLevel: true,
        content: true,
        subtopic: {
          select: {
            id: true,
            name: true,
            topic: {
              select: {
                id: true,
                name: true,
                chapter: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    // Map questions in order, stripping correctAnswer (don't send to client!)
    const questionMap = Object.fromEntries(questions.map((q) => [q.id, q]));
    const orderedQuestions = questionList
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(({ questionId, orderIndex }) => {
        const q = questionMap[questionId];
        if (!q) return null;

        const content = q.content as {
          question: string;
          options?: string[];
          correctAnswer: string;
          explanation: string;
          maxMarks: number;
        };

        return {
          id: q.id,
          orderIndex,
          type: q.type,
          difficulty: q.difficulty,
          bloomLevel: q.bloomLevel,
          subtopic: q.subtopic,
          content: {
            question: content.question,
            options: content.options, // MCQ options (no correct answer yet)
            maxMarks: content.maxMarks,
            // correctAnswer is deliberately excluded here
          },
        };
      })
      .filter(Boolean);

    // Check if student already has a submission
    const existingSubmission = await prisma.submission.findFirst({
      where: { userId: session.user.id, assignmentId: id },
      select: { id: true, status: true, totalScore: true, percentageScore: true },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        type: assignment.type,
        difficulty: assignment.difficulty,
        maxMarks: assignment.maxMarks,
        timeLimit: assignment.timeLimit,
        isAIGenerated: assignment.isAIGenerated,
        subject: assignment.subject,
        chapter: assignment.chapter,
        dueDate: assignment.dueDate,
        questions: orderedQuestions,
        questionCount: orderedQuestions.length,
      },
      existingSubmission,
    });
  } catch (err) {
    console.error(`[GET /api/assignments/${id}]`, err);
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }
}
