import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { estimateInitialMastery } from "@/services/diagnostic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { answers } = body as {
      answers: { questionId: string; subtopicId: string; isCorrect: boolean; confidence?: number }[];
    };

    if (!answers || answers.length === 0) {
      return NextResponse.json({ error: "No answers provided" }, { status: 400 });
    }

    const userId = session.user.id;

    // Update the diagnostic session to completed
    await prisma.practiceSession.updateMany({
      where: { userId, type: "DIAGNOSTIC", status: "IN_PROGRESS" },
      data: { status: "COMPLETED", endTime: new Date() },
    });

    // Calculate mastery estimates
    const results = answers.map((a) => ({
      subtopicId: a.subtopicId,
      isCorrect: a.isCorrect,
      confidence: a.confidence,
    }));

    const masteryEstimates = estimateInitialMastery(results);

    // Upsert UserMastery records
    for (const estimate of masteryEstimates) {
      await prisma.userMastery.upsert({
        where: {
          userId_subtopicId: {
            userId,
            subtopicId: estimate.subtopicId,
          },
        },
        update: {
          masteryScore: estimate.masteryScore,
          stability: estimate.stability,
          retrievability: estimate.retrievability,
          totalAttempts: estimate.totalAttempts,
          correctAttempts: estimate.correctAttempts,
          consecutiveCorrect: estimate.consecutiveCorrect,
          lastPracticed: new Date(),
        },
        create: {
          userId,
          subtopicId: estimate.subtopicId,
          masteryScore: estimate.masteryScore,
          stability: estimate.stability,
          retrievability: estimate.retrievability,
          totalAttempts: estimate.totalAttempts,
          correctAttempts: estimate.correctAttempts,
          consecutiveCorrect: estimate.consecutiveCorrect,
          lastPracticed: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      masteryCount: masteryEstimates.length,
    });
  } catch (error) {
    console.error("Diagnostic submit error:", error);
    return NextResponse.json({ error: "Failed to submit diagnostic" }, { status: 500 });
  }
}
