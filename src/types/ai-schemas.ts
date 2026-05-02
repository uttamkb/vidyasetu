/**
 * ai-schemas.ts — Zod schemas for validating Gemini AI outputs
 *
 * Every AI response MUST be validated against a Zod schema before use.
 * `callGemini()` accepts an optional `schema` parameter for this purpose.
 *
 * Usage:
 *   const result = await callGemini(geminiFlash, prompt, [], AIAssignmentOutputSchema);
 */
import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Question Generation
// ─────────────────────────────────────────────────────────────

export const AIQuestionContentSchema = z.object({
  question: z.string().min(10, "Question text too short"),
  options: z.array(z.string()).min(2).max(5).optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(5),
  maxMarks: z.number().int().min(1).max(10),
});

export const AIQuestionSchema = z.object({
  type: z.enum(["MCQ", "SHORT_ANSWER", "NUMERIC"]),
  bloomLevel: z.enum(["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE"]),
  difficulty: z.number().int().min(1).max(5),
  content: AIQuestionContentSchema,
});

export const AIAssignmentOutputSchema = z.array(AIQuestionSchema).min(1);

export type AIQuestion = z.infer<typeof AIQuestionSchema>;
export type AIAssignmentOutput = z.infer<typeof AIAssignmentOutputSchema>;

// ─────────────────────────────────────────────────────────────
// Evaluation
// ─────────────────────────────────────────────────────────────

export const AIAnswerEvaluationSchema = z.object({
  questionId: z.string(),
  marksAwarded: z.number().min(0),
  isCorrect: z.boolean(),
  aiFeedback: z.string().optional(),
  correction: z.string().optional(),
  explanation: z.string().optional(),
});

export const AIEvaluationResultSchema = z.object({
  totalScore: z.number().int().min(0),
  maxScore: z.number().int().min(1),
  aiFeedback: z.string().min(1),
  answers: z.array(AIAnswerEvaluationSchema),
});

export type AIEvaluationResult = z.infer<typeof AIEvaluationResultSchema>;

// ─────────────────────────────────────────────────────────────
// Diagnostic Assessment
// ─────────────────────────────────────────────────────────────

export const AIDiagnosticQuestionSchema = z.object({
  subtopicId: z.string(),
  subtopicName: z.string(),
  type: z.enum(["MCQ", "SHORT_ANSWER"]),
  content: AIQuestionContentSchema,
  bloomLevel: z.enum(["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE"]),
  difficulty: z.number().int().min(1).max(5),
});

export const AIDiagnosticOutputSchema = z.array(AIDiagnosticQuestionSchema).min(1);

export type AIDiagnosticQuestion = z.infer<typeof AIDiagnosticQuestionSchema>;

// ─────────────────────────────────────────────────────────────
// Content Curation
// ─────────────────────────────────────────────────────────────

export const AISampleQuestionSchema = z.object({
  question: z.string(),
  answer: z.string(),
  type: z.enum(["MCQ", "SHORT_ANSWER"]),
});

export const AIContentPackSchema = z.object({
  topicSummary: z.string().min(50),
  keyPoints: z.array(z.string()).min(3).max(10),
  commonMistakes: z.array(z.string()).min(1).max(5),
  sampleQuestions: z.array(AISampleQuestionSchema).min(1).max(5),
  studyTips: z.array(z.string()).min(1).max(5),
});

export type AIContentPack = z.infer<typeof AIContentPackSchema>;

// ─────────────────────────────────────────────────────────────
// Recommendations
// ─────────────────────────────────────────────────────────────

export const AIRecommendationSchema = z.object({
  subtopicId: z.string(),
  reason: z.string(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  suggestedAction: z.enum(["REVIEW", "PRACTICE", "MASTER"]),
});

export const AIRecommendationsOutputSchema = z.object({
  recommendations: z.array(AIRecommendationSchema).min(1).max(10),
  studyPlan: z.string().min(20),
});

export type AIRecommendationsOutput = z.infer<typeof AIRecommendationsOutputSchema>;
