import { prisma } from "@/lib/db";
import { callGemini } from "@/lib/gemini";
import { toJson } from "@/lib/prisma-json";
import { buildQuestionGenerationPrompt } from "@/prompts/question-generation";
import { AIAssignmentOutputSchema, type AIQuestion } from "@/types/ai-schemas";
import { DifficultyLevel, QuestionType, BloomLevel } from "@prisma/client";

interface SeedOptions {
  topicId: string;
  strategy: "STANDARD" | "EXAM_EXCELLENCE" | "COMPETENCY_FOCUS";
  quantity: number;
}

/**
 * Service to seed the Question Bank using AI with strategic distributions.
 */
export async function seedQuestionBank({ topicId, strategy, quantity }: SeedOptions) {
  // 1. Fetch Topic context
  const topic = await prisma.topic.findUniqueOrThrow({
    where: { id: topicId },
    include: { chapter: { include: { subject: true } } },
  });

  // 2. Build Prompt with the selected strategy
  const prompt = buildQuestionGenerationPrompt({
    subjectName: topic.chapter.subject.name,
    grade: topic.chapter.subject.grade,
    chapterName: topic.chapter.name,
    subtopics: topic.name,
    difficulty: "MIXED", // Bank seeding usually aims for a balanced mix
    count: quantity,
    strategy,
  });

  // 3. Call AI (Pro model for high-quality seeding)
  const result = await callGemini("PRO", prompt, { questions: [] });
  
  // 4. Validate output
  const parsed = AIAssignmentOutputSchema.safeParse(result);
  if (!parsed.success) {
    console.error("[seedQuestionBank] Validation failed:", parsed.error);
    throw new Error("AI output failed to match the required Question Bank schema.");
  }

  // 5. Commit to Database
  const created = await prisma.question.createManyAndReturn({
    data: parsed.data.questions.map((q) => ({
      subtopicId: topicId,
      type: q.type as QuestionType,
      bloomLevel: q.bloomLevel as BloomLevel,
      difficulty: q.difficulty,
      content: toJson(q.content),
      source: "ai_seed",
      verifiedByHuman: false, // Seeds usually require a manual admin review later
      avgAccuracy: 0,
      totalAttempts: 0,
    })),
  });

  return {
    success: true,
    count: created.length,
    topicName: topic.name,
    strategy
  };
}
