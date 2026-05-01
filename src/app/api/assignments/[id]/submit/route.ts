import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

function evaluateMCQ(userAnswer: string, correctAnswer: string, marks: number): number {
  return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase() ? marks : 0;
}

function evaluateShortAnswer(userAnswer: string, keywords: string[], marks: number): number {
  if (!userAnswer || !keywords || keywords.length === 0) return 0;
  const answer = userAnswer.toLowerCase();
  const matched = keywords.filter((k) => answer.includes(k.toLowerCase()));
  return Math.round((matched.length / keywords.length) * marks);
}

function evaluateLongAnswer(userAnswer: string, keywords: string[], marks: number): number {
  if (!userAnswer || !keywords || keywords.length === 0) return 0;
  const answer = userAnswer.toLowerCase();
  const matched = keywords.filter((k) => answer.includes(k.toLowerCase()));
  const ratio = matched.length / keywords.length;
  if (ratio >= 0.8) return marks;
  if (ratio >= 0.5) return Math.round(marks * 0.7);
  if (ratio >= 0.3) return Math.round(marks * 0.4);
  return Math.round(marks * 0.2);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;
  const body = await request.json();
  const { answers } = body;

  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const questions = assignment.questions as any[];
    let totalScore = 0;
    const feedbackItems: string[] = [];

    for (const answer of answers) {
      const question = questions[answer.questionIndex];
      if (!question) continue;

      let score = 0;
      if (question.type === "MCQ") {
        score = evaluateMCQ(answer.answer, question.correctAnswer, question.marks);
      } else if (question.type === "SHORT_ANSWER") {
        score = evaluateShortAnswer(answer.answer, question.keywords, question.marks);
      } else if (question.type === "LONG_ANSWER") {
        score = evaluateLongAnswer(answer.answer, question.keywords, question.marks);
      }

      totalScore += score;

      if (score === question.marks) {
        feedbackItems.push(`Q${answer.questionIndex + 1}: Correct! (+${score})`);
      } else if (score > 0) {
        feedbackItems.push(`Q${answer.questionIndex + 1}: Partially correct (+${score}/${question.marks})`);
      } else {
        feedbackItems.push(`Q${answer.questionIndex + 1}: Incorrect (0/${question.marks})`);
      }
    }

    const feedback = feedbackItems.join("\n");

    // Update or create submission
    const existing = await prisma.submission.findFirst({
      where: { assignmentId: id, userId },
    });

    let submission;
    if (existing) {
      submission = await prisma.submission.update({
        where: { id: existing.id },
        data: {
          answers: answers as any,
          score: totalScore,
          status: "SUBMITTED",
          feedback,
        },
      });
    } else {
      submission = await prisma.submission.create({
        data: {
          userId,
          assignmentId: id,
          answers: answers as any,
          score: totalScore,
          maxMarks: assignment.maxMarks,
          status: "SUBMITTED",
          feedback,
        },
      });
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      score: totalScore,
      maxMarks: assignment.maxMarks,
    });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json({ error: "Failed to submit assignment" }, { status: 500 });
  }
}
