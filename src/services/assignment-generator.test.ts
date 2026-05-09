import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateAssignment } from "./assignment-generator";
import { prisma } from "@/lib/db";
import { callGemini } from "@/lib/gemini";
import { DifficultyLevel, AssignmentType } from "@prisma/client";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    subject: {
      findUniqueOrThrow: vi.fn(),
    },
    userMastery: {
      findMany: vi.fn(),
    },
    question: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    assignment: {
      create: vi.fn(),
    },
    $transaction: vi.fn((ops) => Promise.all(ops)),
  },
}));

vi.mock("@/lib/gemini", () => ({
  geminiFlashModels: [],
  callGemini: vi.fn(),
}));

vi.mock("@/lib/prisma-json", () => ({
  toJson: vi.fn((val) => val),
}));

vi.mock("@/prompts/question-generation", () => ({
  buildQuestionGenerationPrompt: vi.fn(() => "mock-prompt"),
}));

describe("assignment-generator", () => {
  const mockInput = {
    userId: "user-1",
    subjectId: "sub-1",
    type: "CHAPTER" as AssignmentType,
    difficulty: "MEDIUM" as DifficultyLevel,
    chapterId: "ch-1",
    questionCount: 5,
  };

  const mockSubject = {
    id: "sub-1",
    name: "Mathematics",
    grade: "9",
    board: "CBSE",
    chapters: [
      {
        id: "ch-1",
        name: "Number Systems",
        topics: [
          {
            id: "t-1",
            name: "Rational Numbers",
            subtopics: [
              { id: "st-1", name: "Introduction to Rational Numbers" },
              { id: "st-2", name: "Operations on Rational Numbers" },
            ],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates an assignment primarily from the question bank", async () => {
    // Mock subject fetch
    (prisma.subject.findUniqueOrThrow as any).mockResolvedValue(mockSubject);
    
    // Mock mastery (st-1 has low mastery, st-2 has high)
    (prisma.userMastery.findMany as any).mockResolvedValue([
      { subtopicId: "st-1", masteryScore: 20 },
      { subtopicId: "st-2", masteryScore: 80 },
    ]);

    // Mock existing questions (4 questions in bank)
    const mockBankQuestions = [
      { id: "q1", content: { maxMarks: 5 } },
      { id: "q2", content: { maxMarks: 5 } },
      { id: "q3", content: { maxMarks: 5 } },
      { id: "q4", content: { maxMarks: 5 } },
    ];
    (prisma.question.findMany as any).mockResolvedValue(mockBankQuestions);

    // Mock AI generation (for the 1 remaining question: 5 - floor(4 * 0.7) = 5 - 2 = 3)
    // Wait, the logic is: bankQCount = min(4, floor(5 * 0.7) = 3) = 3.
    // aiQCount = 5 - 3 = 2.
    (callGemini as any).mockResolvedValue([
      {
        type: "MCQ",
        bloomLevel: "UNDERSTAND",
        difficulty: 3,
        content: { question: "AI Q1", correctAnswer: "A", explanation: "...", maxMarks: 5 },
      },
      {
        type: "SHORT_ANSWER",
        bloomLevel: "APPLY",
        difficulty: 3,
        content: { question: "AI Q2", correctAnswer: "...", explanation: "...", maxMarks: 5 },
      },
    ]);

    // Mock question creation in transaction
    (prisma.question.create as any).mockImplementation(({ data }: any) => ({
      id: `ai-${data.content.question}`,
      ...data,
    }));

    // Mock assignment creation
    (prisma.assignment.create as any).mockResolvedValue({
      id: "asgn-1",
      title: "Mathematics Number Systems Test — Medium",
      ...mockInput,
    });

    const result = await generateAssignment(mockInput);

    expect(result.assignment.id).toBe("asgn-1");
    expect(result.questionList.length).toBe(5);
    expect(prisma.question.findMany).toHaveBeenCalled();
    expect(callGemini).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("throws error if no subtopics are found in scope", async () => {
    (prisma.subject.findUniqueOrThrow as any).mockResolvedValue({
      ...mockSubject,
      chapters: [],
    });

    await expect(generateAssignment(mockInput)).rejects.toThrow("No subtopics found for the given scope.");
  });

  it("throws error if AI generation fails and questions are needed", async () => {
    (prisma.subject.findUniqueOrThrow as any).mockResolvedValue(mockSubject);
    (prisma.userMastery.findMany as any).mockResolvedValue([]);
    (prisma.question.findMany as any).mockResolvedValue([]); // Empty bank, need 5 AI questions
    (callGemini as any).mockResolvedValue([]); // AI fails

    await expect(generateAssignment(mockInput)).rejects.toThrow("AI failed to generate questions. Please try again.");
  });
});
