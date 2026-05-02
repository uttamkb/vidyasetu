/**
 * Assignment Generator Service
 *
 * Generates AI-powered assignments for students based on:
 * - Scope: Chapter / Semester / Full Syllabus
 * - Difficulty: Easy / Medium / Hard / Mixed
 * - Personalization: UserMastery scores (weak areas get more questions)
 */

import { prisma } from "@/lib/db";
import { geminiFlash, callGemini } from "@/lib/gemini";
import { toJson } from "@/lib/prisma-json";
import { AssignmentType, BloomLevel, DifficultyLevel, QuestionType } from "@prisma/client";
import { buildQuestionGenerationPrompt } from "@/prompts/question-generation";
import { AIAssignmentOutputSchema, type AIQuestion } from "@/types/ai-schemas";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface GenerateAssignmentInput {
  userId: string;
  subjectId: string;
  type: AssignmentType;
  difficulty: DifficultyLevel;
  chapterId?: string;      // required for CHAPTER type
  topicIds?: string[];     // optional: specific topics
  questionCount?: number;  // default: 10
  timeLimit?: number;      // minutes; default: null (untimed)
}

interface AIGeneratedQuestion extends AIQuestion {}

// ─────────────────────────────────────────────────────────
// Difficulty → numeric range mapping
// ─────────────────────────────────────────────────────────

const DIFFICULTY_MAP: Record<DifficultyLevel, number[]> = {
  EASY: [1, 2],
  MEDIUM: [2, 3],
  HARD: [4, 5],
  MIXED: [1, 2, 3, 4, 5],
};

// ─────────────────────────────────────────────────────────
// Main: Generate Assignment
// ─────────────────────────────────────────────────────────

export async function generateAssignment(input: GenerateAssignmentInput) {
  const {
    userId,
    subjectId,
    type,
    difficulty,
    chapterId,
    topicIds,
    questionCount = 10,
    timeLimit,
  } = input;

  // 1. Fetch scope info (subject + chapter if applicable)
  const subject = await prisma.subject.findUniqueOrThrow({
    where: { id: subjectId },
    include: {
      chapters: {
        where: chapterId ? { id: chapterId } : undefined,
        include: { topics: { include: { subtopics: true } } },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  // 2. Collect all relevant subtopics
  const allSubtopics = subject.chapters.flatMap((ch) =>
    ch.topics.flatMap((t) =>
      topicIds && topicIds.length > 0
        ? t.subtopics.filter((st) => topicIds.includes(t.id))
        : t.subtopics
    )
  );

  if (allSubtopics.length === 0) {
    throw new Error("No subtopics found for the given scope.");
  }

  // 3. Get user mastery to personalize question distribution
  const masteryRows = await prisma.userMastery.findMany({
    where: {
      userId,
      subtopicId: { in: allSubtopics.map((s) => s.id) },
    },
  });

  const masteryBySubtopic = Object.fromEntries(
    masteryRows.map((m) => [m.subtopicId, m.masteryScore])
  );

  // 4. Weight subtopics — lower mastery = more questions
  const weightedSubtopics = allSubtopics.map((st) => ({
    ...st,
    weight: Math.max(10, 100 - (masteryBySubtopic[st.id] ?? 50)),
  }));
  const totalWeight = weightedSubtopics.reduce((sum, s) => sum + s.weight, 0);

  // 5. Fetch existing questions from bank
  const difficultyLevels = DIFFICULTY_MAP[difficulty];
  const existingQuestions = await prisma.question.findMany({
    where: {
      subtopicId: { in: allSubtopics.map((s) => s.id) },
      difficulty: { in: difficultyLevels },
      verifiedByHuman: true,
    },
    orderBy: { avgAccuracy: "asc" }, // harder (lower accuracy) first for personalization
    take: questionCount * 3, // fetch extra for selection pool
  });

  // 6. Determine how many to generate with AI vs. pull from bank
  const bankQCount = Math.min(existingQuestions.length, Math.floor(questionCount * 0.7));
  const aiQCount = questionCount - bankQCount;

  const selectedBankQuestions = existingQuestions.slice(0, bankQCount);

  // 7. Generate remaining questions with AI if needed
  if (aiQCount > 0) {
    const targetSubtopics = [...weightedSubtopics]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((s) => s.name)
      .join(", ");

    const chapterName = chapterId
      ? subject.chapters.find((c) => c.id === chapterId)?.name
      : "all chapters";

    const generated = await generateQuestionsWithAI({
      subjectName: subject.name,
      grade: subject.grade,
      chapterName: chapterName ?? "all chapters",
      subtopics: targetSubtopics,
      difficulty,
      count: aiQCount,
    });

    if (generated.length === 0) {
      throw new Error("AI failed to generate questions. Please try again.");
    }

    // FIX WBS-01: batch all creates in a single transaction (was N+1 sequential await)
    // FIX: pick subtopics by weight rank, not the broken `totalWeight > 0` check
    const sortedByWeight = [...weightedSubtopics].sort((a, b) => b.weight - a.weight);

    const createOps = generated.map((q, idx) => {
      const subtopic = sortedByWeight[idx % sortedByWeight.length];
      return prisma.question.create({
        data: {
          subtopicId: subtopic.id,
          type: q.type as QuestionType,
          bloomLevel: q.bloomLevel as BloomLevel,
          difficulty: q.difficulty,
          content: toJson(q.content),
          source: "ai_generated",
          verifiedByHuman: false,
        },
      });
    });

    // Single round-trip to DB instead of N sequential inserts
    const savedQuestions = await prisma.$transaction(createOps);
    selectedBankQuestions.push(...savedQuestions);
  }

  // 8. Build question list for assignment (IDs + order)
  const questionList = selectedBankQuestions.map((q, i) => ({
    questionId: q.id,
    orderIndex: i,
  }));

  const maxMarks = selectedBankQuestions.reduce((sum, q) => {
    const content = q.content as { maxMarks?: number };
    return sum + (content.maxMarks ?? 5);
  }, 0);

  // 9. Create the Assignment record
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
      questions: toJson(questionList),
      maxMarks,
      timeLimit: timeLimit ?? null,
      isAIGenerated: aiQCount > 0,
      targetGrade: subject.grade,
      targetBoard: subject.board,
    },
    include: {
      subject: true,
      chapter: true,
    },
  });

  return { assignment, questionList: selectedBankQuestions };
}

// ─────────────────────────────────────────────────────────
// AI Question Generator (Gemini Flash)
// ─────────────────────────────────────────────────────────

interface GenerateQuestionsInput {
  subjectName: string;
  grade: string;
  chapterName: string;
  subtopics: string;
  difficulty: DifficultyLevel;
  count: number;
}

async function generateQuestionsWithAI(
  input: GenerateQuestionsInput
): Promise<AIGeneratedQuestion[]> {
  const prompt = buildQuestionGenerationPrompt(input);
  return callGemini(geminiFlash, prompt, [], AIAssignmentOutputSchema);
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function buildTitle({
  subjectName,
  type,
  difficulty,
  chapterName,
}: {
  subjectName: string;
  type: AssignmentType;
  difficulty: DifficultyLevel;
  chapterName: string | null | undefined;
}): string {
  const typeLabel: Record<AssignmentType, string> = {
    CHAPTER: chapterName ? `${chapterName} Test` : "Chapter Test",
    SEMESTER: "Semester Test",
    FULL_SYLLABUS: "Full Syllabus Test",
    REMEDIAL: "Remedial Practice",
    DIAGNOSTIC: "Diagnostic Assessment",
  };

  const diffLabel: Record<DifficultyLevel, string> = {
    EASY: "Easy",
    MEDIUM: "Medium",
    HARD: "Hard",
    MIXED: "",
  };

  const diffSuffix = diffLabel[difficulty] ? ` — ${diffLabel[difficulty]}` : "";
  return `${subjectName} ${typeLabel[type]}${diffSuffix}`;
}
