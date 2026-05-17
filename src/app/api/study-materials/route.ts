import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateTopicContentPack, saveContentPack, isContentOutdated } from "@/services/content-curator";

// GET /api/study-materials
// Query params:
//   ?topicId=xxx         — materials for a specific topic
//   ?chapterId=xxx       — materials for a chapter (all topics)
//   ?subjectId=xxx       — all materials for a subject
//   ?type=VIDEO|PDF|...  — filter by material type
//   ?q=search            — full-text search on title/description
//   (no params)          — all published materials for the user's grade/board
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);

  const topicId = searchParams.get("topicId");
  const chapterId = searchParams.get("chapterId");
  const subjectId = searchParams.get("subjectId");
  const type = searchParams.get("type");
  const query = searchParams.get("q");
  const forceRefresh = searchParams.get("refresh") === "true";

  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { grade: true, board: true, school: true },
    });

    // Build subject filter (scoped to user's grade/board when no explicit subjectId)
    const subjectFilter = subjectId
      ? { id: subjectId }
      : { grade: user.grade, board: user.board };

    const eligibleSubjects = await prisma.subject.findMany({
      where: subjectFilter,
      select: { id: true },
    });
    const eligibleSubjectIds = eligibleSubjects.map((s) => s.id);

    // Build where clause
    const where: any = {
      isPublished: true,
      subjectId: { in: eligibleSubjectIds },
      // 🏫 SCHOOL FILTERING
      OR: [
        { school: null },
        { school: user.school }
      ]
    };

    if (topicId) where.topicId = topicId;
    if (chapterId) where.chapterId = chapterId;
    if (type) where.type = type;

    let materials = await prisma.studyMaterial.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, color: true } },
        chapter: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
      },
      // Order by school (not null first), then type, then date
      orderBy: [
        { school: "desc" } as any, 
        { type: "asc" }, 
        { createdAt: "desc" }
      ],
      take: 100,
    });

    // AUTO-HEALING: Clean up broken fallback AI notes
    if (topicId && materials.some(m => m.type === "PLATFORM_CONTENT" && m.content?.includes("Study notes for ") && (m.content?.length || 0) < 300)) {
      console.log(`[API] Auto-healing broken AI notes for topic ${topicId}`);
      await prisma.studyMaterial.deleteMany({ where: { topicId } });
      await prisma.question.deleteMany({ where: { source: "ai_generated", subtopic: { topicId } } });
      materials = [];
    }

    // JUST-IN-TIME (JIT) Content Generation
    // Synergy: If a student triggers this, we save it globally so other students get it for free.
    const isOutdated = isContentOutdated(materials);
    if (topicId && (isOutdated || forceRefresh) && !type && !query) {
      // 🛡️ CHECK QUOTA: Only apply quota if we are actually CALLING AI
      const { requireSubscription, incrementUsage } = await import("@/lib/require-subscription");
      const access = await requireSubscription(userId, "AI_STUDY_NOTES");
      
      if (!access.allowed && !access.shadowMode) {
        return NextResponse.json({ 
          error: access.reason, 
          code: access.code,
          materials: materials // Return existing materials if any
        }, { status: 403 });
      }

      console.log(`[API] Topic ${topicId} content missing/outdated. Generating Global Asset...`);
      try {
        const pack = await generateTopicContentPack(topicId);
        await saveContentPack(topicId, pack);
        
        // 📊 INCREMENT USAGE: Successful generation
        await incrementUsage(userId, "AI_STUDY_NOTES");
        
        console.log(`[API] Global Asset for ${topicId} is now broadcasted to all students.`);
        
        // Re-fetch materials after generation
        materials = await prisma.studyMaterial.findMany({
          where,
          include: {
            subject: { select: { id: true, name: true, color: true } },
            chapter: { select: { id: true, name: true } },
            topic: { select: { id: true, name: true } },
          },
          orderBy: [
            { school: "desc" } as any, 
            { type: "asc" }, 
            { createdAt: "desc" }
          ],
          take: 100,
        });
      } catch (genError) {
        console.error(`[API] Failed to generate/broadcast content for ${topicId}:`, genError);
      }
    }

    // Client-side search filter (Postgres full-text would be ideal; this is fine for MVP)
    const filtered =
      query && query.length > 0
        ? materials.filter(
            (m) =>
              m.title.toLowerCase().includes(query.toLowerCase()) ||
              (m.description ?? "").toLowerCase().includes(query.toLowerCase())
          )
        : materials;

    const shaped = filtered.map((m: any) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      type: m.type,
      youtubeUrl: m.youtubeUrl,
      thumbnailUrl: m.thumbnailUrl,
      fileUrl: m.fileUrl,
      content: m.content, // inline content for PLATFORM_CONTENT / NOTES
      isAIGenerated: m.isAIGenerated,
      subject: m.subject,
      chapter: m.chapter,
      topic: m.topic,
      createdAt: m.createdAt,
    }));

    return NextResponse.json({
      materials: shaped,
      total: shaped.length,
      filters: { topicId, chapterId, subjectId, type, query },
    });
  } catch (err) {
    console.error("[GET /api/study-materials]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
