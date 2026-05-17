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
  strategy?: "STANDARD" | "EXAM_EXCELLENCE" | "COMPETENCY_FOCUS";
  state?: string | null;
  district?: string | null;
  schoolName?: string | null;
  aiPromptContext?: string | null;
  blueprint?: any;
}

function buildSubjectSpecificInstructions(subjectName: string): string {
  const name = subjectName.toUpperCase();
  if (name.includes("MATH")) {
    return `
SUBJECT-SPECIFIC QUALITY GUIDELINES (MATHEMATICS):
- Ensure all algebraic expressions, proofs, theorems, and equations are rendered in flawless LaTeX.
- Focus on logical step-by-step derivations.
- Question styles must include algebraic identity factorizations, geometric proofs (stating given/to-prove), and numerical calculation drills.
- Model answers must list standard algebraic or geometric steps, including formulas used.
`;
  }
  if (name.includes("SCIENCE") || name.includes("PHYSICS") || name.includes("CHEMISTRY") || name.includes("BIOLOGY")) {
    return `
SUBJECT-SPECIFIC QUALITY GUIDELINES (SCIENCE):
- Focus heavily on conceptual clarity, physical laws, and experimental setups.
- Chemistry questions must render balanced chemical equations properly using LaTeX or subscripts.
- Physics questions must have realistic numerical values with standard SI units (e.g. m/s^2, Joules, Newtons).
- Include assertion-reason type questions and experimental labeling/observation questions.
`;
  }
  if (name.includes("SOCIAL") || name.includes("HISTORY") || name.includes("CIVICS") || name.includes("GEOGRAPHY") || name.includes("POLITICAL") || name.includes("ECONOMICS") || name.includes("SST")) {
    return `
SUBJECT-SPECIFIC QUALITY GUIDELINES (SOCIAL SCIENCE):
- Focus on chronological understanding, historical events, cause-and-effect relationships, and constitutional principles.
- Use primary source snippets, case scenarios, or current contextual examples.
- Incorporate map-based reference questions and multi-factor analytical long answers.
`;
  }
  if (name.includes("ENGLISH") || name.includes("LANG") || name.includes("LIT")) {
    return `
SUBJECT-SPECIFIC QUALITY GUIDELINES (ENGLISH):
- Focus on reading comprehension, context-based vocabulary, grammar correction (active/passive, reported speech), and structured writing templates.
- Lit questions must reference standard CBSE prose/poetry syllabus and extract-based short answer prompts.
`;
  }
  return "";
}

export function buildQuestionGenerationPrompt(ctx: QuestionGenerationContext): string {
  const difficultyInstruction: Record<DifficultyLevel, string> = {
    EASY:   "1 = very easy, 2 = easy",
    MEDIUM: "3 = moderate",
    HARD:   "4 = challenging, 5 = exam-level difficult/HOTS",
    MIXED:  "a balanced mix of easy, moderate, challenging, and HOTS",
  };

  const schoolSpecificDirective = ctx.aiPromptContext 
    ? `\nSCHOOL-SPECIFIC STYLE (HIGH PRIORITY):\n${ctx.aiPromptContext}\n`
    : "";

  const blueprintDirective = ctx.blueprint
    ? `\nEXAM BLUEPRINT (STRICT ADHERENCE):\n${JSON.stringify(ctx.blueprint)}\nGenerate questions that exactly fill the required slots for the "ai_generated" portion of this blueprint.\n`
    : "";

  const subjectSpecificDirective = buildSubjectSpecificInstructions(ctx.subjectName);

  const strategyDirective = ctx.strategy === "EXAM_EXCELLENCE" 
    ? `
STRATEGIC SOURCE DISTRIBUTION (MANDATORY):
- 35% NCERT DIRECT: Core textbook concepts, in-text examples, and back-exercise patterns.
- 40% RD SHARMA / RS AGGARWAL STYLE: Standard drill patterns, frequently repeated numericals, and multi-step computational problems typical of private school assessments.
- 15% COMPETENCY-BASED (CBSE): Contextual application, assertion-reason, and case-study snippets.
- 10% HOTS (Higher Order Thinking Skills): Challenging but strictly within NCERT syllabus boundaries.
` 
    : "Maintain a balanced distribution of NCERT and CBSE pattern questions.";

  return `
You are a senior CBSE/NCERT examination paper setter. Your goal is to generate HIGH-PROBABILITY EXAM PRACTICE QUESTIONS.

CORE STRATEGY:
${strategyDirective}
${schoolSpecificDirective}
${blueprintDirective}
${subjectSpecificDirective}

STRICT QUALITY GUARDRAILS (ZERO TOLERANCE):
- AVOID "overly creative" or unrealistic scenarios (e.g., "A dragon calculates the volume...").
- AVOID Olympiad-level or competitive-exam complexity that exceeds CBSE Class ${ctx.grade} requirements.
- AVOID vague wording or non-standard notation.
- AVOID repetitive numericals with only minor value changes.
- AVOID non-CBSE patterns or ambiguous MCQs where multiple options could be "technically" correct.
- Ensure all terminology is 100% aligned with the latest NCERT textbooks.
- MATHEMATICAL NOTATION (STRICT): You MUST use LaTeX for all math. 
  - Wrap inline math in \\( ... \\) e.g. \\( \sqrt{x^2 + y^2} \\).
  - Wrap block math in \\[ ... \\] e.g. \\[ E = mc^2 \\].
  - NEVER use plain text like "sqrt(x)" or "2^3". Always use proper LaTeX commands.
  - For fractions, use \\frac{a}{b}. For roots, use \\sqrt{x}.

STUDENT CONTEXT:
- School: ${ctx.schoolName || "Unknown/Standard"}
- State: ${ctx.state || "National/CBSE"}

CHAPTER: ${ctx.chapterName}
TOPICS: ${ctx.subtopics}
DIFFICULTY: ${difficultyInstruction[ctx.difficulty]}
TOTAL QUESTIONS: ${ctx.count}

OUTPUT REQUIREMENTS:
- Return ONLY a valid JSON object with the following structure:
  {
    "title": "A short, descriptive title for this assignment",
    "questions": [
      {
        "type": "MCQ" | "SHORT_ANSWER" | "LONG_ANSWER" | "NUMERIC" | "MATCHING",
        "bloomLevel": "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE",
        "difficulty": number (1 to 5),
        "conceptTag": "string",
        "content": {
          "question": "string (the actual question text)",
          "options": ["string"] (REQUIRED ONLY if type is MCQ, exactly 4 options),
          "correctAnswer": "string" (MANDATORY for ALL types),
          "explanation": "string" (MANDATORY for ALL types),
          "maxMarks": number,
          "keyPoints": ["string"] (REQUIRED for SHORT_ANSWER and LONG_ANSWER for marking)
        }
      }
    ]
  }
- JSON ENCODING (CRITICAL): Ensure all backslashes in LaTeX formulas are PROPERLY ESCAPED for JSON (e.g., use \\\\sqrt{x} instead of \sqrt{x} if necessary).
- NEVER use any \`type\` or \`bloomLevel\` other than the exact strings listed above.
- NEVER omit \`correctAnswer\` or \`explanation\`. They are strictly required for every single question.
`.trim();
}
