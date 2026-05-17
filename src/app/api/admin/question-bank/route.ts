import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Prisma, BloomLevel } from "@prisma/client";

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().optional(),
  schoolId: z.string().optional(),
  subjectId: z.string().optional(),
  grade: z.string().optional(),
  bloomLevel: z.nativeEnum(BloomLevel).or(z.literal("")).optional(),
  difficulty: z.coerce.number().int().min(1).max(5).optional(),
  source: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rawParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = QuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { page, limit, search, schoolId, subjectId, grade, bloomLevel, difficulty, source } = parsed.data;
    const skip = (page - 1) * limit;

    // Build Prisma query filters
    const where: Prisma.QuestionWhereInput = {
      isArchived: false,
    };

    if (search) {
      where.content = {
        path: ["question"],
        string_contains: search,
      };
    }

    if (schoolId) {
      where.schoolId = schoolId;
    }

    if (bloomLevel) {
      where.bloomLevel = bloomLevel as BloomLevel;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (source) {
      where.source = source;
    }

    if (grade || subjectId) {
      where.subtopic = {
        topic: {
          chapter: {
            subject: {
              ...(grade ? { grade } : {}),
              ...(subjectId ? { id: subjectId } : {}),
            },
          },
        },
      };
    }

    // Execute queries in parallel
    const [questions, totalCount, curatedCount, aiGeneratedCount, schoolSpecificCount] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          school: {
            select: { name: true },
          },
          subtopic: {
            select: {
              name: true,
              topic: {
                select: {
                  name: true,
                  chapter: {
                    select: {
                      name: true,
                      subject: {
                        select: { name: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.question.count({ where }),
      prisma.question.count({ where: { source: "curated", isArchived: false } }),
      prisma.question.count({ where: { source: "ai_generated", isArchived: false } }),
      prisma.question.count({
        where: {
          NOT: { schoolId: null },
          isArchived: false,
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      questions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
      metrics: {
        totalCount,
        curatedCount,
        aiGeneratedCount,
        schoolSpecificCount,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/question-bank] error:", error);
    return NextResponse.json({ error: "Failed to fetch question bank" }, { status: 500 });
  }
}
