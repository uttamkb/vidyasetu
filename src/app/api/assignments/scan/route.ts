import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { inngest } from "@/inngest/client";

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

    // Create the background task
    const task = await prisma.task.create({
      data: {
        type: "TRANSCRIPTION",
        status: "PENDING",
      },
    });

    // Send the Inngest background event
    await inngest.send({
      name: "app/transcription.process",
      data: {
        taskId: task.id,
        assignmentId,
        images,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, taskId: task.id });
  } catch (err) {
    console.error("[POST /api/assignments/scan] Error:", err);
    return NextResponse.json({ error: "Failed to process scan" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
  }

  try {
    const task = await prisma.task.findUniqueOrThrow({
      where: { id: taskId },
    });

    if (task.status === "COMPLETED") {
      const payload = task.payload as any;
      return NextResponse.json({
        status: "COMPLETED",
        extractedAnswers: payload?.extractedAnswers || {},
        confidenceScores: payload?.confidenceScores || {},
        uncertainWords: payload?.uncertainWords || {},
      });
    }

    if (task.status === "FAILED") {
      return NextResponse.json({
        status: "FAILED",
        error: task.error || "OCR transcription failed",
      });
    }

    return NextResponse.json({ status: task.status }); // PENDING or PROCESSING
  } catch (err) {
    console.error("[GET /api/assignments/scan] Error:", err);
    return NextResponse.json({ error: "Failed to fetch task status" }, { status: 500 });
  }
}
