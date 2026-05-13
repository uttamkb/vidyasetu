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
import { geminiProModels, geminiFlashModels, callGemini } from "@/lib/gemini";
import { toJson } from "@/lib/prisma-json";
import { 
  EVALUATION_PROMPT, 
  MULTIMODAL_EVALUATION_PROMPT, 
  OVERALL_FEEDBACK_PROMPT 
} from "@/prompts/evaluation";
import { BATCH_EVALUATION_PROMPT, BatchEvaluationQuestion } from "@/prompts/batch-evaluation";

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
    const originalAnswer = rawAnswers.find(a => a.questionId === sub.questionId || (sub.questionId.startsWith("idx-") && a.questionIndex === parseInt(sub.questionId.split("-")[1])));
    
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
  const studentAns = String(answer.userAnswer || "").trim();
  const modelAns = String(content.correctAnswer || "").trim();
  const options = (content.options as string[]) || [];
  const maxMarks = content.maxMarks || 1;

  const clean = (text: string) => text.replace(/^[A-Z][\.\)\-\s]+/, "").trim().toLowerCase();
  const isCorrect = studentAns.toUpperCase() === (options.findIndex(o => clean(o) === clean(modelAns)) !== -1 ? String.fromCharCode(65 + options.findIndex(o => clean(o) === clean(modelAns))) : "") ||
                    clean(studentAns) === clean(modelAns) ||
                    studentAns.toLowerCase() === modelAns.toLowerCase();

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

  const chunks = [];
  for (let i = 0; i < questions.length; i += 5) {
    chunks.push(questions.slice(i, i + 5));
  }

  const allResults = [];
  for (const chunk of chunks) {
    const prompt = BATCH_EVALUATION_PROMPT({ grade, subject, questions: chunk });
    
    try {
      const results = await callGemini<any[]>(
        geminiProModels, 
        prompt, 
        [], 
        undefined, 
        { userId, type: "EVALUATION" }
      );
      allResults.push(...results);
    } catch (e) {
      console.error("[EvaluationEngine] Batch failed, falling back to individual:", e);
      // Fallback: Evaluate individually
      for (const q of chunk) {
        const individual = await evaluateSubjectiveAnswer({
          ...q, grade, subject, studentAnswer: q.studentAnswer
        });
        allResults.push({ questionId: q.questionId, ...individual });
      }
    }
  }
  return allResults;
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

  return await callGemini<AIEvalResult>(geminiProModels, finalPrompt, {
    isCorrect: false,
    marksAwarded: 0,
    feedback: "Unable to evaluate this answer automatically. Please check manually.",
    correction: modelAnswer,
    explanation: "",
  });
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

  const wrongCount = evaluatedAnswers.filter((a) => !a.isCorrect).length;
  const correctCount = evaluatedAnswers.filter((a) => a.isCorrect).length;
  const skippedCount = totalQuestionCount - evaluatedAnswers.length;

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
    geminiFlashModels,
    prompt,
    { feedback: `You scored ${score}/${maxMarks}. Review the incorrect answers and practice those topics again.` }
  );

  return result.feedback;
}

// ─────────────────────────────────────────────────────────
// Update UserMastery after evaluation
// ─────────────────────────────────────────────────────────

async function updateMasteryAndCalculateGain(
  userId: string,
  updates: { subtopicId: string; isCorrect: boolean }[]
): Promise<number> {
  let totalNetGain = 0;

  for (const { subtopicId, isCorrect } of updates) {
    const existing = await prisma.userMastery.findUnique({
      where: { userId_subtopicId: { userId, subtopicId } }
    });

    if (!existing) {
      const initialScore = isCorrect ? 20 : 5;
      totalNetGain += initialScore;
      await prisma.userMastery.create({
        data: {
          userId,
          subtopicId,
          masteryScore: initialScore,
          totalAttempts: 1,
          correctAttempts: isCorrect ? 1 : 0,
          consecutiveCorrect: isCorrect ? 1 : 0,
          lastPracticed: new Date(),
          difficultyCalibration: 1,
        }
      });
    } else {
      const oldScore = existing.masteryScore;
      const newScore = isCorrect ? Math.min(100, oldScore + 5) : Math.max(0, oldScore - 3);
      
      if (newScore > oldScore) {
        totalNetGain += (newScore - oldScore);
      }

      await prisma.userMastery.update({
        where: { id: existing.id },
        data: {
          totalAttempts: { increment: 1 },
          correctAttempts: { increment: isCorrect ? 1 : 0 },
          consecutiveCorrect: isCorrect ? { increment: 1 } : { set: 0 },
          masteryScore: newScore,
          lastPracticed: new Date(),
          updatedAt: new Date(),
        }
      });
    }
  }

  return totalNetGain;
}

// ─────────────────────────────────────────────────────────
// Update LeaderboardEntry (Cumulative Growth Score)
// ─────────────────────────────────────────────────────────

function calculateGrowthScore(
  percentageScore: number,
  streak: number,
  netMasteryGained: number,
  difficulty: string,
  timeTaken: number | null,
  timeLimit: number | null
): number {
  // 1. Consistency (25%) -> Cap at 14 days
  const streakScore = Math.min(streak / 14, 1.0) * 25;

  // 2. Mastery Improvement (30%) -> Cap at +15 points gained per submission
  const masteryScore = Math.min(netMasteryGained / 15, 1.0) * 30;

  // 3. Accuracy (20%)
  const accuracyScore = (percentageScore / 100) * 20;

  // 4. Difficulty Attempted (15%)
  let diffMult = 0.6; // MIXED
  if (difficulty === "HARD") diffMult = 1.0;
  if (difficulty === "MEDIUM") diffMult = 0.7;
  if (difficulty === "EASY") diffMult = 0.3;
  const difficultyScore = diffMult * 15;

  // 5. Study Time Quality (10%)
  let timeScore = 5;
  if (timeTaken && timeTaken > 30) timeScore = 10; // good faith effort > 30s

  const totalGrowth = streakScore + masteryScore + accuracyScore + difficultyScore + timeScore;
  return Math.round(totalGrowth);
}

async function updateLeaderboard(userId: string, growthScore: number) {
  // Check if user has opted into leaderboard
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { leaderboardOptIn: true },
  });

  if (!user?.leaderboardOptIn) return;

  const now = new Date();
  const weekPeriod = getWeekPeriod(now);
  const monthPeriod = getMonthPeriod(now);

  for (const { period, periodType } of [
    { period: weekPeriod, periodType: "WEEKLY" as const },
    { period: monthPeriod, periodType: "MONTHLY" as const },
    { period: "ALL", periodType: "ALL_TIME" as const },
  ]) {
    await prisma.leaderboardEntry.upsert({
      where: { userId_period_periodType: { userId, period, periodType } },
      create: {
        userId,
        period,
        periodType,
        totalScore: growthScore, // Store initial cumulative score
        submissionCount: 1,
      },
      update: {
        totalScore: { increment: growthScore }, // Stack cumulative points!
        submissionCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });
  }
}

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
