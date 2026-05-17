import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateWorksheet, formatWorksheetToMarkdown } from "@/services/worksheet-generator";
import { requireSubscription, incrementUsage } from "@/lib/require-subscription";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { topicId } = await req.json();

  if (!topicId) {
    return NextResponse.json({ error: "Topic ID is required" }, { status: 400 });
  }

  // 🛡️ 1. CHECK QUOTA
  const access = await requireSubscription(userId, "WORKSHEET_GENERATION");
  if (!access.allowed && !access.shadowMode) {
    return NextResponse.json({ 
      error: access.reason, 
      code: access.code 
    }, { status: 403 });
  }

  try {
    // 📊 2. GET USER MASTERY
    // Fetch student performance for this topic to determine difficulty
    const masteryRecord = await prisma.userMastery.findFirst({
      where: { userId, subtopic: { topicId } },
      select: { masteryScore: true }
    });

    const mastery = masteryRecord?.masteryScore || 0;

    // 🤖 3. GENERATE WORKSHEET
    const contentPack = await generateWorksheet(topicId, mastery);
    const markdown = formatWorksheetToMarkdown(contentPack);

    // 💾 4. SAVE PERSONALIZED WORKSHEET
    const material = await prisma.studyMaterial.create({
      data: {
        title: contentPack.title,
        description: `Personalized adaptive practice sheet for ${contentPack.title}.`,
        type: "WORKSHEET",
        content: markdown,
        topicId,
        subjectId: (await prisma.topic.findUnique({ where: { id: topicId }, select: { chapter: { select: { subjectId: true } } } }))?.chapter.subjectId || "",
        chapterId: (await prisma.topic.findUnique({ where: { id: topicId }, select: { chapterId: true } }))?.chapterId || "",
        isAIGenerated: true,
        aiGeneratedAt: new Date(),
        isPublished: true, // Personal material is effectively published to the owner
      }
    });

    // 📈 5. INCREMENT USAGE
    await incrementUsage(userId, "WORKSHEET_GENERATION");

    return NextResponse.json({ 
      success: true, 
      materialId: material.id,
      title: material.title,
      content: material.content 
    });
  } catch (error) {
    console.error("[POST /api/study-materials/worksheet]", error);
    return NextResponse.json({ error: "Worksheet generation failed" }, { status: 500 });
  }
}
