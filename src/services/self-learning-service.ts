import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { toJson } from "@/lib/prisma-json";

interface AIFeedback {
  type: "TRANSCRIPTION" | "EVALUATION";
  targetId: string;
  aiOutput: any;
  humanCorrection?: any;
  isCorrect: boolean;
  feedback?: string;
  subjectId?: string;
  grade?: string;
  modelName?: string;
}

/**
 * Captures feedback on AI performance to build a 'Self-Learning' dataset.
 */
export async function captureAIFeedback(data: AIFeedback) {
  return await prisma.aIValidation.create({
    data: {
      type: data.type,
      targetId: data.targetId,
      aiOutput: toJson(data.aiOutput),
      humanCorrection: data.humanCorrection ? toJson(data.humanCorrection) : Prisma.JsonNull,
      isCorrect: data.isCorrect,
      feedback: data.feedback,
      subjectId: data.subjectId,
      grade: data.grade,
      modelName: data.modelName,
    }
  });
}

/**
 * Fetches recent high-quality corrections and formats them for prompt injection.
 */
export async function getFewShotContext(type: "TRANSCRIPTION" | "EVALUATION", limit: number = 3): Promise<string> {
  const examples = await prisma.aIValidation.findMany({
    where: {
      type,
      isCorrect: false,
      humanCorrection: { not: Prisma.JsonNull }
    },
    take: limit,
    orderBy: { createdAt: "desc" }
  });

  if (examples.length === 0) return "";

  let context = `\n### PAST CORRECTIONS (FEW-SHOT LEARNING)\n`;
  context += `The following are examples of where you previously made mistakes. LEARN from these corrections and do not repeat them:\n\n`;

  examples.forEach((ex: any, i: number) => {
    context += `CASE ${i + 1}:\n`;
    context += `- AI PREVIOUS OUTPUT: ${JSON.stringify(ex.aiOutput)}\n`;
    context += `- HUMAN CORRECTION (EXPECTED): ${JSON.stringify(ex.humanCorrection)}\n`;
    if (ex.feedback) context += `- REASON FOR CORRECTION: ${ex.feedback}\n`;
    context += `\n`;
  });

  return context;
}

/**
 * Promotes high-performing AI-generated questions to the verified master database.
 * This runs periodically to naturally enrich the master question bank at zero human cost.
 */
export async function promoteHighPerformingQuestions(minUsage: number = 5): Promise<number> {
  const eligibleQuestions = await prisma.question.findMany({
    where: {
      verifiedByHuman: false,
      source: { in: ["ai_generated", "ai_seed"] },
      usageCount: { gte: minUsage },
      avgAccuracy: { gte: 0.6, lte: 0.95 },
      isArchived: false,
    },
    select: { id: true }
  });

  if (eligibleQuestions.length === 0) return 0;

  const ids = eligibleQuestions.map(q => q.id);

  await prisma.question.updateMany({
    where: { id: { in: ids } },
    data: {
      verifiedByHuman: true,
      source: "ai_promoted",
    }
  });

  console.log(`[Self-Learning] Auto-promoted ${ids.length} high-performing AI questions to the verified master bank.`);
  return ids.length;
}
