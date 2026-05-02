import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/progress/mastery — full mastery map (Subject → Chapter → Topic → Subtopic)
export async function GET(req: NextRequest) {
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

    // Get all subjects for user's grade/board
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
                      select: {
                        masteryScore: true,
                        lastPracticed: true,
                        totalAttempts: true,
                        correctAttempts: true,
                      },
                    },
                  },
                  orderBy: { orderIndex: "asc" },
                },
              },
              orderBy: { orderIndex: "asc" },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    // Shape into mastery map
    const masteryMap = subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      color: subject.color,
      icon: subject.icon,
      chapters: subject.chapters.map((chapter) => {
        const chapterSubtopics = chapter.topics.flatMap((t) => t.subtopics);
        const chapterMasteryScores = chapterSubtopics.map(
          (st) => st.userMastery[0]?.masteryScore ?? 0
        );
        const chapterAvg =
          chapterMasteryScores.length > 0
            ? chapterMasteryScores.reduce((a, b) => a + b, 0) / chapterMasteryScores.length
            : 0;

        return {
          id: chapter.id,
          name: chapter.name,
          orderIndex: chapter.orderIndex,
          avgMastery: Math.round(chapterAvg),
          topics: chapter.topics.map((topic) => {
            const topicScores = topic.subtopics.map(
              (st) => st.userMastery[0]?.masteryScore ?? 0
            );
            const topicAvg =
              topicScores.length > 0
                ? topicScores.reduce((a, b) => a + b, 0) / topicScores.length
                : 0;

            return {
              id: topic.id,
              name: topic.name,
              orderIndex: topic.orderIndex,
              avgMastery: Math.round(topicAvg),
              subtopics: topic.subtopics.map((st) => ({
                id: st.id,
                name: st.name,
                difficulty: st.difficulty,
                masteryScore: Math.round(st.userMastery[0]?.masteryScore ?? 0),
                lastPracticed: st.userMastery[0]?.lastPracticed ?? null,
                totalAttempts: st.userMastery[0]?.totalAttempts ?? 0,
                correctAttempts: st.userMastery[0]?.correctAttempts ?? 0,
                // Color status for UI
                status:
                  (st.userMastery[0]?.masteryScore ?? 0) >= 70
                    ? "mastered"
                    : (st.userMastery[0]?.masteryScore ?? 0) >= 40
                    ? "learning"
                    : st.userMastery[0]
                    ? "weak"
                    : "not_started",
              })),
            };
          }),
        };
      }),
    }));

    return NextResponse.json({ masteryMap });
  } catch (err) {
    console.error("[GET /api/progress/mastery]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
