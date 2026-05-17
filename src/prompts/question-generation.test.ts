import { describe, it, expect } from "vitest";
import { buildQuestionGenerationPrompt } from "./question-generation";

const baseCtx = {
  subjectName: "English",
  grade: "10",
  chapterName: "The Road Not Taken",
  subtopics: "Poetry, Theme, Symbolism",
  difficulty: "MEDIUM" as const,
  count: 5,
};

describe("buildQuestionGenerationPrompt", () => {
  describe("subject-specific instructions", () => {
    it("injects MATHEMATICS guidelines for a math subject", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, subjectName: "Mathematics" });
      expect(prompt).toContain("SUBJECT-SPECIFIC QUALITY GUIDELINES (MATHEMATICS)");
      expect(prompt).toContain("LaTeX");
    });

    it("injects MATHEMATICS guidelines for 'Math' (case-insensitive)", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, subjectName: "math" });
      expect(prompt).toContain("SUBJECT-SPECIFIC QUALITY GUIDELINES (MATHEMATICS)");
    });

    it("injects SCIENCE guidelines for Physics", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, subjectName: "Physics" });
      expect(prompt).toContain("SUBJECT-SPECIFIC QUALITY GUIDELINES (SCIENCE)");
      expect(prompt).toContain("SI units");
    });

    it("injects SCIENCE guidelines for Chemistry", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, subjectName: "Chemistry" });
      expect(prompt).toContain("SUBJECT-SPECIFIC QUALITY GUIDELINES (SCIENCE)");
    });

    it("injects SCIENCE guidelines for Biology", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, subjectName: "Biology" });
      expect(prompt).toContain("SUBJECT-SPECIFIC QUALITY GUIDELINES (SCIENCE)");
    });

    it("injects SCIENCE guidelines for 'Science'", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, subjectName: "Science" });
      expect(prompt).toContain("SUBJECT-SPECIFIC QUALITY GUIDELINES (SCIENCE)");
    });

    it("injects SOCIAL SCIENCE guidelines for History", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, subjectName: "History" });
      expect(prompt).toContain("SUBJECT-SPECIFIC QUALITY GUIDELINES (SOCIAL SCIENCE)");
    });

    it("injects SOCIAL SCIENCE guidelines for Geography", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, subjectName: "Geography" });
      expect(prompt).toContain("SUBJECT-SPECIFIC QUALITY GUIDELINES (SOCIAL SCIENCE)");
    });

    it("injects SOCIAL SCIENCE guidelines for SST", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, subjectName: "SST" });
      expect(prompt).toContain("SUBJECT-SPECIFIC QUALITY GUIDELINES (SOCIAL SCIENCE)");
    });

    it("injects ENGLISH guidelines for English", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, subjectName: "English" });
      expect(prompt).toContain("SUBJECT-SPECIFIC QUALITY GUIDELINES (ENGLISH)");
    });

    it("injects ENGLISH guidelines for Literature", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, subjectName: "Literature" });
      expect(prompt).toContain("SUBJECT-SPECIFIC QUALITY GUIDELINES (ENGLISH)");
    });

    it("injects no subject-specific block for unknown subjects", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, subjectName: "Physical Education" });
      expect(prompt).not.toContain("SUBJECT-SPECIFIC QUALITY GUIDELINES");
    });
  });

  describe("difficulty levels", () => {
    it("uses EASY instruction for EASY difficulty", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, difficulty: "EASY" });
      expect(prompt).toContain("1 = very easy, 2 = easy");
    });

    it("uses MEDIUM instruction for MEDIUM difficulty", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, difficulty: "MEDIUM" });
      expect(prompt).toContain("3 = moderate");
    });

    it("uses HARD instruction for HARD difficulty", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, difficulty: "HARD" });
      expect(prompt).toContain("4 = challenging, 5 = exam-level difficult/HOTS");
    });

    it("uses MIXED instruction for MIXED difficulty", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, difficulty: "MIXED" });
      expect(prompt).toContain("a balanced mix of easy, moderate, challenging, and HOTS");
    });
  });

  describe("optional context fields", () => {
    it("includes school-specific directive when aiPromptContext is set", () => {
      const prompt = buildQuestionGenerationPrompt({
        ...baseCtx,
        aiPromptContext: "Focus on competitive exam patterns.",
      });
      expect(prompt).toContain("SCHOOL-SPECIFIC STYLE (HIGH PRIORITY)");
      expect(prompt).toContain("Focus on competitive exam patterns.");
    });

    it("omits school-specific directive when aiPromptContext is null", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, aiPromptContext: null });
      expect(prompt).not.toContain("SCHOOL-SPECIFIC STYLE");
    });

    it("includes blueprint directive when blueprint is set", () => {
      const bp = { mcq: 5, short: 3 };
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, blueprint: bp });
      expect(prompt).toContain("EXAM BLUEPRINT (STRICT ADHERENCE)");
      expect(prompt).toContain(JSON.stringify(bp));
    });

    it("omits blueprint directive when blueprint is undefined", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx });
      expect(prompt).not.toContain("EXAM BLUEPRINT");
    });

    it("includes EXAM_EXCELLENCE strategy directive", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, strategy: "EXAM_EXCELLENCE" });
      expect(prompt).toContain("STRATEGIC SOURCE DISTRIBUTION (MANDATORY)");
      expect(prompt).toContain("RD SHARMA");
    });

    it("uses balanced distribution for STANDARD strategy", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx, strategy: "STANDARD" });
      expect(prompt).toContain("balanced distribution of NCERT and CBSE");
    });

    it("uses balanced distribution when strategy is omitted", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx });
      expect(prompt).toContain("balanced distribution of NCERT and CBSE");
    });

    it("interpolates state and school into prompt", () => {
      const prompt = buildQuestionGenerationPrompt({
        ...baseCtx,
        state: "Odisha",
        schoolName: "DPS Bhubaneswar",
      });
      expect(prompt).toContain("Odisha");
      expect(prompt).toContain("DPS Bhubaneswar");
    });

    it("falls back to Unknown/Standard when schoolName is absent", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx });
      expect(prompt).toContain("Unknown/Standard");
    });
  });

  describe("output structure requirements", () => {
    it("contains required JSON output format specification", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx });
      expect(prompt).toContain("TOTAL QUESTIONS: 5");
      expect(prompt).toContain("CHAPTER: The Road Not Taken");
      expect(prompt).toContain("TOPICS: Poetry, Theme, Symbolism");
    });

    it("mandates correctAnswer and explanation in output", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx });
      expect(prompt).toContain("correctAnswer");
      expect(prompt).toContain("explanation");
    });

    it("mandates LaTeX notation rules", () => {
      const prompt = buildQuestionGenerationPrompt({ ...baseCtx });
      expect(prompt).toContain("MATHEMATICAL NOTATION (STRICT)");
    });
  });
});
