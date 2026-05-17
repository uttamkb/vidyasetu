import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateAssignment } from "@/services/assignment-generator";
import { AssignmentType, DifficultyLevel } from "@prisma/client";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { inngest } from "@/inngest/client";
import { logger } from "@/lib/logger";
import { requireSubscription, incrementUsage } from "@/lib/require-subscription";

const generateSchema = z.object({
  subjectId: z.string().min(1, "Invalid subject ID"),
  type: z.nativeEnum(AssignmentType),
  difficulty: z.nativeEnum(DifficultyLevel),
  chapterId: z.string().min(1).optional(),
  topicIds: z.array(z.string().min(1)).optional(),
  questionCount: z.number().int().min(5).max(30).default(10),
  timeLimit: z.number().int().min(5).max(180).optional(),
});

// POST /api/assignments/generate
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 60 AI generation requests per minute per user
  const rateLimit = await checkRateLimit(session.user.id, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before generating another assignment.", retryAfterMs: rateLimit.resetInMs },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.resetInMs / 1000)) } }
    );
  }

  // Subscription check: enforce plan limits (shadow mode by default)
  const access = await requireSubscription(session.user.id, "ASSIGNMENT_GENERATION");
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason, code: access.code },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    // The discovery and validation are now handled by the gemini.ts lib
    const { assignment, aiQCount, topicNames, chapterName, location, mainSubtopicId } = await generateAssignment({
      userId: session.user.id,
      ...parsed.data,
    });

    if (aiQCount > 0) {
      try {
        await inngest.send({
          name: "app/assignment.generate",
          data: {
            assignmentId: assignment.id,
            userId: session.user.id,
            aiQCount,
            input: {
              subjectName: assignment.subject.name,
              grade: assignment.subject.grade,
              chapterName: chapterName || "Full Syllabus",
              subtopics: topicNames,
              difficulty: assignment.difficulty,
              state: location.state,
              district: location.district,
              schoolName: location.school,
              subtopicId: mainSubtopicId,
            }
          }
        });
      } catch (inngestErr) {
        // STRATEGIC DECISION: If Inngest is down, we MUST fail the request.
        // Bypassing the queue violates the architecture's concurrency & cost controls.
        const errorMsg = (inngestErr as Error).message;
        logger.error("Infrastructure Failure: Inngest server unreachable", {
          category: "INNGEST",
          userId: session.user.id,
          metadata: { error: errorMsg }
        });
        
        return NextResponse.json({ 
          error: "Background Worker (Inngest) is offline.",
          suggestion: "Please run 'npx inngest-cli@latest dev' in your terminal to start the background worker.",
          code: "INNGEST_OFFLINE"
        }, { status: 503 });
      }
    }

    // Track usage for subscription limits
    await incrementUsage(session.user.id, "ASSIGNMENT_GENERATION");

    return NextResponse.json({
      success: true,
      assignmentId: assignment.id,
      status: assignment.status,
      message: aiQCount > 0 ? "Generating your assignment..." : "Assignment ready!"
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    logger.error("Assignment generation failed", {
      category: "AI",
      userId: session.user.id,
      metadata: { error: message, stack: err instanceof Error ? err.stack : undefined, input: parsed.data }
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
