import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { buildDiagnosticPlan } from "@/services/diagnostic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subjects = await prisma.subject.findMany({
      where: { grade: "9", board: "CBSE" },
      include: {
        chapters: {
          include: {
            topics: {
              include: {
                subtopics: true,
              },
            },
          },
        },
      },
    });

    const diagnosticSubjects = subjects.map((s) => ({
      id: s.id,
      name: s.name,
      orderIndex: s.orderIndex,
      chapters: s.chapters.map((c) => ({
        id: c.id,
        name: c.name,
        orderIndex: c.orderIndex,
        topics: c.topics.map((t) => ({
          id: t.id,
          name: t.name,
          orderIndex: t.orderIndex,
          subtopics: t.subtopics.map((st) => ({
            id: st.id,
            name: st.name,
            orderIndex: st.orderIndex,
          })),
        })),
      })),
    }));

    const plan = buildDiagnosticPlan(diagnosticSubjects, { targetQuestionCount: 20 });

    // Fetch one question per subtopic in the plan
    const questions = await Promise.all(
      plan.map(async (item) => {
        const question = await prisma.question.findFirst({
          where: { subtopicId: item.subtopicId },
          select: {
            id: true,
            content: true,
            type: true,
            difficulty: true,
            bloomLevel: true,
          },
        });
        return {
          ...item,
          question,
        };
      })
    );

    const validQuestions = questions.filter((q) => q.question !== null);

    return NextResponse.json({
      success: true,
      data: validQuestions,
      totalQuestions: validQuestions.length,
    });
  } catch (error) {
    console.error("Diagnostic fetch error:", error);
    return NextResponse.json({ error: "Failed to load diagnostic" }, { status: 500 });
  }
}
