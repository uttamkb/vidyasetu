/**
 * Diagnostic Engine core logic.
 *
 * This module is intentionally pure: no Prisma, no auth, no HTTP.
 * API routes can call these functions after loading the current
 * student's grade/board curriculum from the database.
 */

export type DiagnosticSubtopic = {
  id: string;
  name: string;
  orderIndex?: number | null;
};

export type DiagnosticTopic = {
  id: string;
  name: string;
  orderIndex?: number | null;
  subtopics: DiagnosticSubtopic[];
};

export type DiagnosticChapter = {
  id: string;
  name: string;
  orderIndex?: number | null;
  topics: DiagnosticTopic[];
};

export type DiagnosticSubject = {
  id: string;
  name: string;
  orderIndex?: number | null;
  chapters: DiagnosticChapter[];
};

export type DiagnosticPlanItem = {
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  topicId: string;
  topicName: string;
  subtopicId: string;
  subtopicName: string;
  orderIndex: number;
};

export type BuildDiagnosticPlanOptions = {
  targetQuestionCount?: number;
};

export type DiagnosticAnswerResult = {
  subtopicId: string;
  isCorrect: boolean;
  confidence?: number | null; // 1-5, optional
};

export type InitialMasteryEstimate = {
  subtopicId: string;
  masteryScore: number;
  stability: number;
  retrievability: number;
  totalAttempts: number;
  correctAttempts: number;
  consecutiveCorrect: number;
};

function byOrderThenName<T extends { orderIndex?: number | null; name: string }>(a: T, b: T): number {
  const orderA = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Builds a balanced, interleaved diagnostic plan across all available subjects.
 *
 * Selection rule:
 * - Flatten each subject into ordered subtopics.
 * - Round-robin across subjects to avoid testing one subject in a block.
 * - Stop at targetQuestionCount or total available subtopics.
 */
export function buildDiagnosticPlan(
  subjects: DiagnosticSubject[],
  options: BuildDiagnosticPlanOptions = {}
): DiagnosticPlanItem[] {
  const targetQuestionCount = clamp(options.targetQuestionCount ?? 25, 1, 100);
  const seenSubtopics = new Set<string>();

  const subjectQueues = [...subjects]
    .sort(byOrderThenName)
    .map((subject) => {
      const items: Omit<DiagnosticPlanItem, "orderIndex">[] = [];

      for (const chapter of [...subject.chapters].sort(byOrderThenName)) {
        for (const topic of [...chapter.topics].sort(byOrderThenName)) {
          for (const subtopic of [...topic.subtopics].sort(byOrderThenName)) {
            if (seenSubtopics.has(subtopic.id)) continue;
            seenSubtopics.add(subtopic.id);
            items.push({
              subjectId: subject.id,
              subjectName: subject.name,
              chapterId: chapter.id,
              chapterName: chapter.name,
              topicId: topic.id,
              topicName: topic.name,
              subtopicId: subtopic.id,
              subtopicName: subtopic.name,
            });
          }
        }
      }

      return items;
    })
    .filter((items) => items.length > 0);

  const plan: DiagnosticPlanItem[] = [];
  const activeQueues = subjectQueues.map((q) => [...q]);

  while (plan.length < targetQuestionCount && activeQueues.length > 0) {
    for (let i = 0; i < activeQueues.length; i++) {
      if (plan.length >= targetQuestionCount) break;

      const queue = activeQueues[i];
      const next = queue.shift();
      if (next) {
        plan.push({ ...next, orderIndex: plan.length });
      }

      if (queue.length === 0) {
        activeQueues.splice(i, 1);
        i--; // Adjust index after removal
      }
    }
  }

  return plan;
}

/**
 * Converts diagnostic answer outcomes into initial UserMastery estimates.
 *
 * Deliberately conservative: a diagnostic is noisy, so even correct answers
 * do not imply full mastery. Later spaced repetition/practice updates refine it.
 */
export function estimateInitialMastery(results: DiagnosticAnswerResult[]): InitialMasteryEstimate[] {
  const bySubtopic = new Map<string, DiagnosticAnswerResult[]>();

  for (const result of results) {
    const existing = bySubtopic.get(result.subtopicId) ?? [];
    existing.push(result);
    bySubtopic.set(result.subtopicId, existing);
  }

  return Array.from(bySubtopic.entries()).map(([subtopicId, attempts]) => {
    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter((attempt) => attempt.isCorrect).length;
    const accuracy = totalAttempts === 0 ? 0 : correctAttempts / totalAttempts;

    const avgConfidence = attempts.reduce((sum, attempt) => {
      return sum + clamp(attempt.confidence ?? 3, 1, 5);
    }, 0) / Math.max(1, totalAttempts);

    // 20-80 score band: diagnostic is an initial estimate, not final mastery.
    const confidenceAdjustment = (avgConfidence - 3) * 2;
    const masteryScore = Math.round(clamp(20 + accuracy * 60 + confidenceAdjustment, 0, 100));
    const stability = Number(clamp(1 + accuracy * 6, 1, 7).toFixed(2));

    return {
      subtopicId,
      masteryScore,
      stability,
      retrievability: Number(clamp(accuracy, 0, 1).toFixed(2)),
      totalAttempts,
      correctAttempts,
      consecutiveCorrect: attempts.at(-1)?.isCorrect ? 1 : 0,
    };
  });
}
