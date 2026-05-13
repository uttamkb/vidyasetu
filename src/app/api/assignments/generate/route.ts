import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateAssignment } from "@/services/assignment-generator";
import { AssignmentType, DifficultyLevel } from "@prisma/client";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { inngest } from "@/inngest/client";

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

  // Rate limit: 30 AI generation requests per minute per user
  const rateLimit = checkRateLimit(session.user.id, 30);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before generating another assignment.", retryAfterMs: rateLimit.resetInMs },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.resetInMs / 1000)) } }
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
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const fetchRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await fetchRes.json();
        console.log("AVAILABLE MODELS:", data.models?.map((m: any) => m.name).join(", "));
      } catch (e) {
        console.error("Could not fetch models", e);
      }
    }

    const { assignment, aiQCount, topicNames, chapterName, location } = await generateAssignment({
      userId: session.user.id,
      ...parsed.data,
    });

    if (aiQCount > 0) {
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
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      assignmentId: assignment.id,
      status: assignment.status,
      message: aiQCount > 0 ? "Generating your assignment..." : "Assignment ready!"
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("[POST /api/assignments/generate]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
