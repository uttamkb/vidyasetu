import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { evaluateSubmission } from "@/services/evaluation-engine";
import { z } from "zod";
import { toJson } from "@/lib/prisma-json";
import { checkRateLimit } from "@/lib/rate-limit";

const submitSchema = z.object({
  assignmentId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().optional(),
      questionIndex: z.number().int(),
      userAnswer: z.union([z.string(), z.number(), z.null()]),
    })
  ).min(1),
  timeTaken: z.number().int().positive().optional(),
});

// POST /api/submissions — submit answers + trigger AI evaluation
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 30 AI evaluation requests per minute per user
  const rateLimit = checkRateLimit(session.user.id, 30);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before submitting again.", retryAfterMs: rateLimit.resetInMs },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.resetInMs / 1000)) } }
    );
  }

  const body = await req.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { assignmentId, answers, timeTaken } = parsed.data;

  try {
    // Check assignment exists and get maxMarks
    const assignment = await prisma.assignment.findUniqueOrThrow({
      where: { id: assignmentId },
      select: { maxMarks: true },
    });

    // Prevent duplicate submissions
    const existing = await prisma.submission.findFirst({
      where: {
        userId: session.user.id,
        assignmentId,
        status: { in: ["SUBMITTED", "EVALUATED"] },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Assignment already submitted", submissionId: existing.id },
        { status: 409 }
      );
    }

    // Create submission record
    const submission = await prisma.submission.create({
      data: {
        userId: session.user.id,
        assignmentId,
        answers: toJson(answers),
        maxMarks: assignment.maxMarks,
        totalScore: 0,
        percentageScore: 0,
        status: "SUBMITTED",
        submittedAt: new Date(),
        timeTaken: timeTaken ?? null,
      },
    });

    // Evaluate asynchronously (trigger evaluation in background)
    // In production: use a job queue (BullMQ). For MVP: evaluate inline.
    const result = await evaluateSubmission(submission.id);

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      totalScore: result.totalScore,
      maxMarks: assignment.maxMarks,
      percentageScore: result.percentageScore,
      status: "EVALUATED",
    });
  } catch (err) {
    console.error("[POST /api/submissions]", err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}

// GET /api/submissions — list student's submission history
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "20");

  try {
    const submissions = await prisma.submission.findMany({
      where: { userId: session.user.id },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            type: true,
            difficulty: true,
            subject: { select: { id: true, name: true, color: true } },
            chapter: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: Math.min(limit, 100),
    });

    return NextResponse.json({
      submissions: submissions.map((s) => ({
        id: s.id,
        assignment: s.assignment,
        totalScore: s.totalScore,
        maxMarks: s.maxMarks,
        percentageScore: s.percentageScore,
        status: s.status,
        submittedAt: s.submittedAt,
        timeTaken: s.timeTaken,
      })),
    });
  } catch (err) {
    console.error("[GET /api/submissions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
