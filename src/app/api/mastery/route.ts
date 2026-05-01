import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const masteryData = await prisma.userMastery.findMany({
      where: { userId },
      include: {
        subtopic: {
          include: {
            topic: {
              include: {
                chapter: {
                  include: {
                    subject: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Aggregate by subject
    const subjectMap = new Map<string, { name: string; total: number; count: number }>();
    const weakAreas: { subtopic: string; topic: string; chapter: string; subject: string; score: number }[] = [];

    for (const m of masteryData) {
      const subject = m.subtopic.topic.chapter.subject;
      const existing = subjectMap.get(subject.id);
      if (existing) {
        existing.total += m.masteryScore;
        existing.count += 1;
      } else {
        subjectMap.set(subject.id, { name: subject.name, total: m.masteryScore, count: 1 });
      }

      if (m.masteryScore < 50) {
        weakAreas.push({
          subtopic: m.subtopic.name,
          topic: m.subtopic.topic.name,
          chapter: m.subtopic.topic.chapter.name,
          subject: subject.name,
          score: m.masteryScore,
        });
      }
    }

    const subjectAverages = Array.from(subjectMap.entries()).map(([id, data]) => ({
      subjectId: id,
      subjectName: data.name,
      averageMastery: Math.round(data.total / data.count),
    }));

    return NextResponse.json({
      success: true,
      subjects: subjectAverages,
      weakAreas: weakAreas.sort((a, b) => a.score - b.score).slice(0, 5),
      totalSubtopics: masteryData.length,
    });
  } catch (error) {
    console.error("Mastery fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch mastery" }, { status: 500 });
  }
}
