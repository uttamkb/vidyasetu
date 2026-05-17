import { prisma } from "@/lib/db";

export interface SourceDistribution {
  source: string;
  count: number;
  percentage: number;
}

/**
 * Calculates the distribution of questions in the bank by their academic source.
 */
export async function getQuestionSourceDistribution(grade?: string, subjectId?: string) {
  // 1. Fetch all questions with source metadata
  // We look into the 'content' JSON for the 'source' or 'difficulty' markers if explicit source field isn't enough
  const questions = await prisma.question.findMany({
    where: {
      ...(grade ? { subtopic: { topic: { chapter: { subject: { grade } } } } } : {}),
      ...(subjectId ? { subtopic: { topic: { chapter: { subjectId } } } } : {}),
    },
    select: {
      source: true,
      content: true,
    }
  });

  const total = questions.length;
  if (total === 0) return [];

  const counts: Record<string, number> = {
    "NCERT": 0,
    "RD_SHARMA": 0,
    "CBSE_COMPETENCY": 0,
    "HOTS": 0,
    "OTHER": 0
  };

  questions.forEach(q => {
    const content = q.content as any;
    const sourceTag = q.source?.toUpperCase() || "OTHER";
    const strategyTag = content.strategy?.toUpperCase();

    if (strategyTag === "NCERT" || sourceTag.includes("NCERT")) counts["NCERT"]++;
    else if (strategyTag === "RD_SHARMA" || sourceTag.includes("RD")) counts["RD_SHARMA"]++;
    else if (strategyTag === "COMPETENCY" || sourceTag.includes("COMPETENCY")) counts["CBSE_COMPETENCY"]++;
    else if (strategyTag === "HOTS" || sourceTag.includes("HOTS")) counts["HOTS"]++;
    else counts["OTHER"]++;
  });

  return Object.entries(counts).map(([source, count]) => ({
    source,
    count,
    percentage: Math.round((count / total) * 100)
  })).filter(d => d.count > 0);
}
