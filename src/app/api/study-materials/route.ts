import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateTopicContentPack, saveContentPack } from "@/services/content-curator";

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

  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { grade: true, board: true },
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      isPublished: true,
      subjectId: { in: eligibleSubjectIds },
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
      orderBy: [{ type: "asc" }, { createdAt: "desc" }],
      take: 100,
    });

    // JUST-IN-TIME (JIT) Content Generation
    // If a specific topic was requested but has no materials, autonomously generate them.
    if (topicId && materials.length === 0 && !type && !query) {
      console.log(`[API] Topic ${topicId} has no materials. Triggering AI Curator...`);
      try {
        const pack = await generateTopicContentPack(topicId);
        await saveContentPack(topicId, pack);
        
        // Re-fetch materials after generation
        materials = await prisma.studyMaterial.findMany({
          where,
          include: {
            subject: { select: { id: true, name: true, color: true } },
            chapter: { select: { id: true, name: true } },
            topic: { select: { id: true, name: true } },
          },
          orderBy: [{ type: "asc" }, { createdAt: "desc" }],
          take: 100,
        });
      } catch (genError) {
        console.error(`[API] Failed to JIT generate content for ${topicId}:`, genError);
        // We catch and swallow here to return an empty array instead of crashing the UI
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

    const shaped = filtered.map((m) => ({
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
