import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CurriculumResearcher } from "@/services/curriculum-researcher";

// GET /api/curriculum/[subjectId]/chapters
// Returns chapters + topics for a specific subject, with richer per-topic detail.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subjectId } = await params;
  const userId = session.user.id;

  try {
    let subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        chapters: {
          include: {
            topics: {
              include: {
                subtopics: {
                  include: {
                    userMastery: {
                      where: { userId },
                      select: { masteryScore: true, totalAttempts: true },
                    },
                  },
                  orderBy: { orderIndex: "asc" },
                },
                studyMaterials: {
                  where: { isPublished: true },
                  select: { id: true, type: true, title: true },
                },
              },
              orderBy: { orderIndex: "asc" },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // JUST-IN-TIME (JIT) Curriculum Research
    if (subject.chapters.length === 0) {
      console.log(`[API] Subject ${subject.name} has no chapters. Triggering AI Researcher...`);
      await CurriculumResearcher.generateCurriculumStructure(subjectId);
      
      // Re-fetch after generation
      subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        include: {
          chapters: {
            include: {
              topics: {
                include: {
                  subtopics: {
                    include: {
                      userMastery: {
                        where: { userId },
                        select: { masteryScore: true, totalAttempts: true },
                      },
                    },
                    orderBy: { orderIndex: "asc" },
                  },
                  studyMaterials: {
                    where: { isPublished: true },
                    select: { id: true, type: true, title: true },
                  },
                },
                orderBy: { orderIndex: "asc" },
              },
            },
            orderBy: { orderIndex: "asc" },
          },
        },
      });
      
      // Push all newly generated topics to the background seeder queue
      if (subject) {
        const allTopics = subject.chapters.flatMap(c => c.topics);
        for (const topic of allTopics) {
          await prisma.task.create({
            data: {
              type: "SEED_TOPIC_CONTENT",
              status: "PENDING",
              payload: { topicId: topic.id },
            }
          });
        }
        console.log(`[API] Queued ${allTopics.length} topics for background seeding.`);
      }
    }

    if (!subject) {
       return NextResponse.json({ error: "Failed to load subject after generation" }, { status: 500 });
    }

    const chapters = subject.chapters.map((chapter) => {
      const chapterSubtopics = chapter.topics.flatMap((t) => t.subtopics);
      const practisedCount = chapterSubtopics.filter(
        (st) => (st.userMastery[0]?.totalAttempts ?? 0) > 0
      ).length;

      return {
        id: chapter.id,
        name: chapter.name,
        orderIndex: chapter.orderIndex,
        topicCount: chapter.topics.length,
        subtopicCount: chapterSubtopics.length,
        practisedSubtopics: practisedCount,
        topics: chapter.topics.map((topic) => {
          const topicMasteryScores = topic.subtopics
            .flatMap((st) => st.userMastery)
            .map((m) => m.masteryScore);
          const avgMastery =
            topicMasteryScores.length > 0
              ? Math.round(
                  topicMasteryScores.reduce((a, b) => a + b, 0) / topicMasteryScores.length
                )
              : 0;

          // Count materials by type
          const materialsByType: Record<string, number> = {};
          for (const m of topic.studyMaterials) {
            materialsByType[m.type] = (materialsByType[m.type] ?? 0) + 1;
          }

          return {
            id: topic.id,
            name: topic.name,
            orderIndex: topic.orderIndex,
            avgMastery,
            subtopicCount: topic.subtopics.length,
            materialCount: topic.studyMaterials.length,
            materialsByType,
          };
        }),
      };
    });

    return NextResponse.json({
      subject: {
        id: subject.id,
        name: subject.name,
        color: subject.color,
        icon: subject.icon,
        grade: subject.grade,
        board: subject.board,
      },
      chapters,
    });
  } catch (err) {
    console.error("[GET /api/curriculum/[subjectId]/chapters]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
