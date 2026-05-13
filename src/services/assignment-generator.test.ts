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
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
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

  it("generates an assignment skeleton primarily from the question bank", async () => {
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

    // Mock user fetch (location)
    (prisma.user.findUniqueOrThrow as any).mockResolvedValue({
      state: "Karnataka",
      district: "Bengaluru",
      school: "Vydehi School",
    });

    // Mock assignment creation
    (prisma.assignment.create as any).mockResolvedValue({
      id: "asgn-1",
      title: "Mathematics Number Systems Test — Medium",
      ...mockInput,
      subject: mockSubject,
    });

    const result = await generateAssignment(mockInput);

    expect(result.assignment.id).toBe("asgn-1");
    expect(result.aiQCount).toBeGreaterThan(0);
    expect(prisma.question.findMany).toHaveBeenCalled();
    // AI generation and transaction should NOT happen in the skeleton phase
    expect(callGemini).not.toHaveBeenCalled();
  });

  it("throws error if no subtopics are found in scope", async () => {
    (prisma.subject.findUniqueOrThrow as any).mockResolvedValue({
      ...mockSubject,
      chapters: [],
    });
    (prisma.user.findUniqueOrThrow as any).mockResolvedValue({
      state: "Karnataka",
    });

    await expect(generateAssignment({ ...mockInput, type: "FULL_SYLLABUS", chapterId: undefined })).rejects.toThrow("No subtopics found for the given scope.");
  });
});
