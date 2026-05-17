import { prisma } from "@/lib/db";
import { callGemini } from "@/lib/gemini";
import { z } from "zod";

/**
 * The "Brain" of the question bank. 
 * Performs periodic audits to prune redundancy and enforce academic relevance.
 */
export async function runCurationCycle() {
  console.log("[CurationEngine] Starting curation cycle...");

  // 1. Prune 3-month old archived questions (User Policy)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const deleted = await prisma.question.deleteMany({
    where: {
      isArchived: true,
      archivedAt: { lt: threeMonthsAgo },
    },
  });
  console.log(`[CurationEngine] Deleted ${deleted.count} stale archived questions.`);

  // 2. Redundancy Pruning (Subtopic level)
  const subtopics = await prisma.subtopic.findMany({
    select: { id: true, name: true },
  });

  for (const subtopic of subtopics) {
    await pruneRedundantQuestions(subtopic.id);
  }

  console.log("[CurationEngine] Curation cycle complete.");
}

/**
 * Analyzes questions in a subtopic and archives duplicates.
 */
async function pruneRedundantQuestions(subtopicId: string) {
  const questions = await prisma.question.findMany({
    where: { subtopicId, isArchived: false },
    select: { id: true, content: true, usageCount: true, avgAccuracy: true },
  });

  if (questions.length < 10) return; // Only prune if we have enough depth

  // Use AI to identify clusters of near-identical questions
  const prompt = `
    Analyze the following questions for the same subtopic. 
    Identify groups of questions that test the exact same concept with nearly identical wording or logic.
    For each group, pick the "best" question to keep (the one with highest usage or clarity) and list the IDs of the redundant ones.

    QUESTIONS:
    ${questions.map(q => `ID: ${q.id} | Content: ${JSON.stringify(q.content)}`).join("\n")}

    OUTPUT:
    Return a JSON array of question IDs to ARCHIVE.
  `;

  const redundantIds = await callGemini(
    "PRO",
    prompt,
    [] as string[],
    z.array(z.string())
  );

  if (redundantIds.length > 0) {
    await prisma.question.updateMany({
      where: { id: { in: redundantIds } },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });
    console.log(`[CurationEngine] Archived ${redundantIds.length} redundant questions in subtopic ${subtopicId}.`);
  }
}
