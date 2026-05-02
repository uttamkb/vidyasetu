import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/submissions/[id] — full evaluation result with per-question breakdown
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
      where: { id, userId: session.user.id }, // ensure user owns this submission
      include: {
        assignment: {
          include: {
            subject: true,
            chapter: true,
          },
        },
      },
    });

    if (submission.status !== "EVALUATED") {
      return NextResponse.json(
        { error: "Submission is still being evaluated. Please wait.", status: submission.status },
        { status: 202 }
      );
    }

    // Enrich answers with question content (for result display)
    const answers = submission.answers as Array<{
      questionId: string;
      userAnswer: string | number | null;
      isCorrect: boolean;
      marksAwarded: number;
      maxMarks: number;
      feedback: string;
      correction: string;
      explanation: string;
    }>;

    const questionIds = answers.map((a) => a.questionId);
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true,
        type: true,
        content: true,
        subtopic: {
          select: {
            name: true,
            topic: { select: { name: true, chapter: { select: { name: true } } } },
          },
        },
      },
    });
    const qMap = Object.fromEntries(questions.map((q) => [q.id, q]));

    const enrichedAnswers = answers.map((a) => {
      const q = qMap[a.questionId];
      const content = q?.content as {
        question: string;
        options?: string[];
        correctAnswer: string;
        maxMarks: number;
      } | undefined;

      return {
        questionId: a.questionId,
        questionText: content?.question ?? "Question not found",
        options: content?.options,
        correctAnswer: content?.correctAnswer, // revealed after evaluation
        userAnswer: a.userAnswer,
        isCorrect: a.isCorrect,
        marksAwarded: a.marksAwarded,
        maxMarks: a.maxMarks,
        feedback: a.feedback,
        correction: a.correction,
        explanation: a.explanation,
        type: q?.type,
        subtopicName: q?.subtopic?.name,
        topicName: q?.subtopic?.topic?.name,
        chapterName: q?.subtopic?.topic?.chapter?.name,
      };
    });

    // Summary stats
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const incorrectCount = answers.filter((a) => !a.isCorrect).length;

    return NextResponse.json({
      submission: {
        id: submission.id,
        status: submission.status,
        totalScore: submission.totalScore,
        maxMarks: submission.maxMarks,
        percentageScore: submission.percentageScore,
        aiFeedback: submission.aiFeedback,
        submittedAt: submission.submittedAt,
        evaluatedAt: submission.evaluatedAt,
        timeTaken: submission.timeTaken,
        assignment: {
          id: submission.assignment.id,
          title: submission.assignment.title,
          type: submission.assignment.type,
          difficulty: submission.assignment.difficulty,
          subject: submission.assignment.subject,
          chapter: submission.assignment.chapter,
        },
        stats: {
          total: answers.length,
          correct: correctCount,
          incorrect: incorrectCount,
          accuracy: answers.length > 0
            ? Math.round((correctCount / answers.length) * 100)
            : 0,
        },
        answers: enrichedAnswers,
      },
    });
  } catch (err) {
    console.error(`[GET /api/submissions/${id}]`, err);
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
}
