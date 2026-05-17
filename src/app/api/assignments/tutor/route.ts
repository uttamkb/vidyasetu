import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startSocraticTutorChat } from "@/lib/gemini";
import { requireSubscription, incrementUsage } from "@/lib/require-subscription";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { questionId, message, history = [] } = await req.json();

  if (!questionId || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 🛡️ CHECK QUOTA
  const access = await requireSubscription(userId, "AI_TUTOR_CHAT");
  if (!access.allowed && !access.shadowMode) {
    return NextResponse.json({ 
      error: access.reason, 
      code: access.code 
    }, { status: 403 });
  }

  try {
    const question = await prisma.question.findUniqueOrThrow({
      where: { id: questionId },
      select: { content: true }
    });

    const questionText = typeof question.content === "string" 
      ? question.content 
      : JSON.stringify(question.content);

    const chat = await startSocraticTutorChat(
      questionText,
      history
    );

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // 📊 INCREMENT USAGE
    await incrementUsage(userId, "AI_TUTOR_CHAT");

    return NextResponse.json({ 
      text,
      history: [
        ...history,
        { role: "user", parts: [{ text: message }] },
        { role: "model", parts: [{ text }] }
      ]
    });
  } catch (error) {
    console.error("[POST /api/assignments/tutor]", error);
    return NextResponse.json({ error: "Socratic tutor failed" }, { status: 500 });
  }
}
