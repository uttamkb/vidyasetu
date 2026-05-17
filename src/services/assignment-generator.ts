import { prisma } from "@/lib/db";
import { callGemini, callGeminiStrict } from "@/lib/gemini";
import { toJson } from "@/lib/prisma-json";
import { AssignmentType, BloomLevel, DifficultyLevel, QuestionType } from "@prisma/client";
import { buildQuestionGenerationPrompt, type QuestionGenerationContext } from "@/prompts/question-generation";
import { AIAssignmentOutputSchema, type AIQuestion } from "@/types/ai-schemas";
import { withCache } from "@/lib/cache";
import { trackCacheHit } from "@/services/usage-tracker";

const DIFFICULTY_MAP: Record<DifficultyLevel, number[]> = {
  EASY: [1, 2],
  MEDIUM: [3],
  HARD: [4, 5],
  MIXED: [1, 2, 3, 4, 5],
};

interface GenerateOptions {
  userId: string;
  subjectId: string;
  chapterId?: string;
  type: AssignmentType;
  difficulty: DifficultyLevel;
  qCount?: number;
  timeLimit?: number;
}

/**
 * Orchestrates assignment creation. 
 * Creates a skeleton assignment and returns info for background AI generation.
 */
export async function generateAssignment({
  userId,
  subjectId,
  chapterId,
  type,
  difficulty,
  qCount = 10,
  timeLimit,
}: GenerateOptions) {
  // 1. Fetch Subject context
  const subject = await prisma.subject.findUniqueOrThrow({
    where: { id: subjectId },
    include: { chapters: { include: { topics: { include: { subtopics: true } } } } },
  });

  // 1b. Fetch User location
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { state: true, district: true, school: true, schoolId: true },
  });

  // 2. Identify target subtopics based on scope (CHAPTER vs FULL)
  let allSubtopics: any[] = [];
  if (type === "CHAPTER" && chapterId) {
    const chapter = subject.chapters.find((c) => c.id === chapterId);
    if (!chapter) throw new Error("Chapter not found in subject scope.");
    allSubtopics = chapter.topics.flatMap((t) => t.subtopics);
  } else {
    allSubtopics = subject.chapters.flatMap((c) => c.topics.flatMap((t) => t.subtopics));
  }

  if (allSubtopics.length === 0) {
    throw new Error("No subtopics found for the given scope.");
  }

  // 3. Fetch user mastery for these subtopics to bias selection/generation
  const userMastery = await prisma.userMastery.findMany({
    where: {
      userId,
      subtopicId: { in: allSubtopics.map((s) => s.id) },
    },
  });

  const masteryBySubtopic = Object.fromEntries(
    userMastery.map((m) => [m.subtopicId, m.masteryScore])
  );

  // 4. Weigh subtopics (lower mastery = higher weight)
  const weightedSubtopics = allSubtopics.map((st) => ({
    ...st,
    weight: Math.max(10, 100 - (masteryBySubtopic[st.id] ?? 50)),
  }));

  // 5. Fetch existing questions from bank
  const difficultyLevels = DIFFICULTY_MAP[difficulty];
  const existingQuestions = await prisma.question.findMany({
    where: {
      subtopicId: { in: allSubtopics.map((s) => s.id) },
      difficulty: { in: difficultyLevels },
      verifiedByHuman: true,
    },
    orderBy: { avgAccuracy: "asc" },
  });

  // 6. Determine bank vs AI split (70% bank, 30% AI)
  const bankQCount = Math.min(existingQuestions.length, Math.floor(qCount * 0.7));
  const aiQCount = qCount - bankQCount;
  const selectedBankQuestions = existingQuestions.slice(0, bankQCount);

  // 7. Calculate initial max marks
  const maxMarks = selectedBankQuestions.reduce((sum, q) => {
    const content = q.content as any;
    return sum + (content.maxMarks ?? 5);
  }, 0);

  // 7b. Check for School Exam Pattern (Blueprint & Stylistic Context)
  const schoolPattern = user.schoolId ? await prisma.schoolExamPattern.findUnique({
    where: {
      schoolId_grade_subjectId_examType: {
        schoolId: user.schoolId,
        grade: subject.grade,
        subjectId,
        examType: type === "SEMESTER" ? "HALF_YEARLY" : "UNIT_TEST", // Logic to map assignment type to exam pattern
      }
    }
  }) : null;

  // 8. Create Assignment record (as GENERATING)
  const chapterForTitle = chapterId
    ? subject.chapters.find((c) => c.id === chapterId)?.name
    : null;

  const title = buildTitle({ subjectName: subject.name, type, difficulty, chapterName: chapterForTitle });

  const assignment = await prisma.assignment.create({
    data: {
      title,
      type,
      difficulty,
      subjectId,
      chapterId: chapterId ?? null,
      questions: toJson(selectedBankQuestions.map((q, i) => ({ questionId: q.id, orderIndex: i }))),
      maxMarks,
      timeLimit: timeLimit ?? null,
      isAIGenerated: aiQCount > 0,
      status: aiQCount > 0 ? "GENERATING" : "READY",
      authorId: userId,
      targetGrade: subject.grade,
      targetBoard: subject.board,
      schoolId: user.schoolId,
      examType: schoolPattern?.examType ?? null,
    },
    include: {
      subject: true,
      chapter: true,
    },
  });

  // Increment user activity counter (fire-and-forget, don't block on failure)
  // Wrapped in async IIFE to handle both real DB and mocked tests gracefully
  (async () => {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          totalAssignmentsGenerated: { increment: 1 },
          lastActiveAt: new Date(),
        },
      });
    } catch (err) {
      // Silently fail — counter is best-effort, not critical path
      console.error("[assignment-generator] Failed to update user counters:", err);
    }
  })();

  return { 
    assignment, 
    aiQCount,
    topicNames: weightedSubtopics.slice(0, 3).map(s => s.name).join(", "),
    chapterName: chapterForTitle || "Full Syllabus",
    location: {
      state: user.state,
      district: user.district,
      school: user.school,
    },
    mainSubtopicId: weightedSubtopics[0]?.id || allSubtopics[0]?.id,
    aiPromptContext: schoolPattern?.aiPromptContext,
    blueprint: schoolPattern?.blueprint
  };
}

/**
 * Background worker logic: Generates AI questions and updates the assignment.
 */
export async function generateAssignmentAIContent(
  assignmentId: string, 
  userId: string, 
  aiQCount: number,
  context: { 
    subjectName: string; 
    grade: string; 
    chapterName: string; 
    subtopics: string; 
    difficulty: DifficultyLevel;
    state?: string | null;
    district?: string | null;
    schoolName?: string | null;
    subtopicId: string;
    aiPromptContext?: string | null;
    blueprint?: any;
  }
) {
  try {
    const generated = await generateQuestionsWithAI({
      subjectName: context.subjectName,
      grade: context.grade,
      chapterName: context.chapterName,
      subtopics: context.subtopics,
      difficulty: context.difficulty,
      count: aiQCount,
      state: context.state,
      district: context.district,
      schoolName: context.schoolName,
      aiPromptContext: context.aiPromptContext,
      blueprint: context.blueprint,
    }, userId);

    console.log(`[generateAssignmentAIContent] AI generated ${generated.length} questions for assignment ${assignmentId}`);

    const assignment = await prisma.assignment.findUniqueOrThrow({
      where: { id: assignmentId }
    });
    const existingList = assignment.questions as any[];

    // Create AI questions in a single batch for performance
    const savedQuestions = await prisma.question.createManyAndReturn({
      data: generated.map((q: AIQuestion) => ({
        subtopicId: context.subtopicId,
        type: q.type as QuestionType,
        bloomLevel: q.bloomLevel as BloomLevel,
        difficulty: q.difficulty,
        content: toJson(q.content),
        source: "ai_generated",
      })),
    });
    
    console.log(`[generateAssignmentAIContent] Saved ${savedQuestions.length} questions to DB`);

    // Update assignment
    const newList = [...existingList];
    let addedMarks = 0;
    savedQuestions.forEach((q, i) => {
      newList.push({ questionId: q.id, orderIndex: existingList.length + i });
      const content = q.content as any;
      addedMarks += (content.maxMarks ?? 5);
    });

    await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        questions: toJson(newList),
        maxMarks: assignment.maxMarks + addedMarks,
        status: "READY"
      }
    });

    console.log(`[generateAssignmentAIContent] Assignment ${assignmentId} updated to READY with ${newList.length} total questions`);
    return { success: true };
  } catch (error: any) {
    console.error(`[generateAssignmentAIContent] Fatal error for assignment ${assignmentId}:`, error);

    // EMERGENCY FALLBACK: If AI failed, try to pick SOME questions from the bank so the assignment isn't empty
    try {
      console.log(`[generateAssignmentAIContent] Attempting bank fallback for ${assignmentId}`);
      const bankQuestions = await prisma.question.findMany({
        where: {
          subtopicId: context.subtopicId,
          verifiedByHuman: true,
        },
        take: aiQCount,
      });

      if (bankQuestions.length > 0) {
        const assignment = await prisma.assignment.findUniqueOrThrow({ where: { id: assignmentId } });
        const existingList = assignment.questions as any[];
        const newList = [...existingList];
        let addedMarks = 0;
        
        bankQuestions.forEach((q, i) => {
          newList.push({ questionId: q.id, orderIndex: existingList.length + i });
          const content = q.content as any;
          addedMarks += (content.maxMarks ?? 5);
        });

        await prisma.assignment.update({
          where: { id: assignmentId },
          data: {
            questions: toJson(newList),
            maxMarks: assignment.maxMarks + addedMarks,
            status: "READY"
          }
        });
        console.log(`[generateAssignmentAIContent] Fallback successful. Added ${bankQuestions.length} bank questions.`);
        return { success: true, fallbackUsed: true };
      }
    } catch (fallbackError) {
      console.error("[generateAssignmentAIContent] Fallback also failed:", fallbackError);
    }

    // If fallback also failed or was empty, mark as FAILED
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: "FAILED" } 
    }).catch(() => {});
    
    throw error;
  }
}

async function generateQuestionsWithAI(input: QuestionGenerationContext, userId: string) {
  const prompt = buildQuestionGenerationPrompt(input);
  
  // 1. Primary Attempt: Use FLASH for speed and cost-efficiency
  let result = await callGeminiStrict<any>(
    "FLASH",
    prompt,
    undefined,
    { userId, type: "GENERATION" }
  );

  // 2. Resilience Check: If FLASH returned empty or suspicious results, retry with PRO
  if (!result.questions || result.questions.length === 0) {
    console.warn("[generateQuestionsWithAI] FLASH returned empty results. Retrying with PRO...");
    result = await callGeminiStrict<any>(
      "PRO",
      prompt,
      undefined,
      { userId, type: "GENERATION" }
    );
  }

  // 3. Validation
  const parsed = AIAssignmentOutputSchema.safeParse(result);
  if (!parsed.success) {
    console.error("[generateQuestionsWithAI] Validation failed:", JSON.stringify(parsed.error.format(), null, 2));
    throw new Error("AI output failed validation.");
  }

  return parsed.data.questions;
}

function buildTitle({ subjectName, type, difficulty, chapterName }: { subjectName: string; type: AssignmentType; difficulty: DifficultyLevel; chapterName: string | null | undefined }) {
  const diffStr = difficulty.charAt(0) + difficulty.slice(1).toLowerCase();
  if (type === "CHAPTER" && chapterName) {
    return `${subjectName}: ${chapterName} (${diffStr})`;
  }
  return `${subjectName} Full Practice (${diffStr})`;
}
