/**
 * Evaluation Engine Service
 *
 * Evaluates student submissions:
 * - MCQ / NUMERIC: auto-graded by exact match
 * - SHORT_ANSWER / LONG_ANSWER: AI-evaluated via Gemini Pro
 * - Overall AI feedback paragraph generated after all questions
 * - UserMastery updated post-evaluation
 */

import { prisma } from "@/lib/db";
import { callGemini } from "@/lib/gemini";
import { toJson } from "@/lib/prisma-json";
import { withCache, cacheGet, cacheSet } from "@/lib/cache";
import { trackCacheHit } from "@/services/usage-tracker";
import {
  EVALUATION_PROMPT,
  MULTIMODAL_EVALUATION_PROMPT,
  OVERALL_FEEDBACK_PROMPT
} from "@/prompts/evaluation";
import { BATCH_EVALUATION_PROMPT, BatchEvaluationQuestion } from "@/prompts/batch-evaluation";
import { getFewShotContext } from "./self-learning-service";
import { incrementUsage } from "@/lib/require-subscription";
import { z } from "zod";

const MarkingComponentSchema = z.object({
  component: z.string(),
  marks: z.number(),
  maxMarks: z.number(),
  status: z.enum(['FULL', 'PARTIAL', 'NONE']),
  reason: z.string().optional(),
});

const AIEvalResultSchema = z.object({
  isCorrect: z.boolean(),
  marksAwarded: z.number(),
  feedback: z.string(),
  correction: z.string(),
  explanation: z.string(),
  markingBreakdown: z.array(MarkingComponentSchema).optional(),
});

const BatchEvaluationItemSchema = z.object({
  questionId: z.string(),
  isCorrect: z.boolean(),
  marksAwarded: z.number(),
  feedback: z.string(),
  correction: z.string(),
  explanation: z.string(),
  markingBreakdown: z.array(MarkingComponentSchema).optional(),
});

const BatchEvaluationResultSchema = z.array(BatchEvaluationItemSchema);

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface SubmittedAnswer {
  questionId?: string;
  questionIndex: number;
  userAnswer: string | number | null;
}

interface EvaluatedAnswer {
  questionId?: string;
  questionIndex: number;
  userAnswer: string | number | null;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  feedback: string;
  correction: string;
  explanation: string;
  markingBreakdown?: MarkingComponent[];
}

interface MarkingComponent {
  component: string;
  marks: number;
  maxMarks: number;
  status: 'FULL' | 'PARTIAL' | 'NONE';
  reason?: string;
}

interface AIEvalResult {
  isCorrect: boolean;
  marksAwarded: number;
  feedback: string;
  correction: string;
  explanation: string;
  markingBreakdown?: MarkingComponent[];
}

// ─────────────────────────────────────────────────────────
// Main: Evaluate Submission
// ─────────────────────────────────────────────────────────

export async function evaluateSubmission(submissionId: string) {
  // 1. Fetch submission + assignment + questions
  const submission = await prisma.submission.findUniqueOrThrow({
    where: { id: submissionId },
    include: {
      assignment: { include: { subject: true } },
      user: { include: { studyStreak: true } },
    },
  });

  if (submission.status === "EVALUATED") {
    return { skipped: true, reason: "Already evaluated" };
  }

  // Update status to starting
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "ANALYZING_ANSWERS" },
  });

  const rawAnswers = submission.answers as unknown as SubmittedAnswer[];
  const questionIds = rawAnswers.map((a) => a.questionId).filter(Boolean) as string[];

  // 2. Fetch question data
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    include: { subtopic: true },
  });

  const questionMap = Object.fromEntries(questions.map((q) => [q.id, q]));
  const assignmentQuestions = submission.assignment.questions as any[];

  // 3. Separate Objective and Subjective answers
  const evaluatedAnswers: EvaluatedAnswer[] = [];
  const subjectiveQueue: BatchEvaluationQuestion[] = [];
  const objectiveResults: EvaluatedAnswer[] = [];

  for (const answer of rawAnswers) {
    let content: any, type: string, id: string | undefined, maxMarks: number;

    if (answer.questionId && questionMap[answer.questionId]) {
      const q = questionMap[answer.questionId];
      content = q.content;
      type = q.type;
      id = q.id;
      maxMarks = (content as any).maxMarks || 5;
    } else {
      const inlineQ = assignmentQuestions[answer.questionIndex];
      if (!inlineQ) continue;
      content = {
        question: inlineQ.question,
        correctAnswer: inlineQ.correctAnswer,
        maxMarks: inlineQ.marks || inlineQ.maxMarks || 5,
        keyPoints: inlineQ.keyPoints,
      };
      type = inlineQ.type;
      id = undefined;
      maxMarks = content.maxMarks;
    }

    if (type === "MCQ" || type === "NUMERIC") {
      // Auto-grade Objective (Immediate)
      objectiveResults.push(evaluateObjective(answer, content, id));
    } else {
      // Queue for Batch AI Evaluation
      subjectiveQueue.push({
        questionId: id || `idx-${answer.questionIndex}`,
        question: content.question,
        modelAnswer: content.correctAnswer,
        studentAnswer: String(answer.userAnswer ?? ""),
        maxMarks: maxMarks,
        keyPoints: content.keyPoints,
      });
    }
  }

  // 4. Batch Evaluate Subjective Answers (Chunked)
  const subjectiveResults = await evaluateSubjectiveBatch(
    subjectiveQueue,
    submission.assignment.subject.grade,
    submission.assignment.subject.name,
    submission.userId
  );

  // Combine results
  evaluatedAnswers.push(...objectiveResults);

  // Map subjective results back to full EvaluatedAnswer format
  for (const sub of subjectiveQueue) {
    const aiResult = subjectiveResults.find(r => r.questionId === sub.questionId);
    const originalAnswer = rawAnswers.find(a => a.questionId === sub.questionId);

    if (aiResult && originalAnswer) {
      evaluatedAnswers.push({
        questionId: originalAnswer.questionId,
        questionIndex: originalAnswer.questionIndex,
        userAnswer: originalAnswer.userAnswer,
        ...aiResult,
        marksAwarded: Math.min(sub.maxMarks, Math.max(0, aiResult.marksAwarded)),
        maxMarks: sub.maxMarks,
      });
    }
  }

  // 5. Generate overall AI feedback
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "GENERATING_FEEDBACK" },
  });

  const totalScore = evaluatedAnswers.reduce((sum, a) => sum + a.marksAwarded, 0);
  const maxMarks = submission.maxMarks;
  const percentageScore = maxMarks > 0 ? Math.round((totalScore / maxMarks) * 100) : 0;

  const overallFeedback = await generateOverallFeedback({
    subjectName: submission.assignment.subject.name,
    score: totalScore,
    maxMarks,
    percentageScore,
    evaluatedAnswers,
    totalQuestionCount: rawAnswers.length,
    grade: submission.assignment.subject.grade,
  });

  // 6. DB Transaction: Finalize Submission + Mastery + Leaderboard
  await prisma.$transaction(async (tx) => {
    // A. Update Submission
    await tx.submission.update({
      where: { id: submissionId },
      data: {
        answers: toJson(evaluatedAnswers),
        totalScore,
        percentageScore,
        aiFeedback: overallFeedback,
        status: "EVALUATED",
        evaluatedAt: new Date(),
      },
    });

    // B. Update Mastery (Aggregated)
    const masteryUpdates = evaluatedAnswers
      .filter(a => a.questionId && questionMap[a.questionId]?.subtopicId)
      .map(a => ({
        subtopicId: questionMap[a.questionId!].subtopicId!,
        isCorrect: a.isCorrect
      }));

    const netMasteryGained = await updateMasteryInTransaction(tx, submission.userId, masteryUpdates);

    // C. Update Leaderboard
    const streak = submission.user.studyStreak?.currentStreak ?? 0;
    const growthScore = calculateGrowthScore(
      percentageScore,
      streak,
      netMasteryGained,
      submission.assignment.difficulty,
      submission.timeTaken,
      submission.assignment.timeLimit
    );
    await updateLeaderboardInTransaction(tx, submission.userId, growthScore);

    // D. Increment user activity counters (fire-and-forget after transaction)
  });

  // Update counters outside transaction to avoid lock contention
  // Only run if prisma.user.update exists (may be mocked in tests)
  if (typeof prisma.user?.update === "function") {
    prisma.user.update({
      where: { id: submission.userId },
      data: {
        totalSubmissions: { increment: 1 },
        lastActiveAt: new Date(),
      },
    }).catch((err) => {
      console.error("[evaluation-engine] Failed to update user counters:", err);
    });
  }

  // Increment usage for subscription limits only after successful subjective/objective evaluation completion
  incrementUsage(submission.userId, "EVALUATION").catch((err) => {
    console.error("[evaluation-engine] Failed to increment AI usage limit:", err);
  });

  return {
    success: true,
    submissionId,
    totalScore,
    maxMarks,
    percentageScore,
    aiFeedback: overallFeedback,
    answers: evaluatedAnswers,
  };
}

// ─────────────────────────────────────────────────────────
// Helpers: Batch Evaluation & Objective Grading
// ─────────────────────────────────────────────────────────

function evaluateObjective(answer: SubmittedAnswer, content: any, id?: string): EvaluatedAnswer {
  const studentRaw = String(answer.userAnswer || "").trim();
  const modelRaw = String(content.correctAnswer || "").trim();
  const options = (content.options as string[]) || [];
  const maxMarks = content.maxMarks || 1;

  // Normalizes text by removing labels (A., B., 1.), extra spaces, and casing
  const normalize = (text: string) => {
    return text
      .replace(/^[a-zA-Z0-9][\.\)\-\s]+/, "") // Strip "A.", "1.", "a)"
      .replace(/\s+/g, "")                    // Strip all whitespace
      .toLowerCase();
  };

  const studentNormalized = normalize(studentRaw);
  const modelNormalized = normalize(modelRaw);

  // 1. Direct normalized match (handles "B. Binomial" vs "Binomial")
  let isCorrect = studentNormalized === modelNormalized;

  // 2. Index-based match (handles if student just wrote "B" or "2")
  if (!isCorrect && options.length > 0) {
    const studentAsIndex = studentRaw.toUpperCase().replace(/[^A-Z0-9]/g, "");

    // Check if student picked a letter (A, B, C...)
    const modelIndex = options.findIndex(o => normalize(o) === modelNormalized);
    if (modelIndex !== -1) {
      const modelLetter = String.fromCharCode(65 + modelIndex); // "A", "B"...
      if (studentAsIndex === modelLetter || studentNormalized === normalize(options[modelIndex])) {
        isCorrect = true;
      }
    }

    // Check if student picked a number (1, 2, 3...)
    if (!isCorrect && /^\d+$/.test(studentAsIndex)) {
      const studentNum = parseInt(studentAsIndex);
      if (studentNum === modelIndex + 1) isCorrect = true;
    }
  }

  // 3. Reverse match: Student wrote text, Model is just a letter
  if (!isCorrect && modelRaw.length === 1 && options.length > 0) {
    const modelIndex = modelRaw.toUpperCase().charCodeAt(0) - 65;
    if (modelIndex >= 0 && modelIndex < options.length) {
      if (studentNormalized === normalize(options[modelIndex])) isCorrect = true;
    }
  }

  // DIAGNOSTIC LOG: This will show up in your SystemLog table
  import("@/lib/logger").then(({ logger }) => {
    logger.info(`Grading MCQ Q${answer.questionIndex}`, {
      category: "DB",
      metadata: {
        studentRaw,
        modelRaw,
        studentNormalized,
        modelNormalized,
        isCorrect,
        optionsCount: options.length
      }
    });
  });

  return {
    questionId: id,
    questionIndex: answer.questionIndex,
    userAnswer: answer.userAnswer,
    isCorrect,
    marksAwarded: isCorrect ? maxMarks : 0,
    maxMarks,
    feedback: isCorrect ? "Correct!" : "Incorrect.",
    correction: isCorrect ? "" : `Correct answer: ${content.correctAnswer}`,
    explanation: content.explanation || "",
  };
}

async function evaluateSubjectiveBatch(
  questions: BatchEvaluationQuestion[],
  grade: string,
  subject: string,
  userId: string
): Promise<any[]> {
  if (questions.length === 0) return [];

  const results: any[] = [];
  const misses: BatchEvaluationQuestion[] = [];

  // 1. Check individual caches first to minimize AI calls
  for (const q of questions) {
    const cached = await checkIndividualEvaluationCache(q, grade, subject);
    if (cached) {
      results.push({ questionId: q.questionId, ...cached });
      trackCacheHit(userId, "EVALUATION", 2000).catch(() => {});
    } else {
      misses.push(q);
    }
  }

  if (misses.length === 0) return results;

  // 2. Process misses in chunks with dynamic sizing
  const isComplexSubject = ["MATHEMATICS", "SCIENCE"].includes(subject.toUpperCase());
  const avgAnswerLength = misses.reduce((sum, q) => sum + (q.studentAnswer?.length || 0), 0) / (misses.length || 1);
  
  // Dynamic chunk sizing: 10 for short/non-complex answers, 5 for complex math/long answers
  const chunkSize = (isComplexSubject || avgAnswerLength > 200) ? 5 : 10;

  const chunks = [];
  for (let i = 0; i < misses.length; i += chunkSize) {
    chunks.push(misses.slice(i, i + chunkSize));
  }

  for (const chunk of chunks) {
    const fewShotContext = await getFewShotContext("EVALUATION", 3);
    const prompt = BATCH_EVALUATION_PROMPT({ grade, subject, questions: chunk, fewShotContext });

    try {
      const batchResults = await callGemini<z.infer<typeof BatchEvaluationResultSchema>>(
        "PRO",
        prompt,
        [],
        BatchEvaluationResultSchema,
        { userId, type: "EVALUATION" }
      );
      
      // Save results to cache for future reuse
      for (const res of batchResults) {
        const original = chunk.find(c => c.questionId === res.questionId);
        if (original) {
          const max = original.maxMarks;
          res.marksAwarded = Math.max(0, Math.min(max, res.marksAwarded));
          saveIndividualEvaluationCache(original, res, grade, subject).catch(() => {});
        }
      }
      
      results.push(...batchResults);
    } catch (e) {
      console.error("[EvaluationEngine] Batch failed, falling back to individual:", e);
      for (const q of chunk) {
        const individual = await evaluateSubjectiveAnswer({
          ...q, grade, subject, studentAnswer: q.studentAnswer
        });
        results.push({ questionId: q.questionId, ...individual });
      }
    }
  }
  return results;
}

/**
 * Helper to normalize student answers for better cache hitting.
 * Removes extra whitespace, punctuation, and handles common variations.
 */
function normalizeStudentAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

async function checkIndividualEvaluationCache(q: BatchEvaluationQuestion, grade: string, subject: string) {
  const normalized = normalizeStudentAnswer(q.studentAnswer);
  const key = `eval:${hashKey(q.question, q.modelAnswer, normalized, q.maxMarks, grade, subject)}`;
  
  // Use the underlying cacheGet directly for performance
  return await cacheGet<AIEvalResult>(key);
}

async function saveIndividualEvaluationCache(q: BatchEvaluationQuestion, result: AIEvalResult, grade: string, subject: string) {
  const normalized = normalizeStudentAnswer(q.studentAnswer);
  const key = `eval:${hashKey(q.question, q.modelAnswer, normalized, q.maxMarks, grade, subject)}`;
  await cacheSet(key, result, 30 * 24 * 60 * 60 * 1000); // 30 day TTL
}

// SHA-256 helper for deterministic keys
function hashKey(...parts: any[]): string {
  const { createHash } = require("crypto");
  const normalized = parts.map((p) => String(p)).join("::");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

// Transaction-safe helpers (Logic moved from existing non-transaction functions)
async function updateMasteryInTransaction(tx: any, userId: string, updates: { subtopicId: string; isCorrect: boolean }[]) {
  let totalNetGain = 0;
  for (const { subtopicId, isCorrect } of updates) {
    const existing = await tx.userMastery.findUnique({ where: { userId_subtopicId: { userId, subtopicId } } });
    if (!existing) {
      const initialScore = isCorrect ? 20 : 5;
      totalNetGain += initialScore;
      await tx.userMastery.create({ data: { userId, subtopicId, masteryScore: initialScore, totalAttempts: 1, correctAttempts: isCorrect ? 1 : 0, consecutiveCorrect: isCorrect ? 1 : 0, lastPracticed: new Date(), difficultyCalibration: 1 } });
    } else {
      const oldScore = existing.masteryScore;
      const newScore = isCorrect ? Math.min(100, oldScore + 5) : Math.max(0, oldScore - 3);
      if (newScore > oldScore) totalNetGain += (newScore - oldScore);
      await tx.userMastery.update({ where: { id: existing.id }, data: { totalAttempts: { increment: 1 }, correctAttempts: { increment: isCorrect ? 1 : 0 }, consecutiveCorrect: isCorrect ? { increment: 1 } : { set: 0 }, masteryScore: newScore, lastPracticed: new Date(), updatedAt: new Date() } });
    }
  }
  return totalNetGain;
}

async function updateLeaderboardInTransaction(tx: any, userId: string, growthScore: number) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { leaderboardOptIn: true } });
  if (!user?.leaderboardOptIn) return;
  const now = new Date();
  const periods = [{ period: getWeekPeriod(now), periodType: "WEEKLY" as const }, { period: getMonthPeriod(now), periodType: "MONTHLY" as const }, { period: "ALL", periodType: "ALL_TIME" as const }];
  for (const { period, periodType } of periods) {
    await tx.leaderboardEntry.upsert({ where: { userId_period_periodType: { userId, period, periodType } }, create: { userId, period, periodType, totalScore: growthScore, submissionCount: 1 }, update: { totalScore: { increment: growthScore }, submissionCount: { increment: 1 }, updatedAt: new Date() } });
  }
}

// ─────────────────────────────────────────────────────────
// AI: Evaluate Subjective Answer (Gemini Pro)
// ─────────────────────────────────────────────────────────

async function evaluateSubjectiveAnswer(params: {
  question: string;
  modelAnswer: string;
  studentAnswer: string;
  maxMarks: number;
  grade: string;
  subject: string;
  keyPoints?: string[];
}): Promise<AIEvalResult> {
  const { question, modelAnswer, studentAnswer, maxMarks, grade, subject, keyPoints } = params;

  // Skip cache for image submissions (multimodal)
  if (studentAnswer.startsWith("data:image/")) {
    return await evaluateSubjectiveAnswerAI(params);
  }

  // CACHE: Individual answer evaluation keyed by (question + modelAnswer + studentAnswer hash)
  const { value: result, fromCache } = await withCache(
    "eval-answer",
    [question.slice(0, 100), modelAnswer.slice(0, 200), studentAnswer.slice(0, 500), maxMarks, grade, subject],
    async () => {
      return await evaluateSubjectiveAnswerAI(params);
    },
    24 * 60 * 60 * 1000 // 24 hour TTL for evaluations
  );

  if (fromCache) {
    console.log(`[evaluation-engine] Answer eval cache hit`);
    trackCacheHit("system", "EVALUATION", 4000).catch(() => {});
  }

  return result;
}

async function evaluateSubjectiveAnswerAI(params: {
  question: string;
  modelAnswer: string;
  studentAnswer: string;
  maxMarks: number;
  grade: string;
  subject: string;
  keyPoints?: string[];
}): Promise<AIEvalResult> {
  const { question, modelAnswer, studentAnswer, maxMarks, grade, subject, keyPoints } = params;

  const keyPointsSection = keyPoints && keyPoints.length > 0
    ? `\n\nKey Points Required for Full Marks:\n${keyPoints.map(p => `- ${p}`).join("\n")}`
    : "";

  let finalPrompt: any;

  // Multimodal prompt for drawings/graphs
  if (studentAnswer.startsWith("data:image/")) {
    const [header, base64] = studentAnswer.split(",");
    const mimeType = header.replace("data:", "").split(";")[0];

    finalPrompt = [
      MULTIMODAL_EVALUATION_PROMPT({ grade, subject, question, modelAnswer, maxMarks }),
      { inlineData: { data: base64, mimeType } }
    ];
  } else {
    finalPrompt = EVALUATION_PROMPT({
      question, modelAnswer, studentAnswer, maxMarks, grade, subject, keyPointsSection
    });
  }

  return await callGemini<AIEvalResult>("PRO", finalPrompt, {
    isCorrect: false,
    marksAwarded: 0,
    feedback: "Unable to evaluate this answer automatically. Please check manually.",
    correction: modelAnswer,
    explanation: "",
  }, AIEvalResultSchema);
}

// ─────────────────────────────────────────────────────────
// AI: Overall Feedback (Gemini Flash — cheaper)
// ─────────────────────────────────────────────────────────

async function generateOverallFeedback(params: {
  subjectName: string;
  score: number;
  maxMarks: number;
  percentageScore: number;
  evaluatedAnswers: EvaluatedAnswer[];
  totalQuestionCount: number;
  grade: string;
}): Promise<string> {
  const { subjectName, score, maxMarks, percentageScore, evaluatedAnswers, totalQuestionCount, grade } = params;

  // CACHE: Feedback only depends on score pattern, not exact answers
  // Key by (subject, grade, score, maxMarks, correctCount, wrongCount)
  const correctCount = evaluatedAnswers.filter((a) => a.isCorrect).length;
  const wrongCount = evaluatedAnswers.filter((a) => !a.isCorrect).length;
  const skippedCount = totalQuestionCount - evaluatedAnswers.length;

  const { value: feedback, fromCache } = await withCache(
    "feedback",
    [subjectName, grade, score, maxMarks, correctCount, wrongCount, skippedCount],
    async () => {
      const prompt = OVERALL_FEEDBACK_PROMPT({
        grade,
        subjectName,
        score,
        maxMarks,
        percentageScore,
        totalQuestionCount,
        correctCount,
        wrongCount,
        skippedCount
      });

      const result = await callGemini<{ feedback: string }>(
        "FLASH",
        prompt,
        { feedback: `You scored ${score}/${maxMarks}. Review the incorrect answers and practice those topics again.` }
      );

      return result.feedback;
    },
    60 * 60 * 1000 // 1 hour TTL for feedback
  );

  if (fromCache) {
    console.log(`[evaluation-engine] Feedback cache hit for ${subjectName} ${score}/${maxMarks}`);
    trackCacheHit("system", "EVALUATION", 2000).catch(() => {});
  }

  return feedback;
}

// Redundant standalone functions removed. Logic is now unified in transaction-safe helpers above.

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function getWeekPeriod(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  const year = d.getFullYear();
  const week = Math.ceil(
    ((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7
  );
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function getMonthPeriod(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Calculates a weighted Growth Score for the leaderboard.
 * Rewards accuracy, consistency (streak), mastery gains, and difficulty.
 */
function calculateGrowthScore(
  percentage: number,
  streak: number,
  masteryGained: number,
  difficulty: string,
  timeTaken: number | null,
  timeLimit: number | null
): number {
  // Base: Accuracy weighted (0-1000)
  let base = percentage * 10; 
  
  // Streak Bonus: +5% per streak day (capped at 50%)
  const streakBonus = Math.min(0.5, streak * 0.05) * base;
  
  // Mastery Bonus: Reward depth of learning
  const masteryBonus = Math.max(0, masteryGained * 20);
  
  // Difficulty Multiplier: Harder assignments yield higher rewards
  let diffMult = 1.0;
  if (difficulty === "HARD" || difficulty === "CHALLENGING") diffMult = 1.5;
  else if (difficulty === "MEDIUM") diffMult = 1.2;
  
  // Speed Bonus: Reward efficiency (if finished in < 40% of time)
  let speedBonus = 0;
  if (timeTaken && timeLimit && timeTaken > 0 && timeTaken < (timeLimit * 60 * 0.4)) {
    speedBonus = 50;
  }

  return Math.round((base + streakBonus + masteryBonus + speedBonus) * diffMult);
}
