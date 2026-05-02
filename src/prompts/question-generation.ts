/**
 * question-generation.ts — Prompt builder for AI question generation
 *
 * Pure function: takes typed context, returns a prompt string.
 * No AI calls, no DB access — easily testable in isolation.
 */
import { DifficultyLevel } from "@prisma/client";

export interface QuestionGenerationContext {
  subjectName: string;
  grade: string;
  chapterName: string;
  subtopics: string;
  difficulty: DifficultyLevel;
  count: number;
}

export function buildQuestionGenerationPrompt(ctx: QuestionGenerationContext): string {
  const difficultyInstruction: Record<DifficultyLevel, string> = {
    EASY:   "straightforward recall and understanding",
    MEDIUM: "application of concepts with moderate complexity",
    HARD:   "analysis, inference, and multi-step problem solving",
    MIXED:  "a mix of easy, medium, and hard levels",
  };

  return `
You are a CBSE Class ${ctx.grade} ${ctx.subjectName} teacher creating exam questions.

Chapter: ${ctx.chapterName}
Topics: ${ctx.subtopics}
Difficulty: ${difficultyInstruction[ctx.difficulty]}

Generate exactly ${ctx.count} questions. Mix of MCQ (50%) and SHORT_ANSWER (50%).

Return a JSON array of questions in this exact format:
[
  {
    "type": "MCQ",
    "bloomLevel": "UNDERSTAND",
    "difficulty": 2,
    "content": {
      "question": "Full question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option B",
      "explanation": "Explanation of why B is correct and others are wrong.",
      "maxMarks": 1
    }
  },
  {
    "type": "SHORT_ANSWER",
    "bloomLevel": "APPLY",
    "difficulty": 3,
    "content": {
      "question": "Short answer question here?",
      "correctAnswer": "Model answer with key points",
      "explanation": "Why this is the correct answer",
      "maxMarks": 3
    }
  }
]

Rules:
- Questions must be curriculum-accurate and follow CBSE marking scheme
- MCQ options must have exactly 4 choices
- SHORT_ANSWER maxMarks should be 2-5
- MCQ maxMarks should be 1
- difficulty: 1=easiest, 5=hardest
- bloomLevel: REMEMBER | UNDERSTAND | APPLY | ANALYZE
- Return ONLY the JSON array, no other text
`.trim();
}
