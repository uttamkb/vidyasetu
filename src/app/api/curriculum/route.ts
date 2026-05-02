import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/curriculum
// Returns the full Subject → Chapter → Topic tree for the current student's grade/board.
// Includes per-topic study material count and average mastery score.
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { grade: true, board: true },
    });

    const subjects = await prisma.subject.findMany({
      where: { grade: user.grade, board: user.board },
      include: {
        chapters: {
          include: {
            topics: {
              include: {
                subtopics: {
                  include: {
                    userMastery: {
                      where: { userId },
                      select: { masteryScore: true },
                    },
                  },
                },
                studyMaterials: {
                  where: { isPublished: true },
                  select: { id: true },
                },
              },
              orderBy: { orderIndex: "asc" },
            },
            studyMaterials: {
              where: { isPublished: true },
              select: { id: true },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    const tree = subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      color: subject.color,
      icon: subject.icon,
      grade: subject.grade,
      board: subject.board,
      chapters: subject.chapters.map((chapter) => {
        const allSubtopics = chapter.topics.flatMap((t) => t.subtopics);
        const masteryScores = allSubtopics
          .flatMap((st) => st.userMastery)
          .map((m) => m.masteryScore);
        const avgMastery =
          masteryScores.length > 0
            ? Math.round(masteryScores.reduce((a, b) => a + b, 0) / masteryScores.length)
            : 0;

        return {
          id: chapter.id,
          name: chapter.name,
          orderIndex: chapter.orderIndex,
          avgMastery,
          materialCount: chapter.studyMaterials.length,
          topics: chapter.topics.map((topic) => {
            const topicMasteryScores = topic.subtopics
              .flatMap((st) => st.userMastery)
              .map((m) => m.masteryScore);
            const topicAvgMastery =
              topicMasteryScores.length > 0
                ? Math.round(
                    topicMasteryScores.reduce((a, b) => a + b, 0) / topicMasteryScores.length
                  )
                : 0;

            return {
              id: topic.id,
              name: topic.name,
              orderIndex: topic.orderIndex,
              avgMastery: topicAvgMastery,
              subtopicCount: topic.subtopics.length,
              materialCount: topic.studyMaterials.length,
            };
          }),
        };
      }),
    }));

    return NextResponse.json({ curriculum: tree, grade: user.grade, board: user.board });
  } catch (err) {
    console.error("[GET /api/curriculum]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
