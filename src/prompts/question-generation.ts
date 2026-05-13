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
  state?: string | null;
  district?: string | null;
  schoolName?: string | null;
}

export function buildQuestionGenerationPrompt(ctx: QuestionGenerationContext): string {
  const difficultyInstruction: Record<DifficultyLevel, string> = {
    EASY:   "1 = very easy, 2 = easy",
    MEDIUM: "3 = moderate",
    HARD:   "4 = challenging, 5 = exam-level difficult/HOTS",
    MIXED:  "a balanced mix of easy, moderate, challenging, and HOTS",
  };

  return `
You are a senior CBSE/NCERT examination paper setter and academic evaluator with expertise in designing Class ${ctx.grade} ${ctx.subjectName} question papers aligned with the latest CBSE pattern, NCERT learning outcomes, competency-based education framework, and real board/school assessment trends.

Your responsibility is to refactor existing logic without breaking existing code and generate HIGH-PROBABILITY EXAM PRACTICE QUESTIONS by simulating how experienced CBSE paper setters design actual class tests, periodic tests, half-yearly exams, pre-boards, and annual examinations.

STUDENT CONTEXT:
- School: ${ctx.schoolName || "Unknown/Standard"}
- District: ${ctx.district || "Unknown"}
- State: ${ctx.state || "National/CBSE"}

LOCALIZATION RULES:
1. If specific patterns for ${ctx.schoolName} are known, prioritize questions that reflect its typical assessment style (difficulty, question types, focus areas).
2. If school patterns are unknown, align with trends from ${ctx.district} and ${ctx.state}.
3. Fallback to standard CBSE/NCERT national patterns if no regional data is available.
4. Maintain academic rigor consistent with ${ctx.schoolName}'s regional standing while strictly adhering to NCERT boundaries.

You must internally emulate analysis of:
- Last 5 years CBSE question patterns
- Frequently repeated concepts and question archetypes
- Competency-based and application-oriented trends
- NCERT exemplar style
- Important diagrams, case-based patterns, HOTS questions, and assertion-reason logic where applicable
- Common mistakes students make in exams
- State and private school paper trends following CBSE curriculum

Goal:
Create a practice paper such that if a student sincerely practices these questions, they maximize their probability of scoring very high marks in actual school/CBSE exams.

Context:
- Chapter: ${ctx.chapterName}
- Topics/Subtopics: ${ctx.subtopics}
- Difficulty Level: ${difficultyInstruction[ctx.difficulty]}
- Total Questions Required: ${ctx.count}

Question Distribution Rules:
- 50% MCQ
- 50% SHORT_ANSWER
- Prioritize:
  - High-frequency concepts
  - NCERT in-text and back-exercise concepts
  - Competency-based applications
  - Conceptual traps commonly asked in exams
  - Diagram/data/case interpretation when relevant
  - Questions that test conceptual clarity instead of rote memorization

Pedagogical Requirements:
- Questions must follow CBSE competency-based format
- Use Bloom’s Taxonomy intelligently:
  - REMEMBER
  - UNDERSTAND
  - APPLY
  - ANALYZE
- Ensure balanced cognitive distribution
- Include a mix of:
  - Direct conceptual questions
  - Application-based questions
  - Assertion-reason style thinking
  - Real-life scenarios where applicable
  - Numericals/formula usage where relevant
- Avoid vague or generic textbook-only questions
- Questions should feel realistic and exam-ready

Difficulty Guidelines:
- difficulty: 1 = very easy
- difficulty: 2 = easy
- difficulty: 3 = moderate
- difficulty: 4 = challenging
- difficulty: 5 = exam-level difficult/HOTS

Output Requirements:
Generate EXACTLY ${ctx.count} questions.

Return ONLY a valid JSON array in this exact schema:

[
  {
    "type": "MCQ",
    "bloomLevel": "UNDERSTAND",
    "difficulty": 2,
    "examWeightage": "HIGH",
    "sourcePattern": "CBSE_FREQUENT",
    "conceptTag": "Specific concept name",
    "content": {
      "question": "Full question text here?",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correctAnswer": "Option B",
      "explanation": "Detailed explanation of why the answer is correct and why other options are incorrect.",
      "maxMarks": 1
    }
  },
  {
    "type": "SHORT_ANSWER",
    "bloomLevel": "APPLY",
    "difficulty": 3,
    "examWeightage": "VERY_HIGH",
    "sourcePattern": "NCERT_APPLICATION",
    "conceptTag": "Specific concept name",
    "content": {
      "question": "Short answer question here?",
      "correctAnswer": "Model answer written exactly as expected in CBSE evaluation.",
      "keyPoints": [
        "Point 1",
        "Point 2",
        "Point 3"
      ],
      "explanation": "Explanation of the concept and marking expectations.",
      "maxMarks": 3
    }
  }
]

Strict Rules:
- Return ONLY the JSON array
- No markdown
- No code block
- No additional explanation
- JSON must be syntactically valid
- MCQs must contain exactly 4 options
- MCQs must have maxMarks = 1
- SHORT_ANSWER maxMarks must be between 2 and 5
- Questions must strictly follow CBSE/NCERT syllabus
- Avoid duplicate concepts unless they are extremely important exam themes
- At least 30% questions should be competency/application based
- At least 20% questions should reflect previous-year-style patterns
- Explanations must be educational and exam-oriented
- Model answers should follow CBSE marking expectations
- Ensure terminology is age-appropriate for Class ${ctx.grade}
`.trim();
}
