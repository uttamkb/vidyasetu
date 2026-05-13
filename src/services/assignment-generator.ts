import { prisma } from "@/lib/db";
import { geminiFlashModels, callGemini } from "@/lib/gemini";
import { toJson } from "@/lib/prisma-json";
import { AssignmentType, BloomLevel, DifficultyLevel, QuestionType } from "@prisma/client";
import { buildQuestionGenerationPrompt, type QuestionGenerationContext } from "@/prompts/question-generation";
import { AIAssignmentOutputSchema, type AIQuestion } from "@/types/ai-schemas";

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
    select: { state: true, district: true, school: true },
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
    },
    include: {
      subject: true,
      chapter: true,
    },
  });

  return { 
    assignment, 
    aiQCount,
    topicNames: weightedSubtopics.slice(0, 3).map(s => s.name).join(", "),
    chapterName: chapterForTitle || "Full Syllabus",
    location: {
      state: user.state,
      district: user.district,
      school: user.school,
    }
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
    });

    const assignment = await prisma.assignment.findUniqueOrThrow({
      where: { id: assignmentId }
    });
    const existingList = assignment.questions as any[];

    // Create AI questions
    const createOps = generated.map((q: AIQuestion) => {
      return prisma.question.create({
        data: {
          subtopicId: "pending_subtopic", // Placeholder for MVP
          type: q.type as QuestionType,
          bloomLevel: q.bloomLevel as BloomLevel,
          difficulty: q.difficulty,
          content: toJson(q.content),
          source: "ai_generated",
        },
      });
    });

    const savedQuestions = await prisma.$transaction(createOps);
    
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

    return { success: true };
  } catch (error) {
    console.error("[generateAssignmentAIContent] failed:", error);
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: "FAILED" }
    });
    throw error;
  }
}

async function generateQuestionsWithAI(input: QuestionGenerationContext) {
  const prompt = buildQuestionGenerationPrompt(input);
  const result = await callGemini(geminiFlashModels, prompt, {
    userId: "system", // Usage tracking for generation
    type: "ASSIGNMENT_GEN",
  });

  const parsed = AIAssignmentOutputSchema.safeParse(result);
  if (!parsed.success) {
    throw new Error("AI output failed validation.");
  }

  return parsed.data;
}

function buildTitle({ subjectName, type, difficulty, chapterName }: { subjectName: string; type: AssignmentType; difficulty: DifficultyLevel; chapterName: string | null | undefined }) {
  const diffStr = difficulty.charAt(0) + difficulty.slice(1).toLowerCase();
  if (type === "CHAPTER" && chapterName) {
    return `${subjectName}: ${chapterName} (${diffStr})`;
  }
  return `${subjectName} Full Practice (${diffStr})`;
}
