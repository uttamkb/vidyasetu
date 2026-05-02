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
import { geminiPro, geminiFlash, callGemini } from "@/lib/gemini";
import { toJson } from "@/lib/prisma-json";

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
}

interface AIEvalResult {
  isCorrect: boolean;
  marksAwarded: number;
  feedback: string;
  correction: string;
  explanation: string;
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
      user: true,
    },
  });

  if (submission.status === "EVALUATED") {
    throw new Error("Submission already evaluated.");
  }

  const rawAnswers = submission.answers as unknown as SubmittedAnswer[];
  const questionIds = rawAnswers.map((a) => a.questionId).filter(Boolean) as string[];

  // 2. Fetch question data (if any use DB pointers)
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    include: { subtopic: true },
  });

  const questionMap = Object.fromEntries(questions.map((q) => [q.id, q]));
  const assignmentQuestions = submission.assignment.questions as any[];

  // 3. Evaluate each answer
  const evaluatedAnswers: EvaluatedAnswer[] = [];
  let totalScore = 0;
  const masteryUpdates: { subtopicId: string; isCorrect: boolean }[] = [];

  for (const answer of rawAnswers) {
    let content: any, type: string, id: string | undefined, maxMarks: number, subtopicId: string | null = null;

    if (answer.questionId && questionMap[answer.questionId]) {
      const q = questionMap[answer.questionId];
      content = q.content;
      type = q.type;
      id = q.id;
      maxMarks = (content as any).maxMarks || 1;
      subtopicId = q.subtopicId;
    } else {
      const inlineQ = assignmentQuestions[answer.questionIndex];
      if (!inlineQ) continue;

      content = {
         question: inlineQ.question,
         options: inlineQ.options,
         correctAnswer: inlineQ.correctAnswer,
         explanation: inlineQ.explanation || inlineQ.correctAnswer,
         maxMarks: inlineQ.marks || inlineQ.maxMarks || 1,
      };
      type = inlineQ.type;
      id = undefined;
      maxMarks = content.maxMarks;
    }

    let evaluated: EvaluatedAnswer;

    if (type === "MCQ" || type === "NUMERIC") {
      // Auto-grade
      const isCorrect =
        String(answer.userAnswer).trim().toLowerCase() ===
        String(content.correctAnswer).trim().toLowerCase();

      evaluated = {
        questionId: id,
        questionIndex: answer.questionIndex,
        userAnswer: answer.userAnswer,
        isCorrect,
        marksAwarded: isCorrect ? maxMarks : 0,
        maxMarks: maxMarks,
        feedback: isCorrect ? "Correct!" : "Incorrect.",
        correction: isCorrect ? "" : `Correct answer: ${content.correctAnswer}`,
        explanation: content.explanation,
      };
    } else {
      // AI evaluation for SHORT_ANSWER / LONG_ANSWER
      const aiResult = await evaluateSubjectiveAnswer({
        question: content.question,
        modelAnswer: content.correctAnswer,
        studentAnswer: String(answer.userAnswer ?? ""),
        maxMarks: maxMarks,
        grade: submission.assignment.subject.grade,
        subject: submission.assignment.subject.name,
      });

      evaluated = {
        questionId: id,
        questionIndex: answer.questionIndex,
        userAnswer: answer.userAnswer,
        ...aiResult,
        maxMarks: maxMarks,
      };
    }

    totalScore += evaluated.marksAwarded;
    evaluatedAnswers.push(evaluated);

    // Track for mastery update if it maps to a real subtopic
    if (subtopicId) {
      masteryUpdates.push({
        subtopicId: subtopicId,
        isCorrect: evaluated.isCorrect,
      });
    }
  }

  const maxMarks = submission.maxMarks;
  const percentageScore = maxMarks > 0 ? (totalScore / maxMarks) * 100 : 0;

  // 4. Generate overall AI feedback
  const overallFeedback = await generateOverallFeedback({
    subjectName: submission.assignment.subject.name,
    score: totalScore,
    maxMarks,
    percentageScore,
    evaluatedAnswers,
    totalQuestionCount: questionIds.length,
    grade: submission.assignment.subject.grade,
  });

  // 5. Update submission record
  await prisma.submission.update({
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

  // 6. Update UserMastery for each subtopic
  await updateMastery(submission.userId, masteryUpdates);

  // 7. Update LeaderboardEntry
  await updateLeaderboard(submission.userId, percentageScore);

  return {
    submissionId,
    totalScore,
    maxMarks,
    percentageScore: Math.round(percentageScore * 10) / 10,
    aiFeedback: overallFeedback,
    answers: evaluatedAnswers,
  };
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
}): Promise<AIEvalResult> {
  const { question, modelAnswer, studentAnswer, maxMarks, grade, subject } = params;

  let finalPrompt: any = `
You are a CBSE Class ${grade} ${subject} examiner. Evaluate this student's answer strictly but fairly.

Question: ${question}

Model Answer: ${modelAnswer}

Student's Answer: ${studentAnswer}

Max Marks: ${maxMarks}

Evaluate and return JSON:
{
  "isCorrect": boolean (true if student gets >50% marks),
  "marksAwarded": number (between 0 and ${maxMarks}, award partial marks for partial understanding),
  "feedback": "1-2 sentences: what the student did right and what was missing",
  "correction": "What the student should have written (if wrong or partial)",
  "explanation": "Brief conceptual explanation of the correct answer in simple language"
}

Marking guidelines:
- Award full marks if key points are all covered (exact wording not required)
- Award partial marks proportionally for partially correct answers
- Be strict: unsupported claims, wrong facts = 0 marks for that point
- Return ONLY the JSON object, no other text
`;

  // Multimodal prompt for drawings/graphs
  if (studentAnswer.startsWith("data:image/")) {
    const [header, base64] = studentAnswer.split(",");
    const mimeType = header.replace("data:", "").split(";")[0];
    
    finalPrompt = [
      `You are a CBSE Class ${grade} ${subject} examiner. Evaluate this student's DRAWING/GRAPH strictly but fairly based on the model answer.\n\nQuestion: ${question}\n\nModel Answer: ${modelAnswer}\n\nMax Marks: ${maxMarks}\n\nThe student's drawing is attached as an image. Evaluate it and return JSON exactly as requested:\n{ "isCorrect": boolean, "marksAwarded": number, "feedback": "string", "correction": "string", "explanation": "string" }\nReturn ONLY the JSON object.`,
      { inlineData: { data: base64, mimeType } }
    ];
  }

  return await callGemini<AIEvalResult>(geminiPro, finalPrompt, {
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

  const prompt = `
You are a supportive CBSE Class ${grade} ${subjectName} teacher.

Student scored ${score}/${maxMarks} (${percentageScore.toFixed(1)}%).
Out of ${totalQuestionCount} questions, they got ${correctCount} correct, ${wrongCount} wrong, and skipped ${skippedCount}.

Write a brief 2-3 sentence feedback paragraph that:
1. Acknowledges their score warmly
2. Highlights 1 strength (if any correct answers)
3. Gives 1 specific, actionable improvement tip

Tone: encouraging, direct, like a good teacher. No fluff.

Return JSON: { "feedback": "your feedback paragraph here" }
`;

  const result = await callGemini<{ feedback: string }>(
    geminiFlash,
    prompt,
    { feedback: `You scored ${score}/${maxMarks}. Review the incorrect answers and practice those topics again.` }
  );

  return result.feedback;
}

// ─────────────────────────────────────────────────────────
// Update UserMastery after evaluation
// ─────────────────────────────────────────────────────────

async function updateMastery(
  userId: string,
  updates: { subtopicId: string; isCorrect: boolean }[]
) {
  for (const { subtopicId, isCorrect } of updates) {
    await prisma.userMastery.upsert({
      where: { userId_subtopicId: { userId, subtopicId } },
      create: {
        userId,
        subtopicId,
        masteryScore: isCorrect ? 20 : 5,
        totalAttempts: 1,
        correctAttempts: isCorrect ? 1 : 0,
        consecutiveCorrect: isCorrect ? 1 : 0,
        lastPracticed: new Date(),
        difficultyCalibration: 1,
      },
      update: {
        totalAttempts: { increment: 1 },
        correctAttempts: { increment: isCorrect ? 1 : 0 },
        consecutiveCorrect: isCorrect ? { increment: 1 } : { set: 0 },
        masteryScore: isCorrect
          ? { increment: 5 }   // +5 for correct (capped at 100)
          : { decrement: 3 },  // -3 for wrong (min 0)
        lastPracticed: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}

// ─────────────────────────────────────────────────────────
// Update LeaderboardEntry after evaluation
// ─────────────────────────────────────────────────────────

async function updateLeaderboard(userId: string, percentageScore: number) {
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
        totalScore: percentageScore,
        submissionCount: 1,
      },
      update: {
        // Rolling average
        totalScore: {
          set: 0, // will be recalculated in background job; for now just store latest
        },
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
