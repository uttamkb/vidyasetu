import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { captureAIFeedback } from "@/services/self-learning-service";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, corrections } = body;

    if (!corrections || !Array.isArray(corrections)) {
      return NextResponse.json({ error: "Invalid corrections format" }, { status: 400 });
    }

    for (const corr of corrections) {
      await captureAIFeedback({
        type,
        targetId: corr.questionId,
        aiOutput: corr.aiOutput,
        humanCorrection: corr.humanCorrection,
        isCorrect: false,
        feedback: "Human corrected during verification step",
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[self-learning/feedback] Failed to capture feedback:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
