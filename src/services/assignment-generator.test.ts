import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateAssignment, generateAssignmentAIContent } from "./assignment-generator";
import { prisma } from "@/lib/db";
import { callGemini, callGeminiStrict } from "@/lib/gemini";
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
      createManyAndReturn: vi.fn(),
    },
    assignment: {
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    schoolExamPattern: {
      findUnique: vi.fn(),
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
  callGeminiStrict: vi.fn(),
}));

vi.mock("@/lib/prisma-json", () => ({
  toJson: vi.fn((val) => val),
}));

vi.mock("@/prompts/question-generation", () => ({
  buildQuestionGenerationPrompt: vi.fn(() => "mock-prompt"),
}));

vi.mock("@/lib/cache", () => ({
  withCache: vi.fn(async (key, deps, fn) => {
    return { value: await fn(), fromCache: false };
  }),
}));

vi.mock("@/services/usage-tracker", () => ({
  trackCacheHit: vi.fn(async () => {}),
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

  it("incorporates school-specific patterns if student is linked to a school", async () => {
    (prisma.subject.findUniqueOrThrow as any).mockResolvedValue(mockSubject);
    (prisma.user.findUniqueOrThrow as any).mockResolvedValue({
      id: "user-1",
      schoolId: "school-123",
      grade: "9",
      board: "CBSE"
    });
    (prisma.userMastery.findMany as any).mockResolvedValue([]);
    (prisma.question.findMany as any).mockResolvedValue([]);
    (prisma.assignment.create as any).mockResolvedValue({ id: "asgn-1" });

    const mockPattern = {
      examType: "UNIT_TEST",
      blueprint: { totalMarks: 40 },
      aiPromptContext: "Highly conceptual"
    };
    (prisma.schoolExamPattern.findUnique as any).mockResolvedValue(mockPattern);

    const result = await generateAssignment(mockInput);

    expect(prisma.schoolExamPattern.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        schoolId_grade_subjectId_examType: {
          schoolId: "school-123",
          grade: "9",
          subjectId: "sub-1",
          examType: "UNIT_TEST"
        }
      }
    }));
    expect(result.aiPromptContext).toBe("Highly conceptual");
    expect(result.blueprint).toEqual({ totalMarks: 40 });
  });
});

describe("generateAssignmentAIContent", () => {
  const mockContext = {
    subjectName: "Math",
    grade: "9",
    chapterName: "Algebra",
    subtopics: "Linear Equations",
    difficulty: "MEDIUM" as DifficultyLevel,
    subtopicId: "st-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves AI generated questions to the assignment", async () => {
    // Mock the assignment fetch
    (prisma.assignment.findUniqueOrThrow as any).mockResolvedValue({
      id: "asgn-1",
      questions: [],
      maxMarks: 0,
    });

    // Mock AI response passing through callGemini
    const mockAIResponse = {
      title: "Test Assignment",
      questions: [
        {
          type: "MCQ",
          bloomLevel: "REMEMBER",
          difficulty: 3,
          content: { 
            question: "What is a valid length question for testing?", 
            options: ["A", "B", "C", "D"], 
            correctAnswer: "A", 
            explanation: "This is a valid length explanation.", 
            maxMarks: 5 
          },
        }
      ]
    };
    (callGeminiStrict as any).mockResolvedValue(mockAIResponse);

    // Mock DB question creation
    (prisma.question.createManyAndReturn as any).mockResolvedValue([
      { id: "q-1", content: mockAIResponse.questions[0].content }
    ]);
    (prisma.assignment.update as any).mockResolvedValue({});

    const result = await generateAssignmentAIContent("asgn-1", "user-1", 1, mockContext);

    expect(result.success).toBe(true);
    expect(prisma.question.createManyAndReturn).toHaveBeenCalled();
    expect(prisma.assignment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "asgn-1" },
      data: expect.objectContaining({ status: "READY" }),
    }));
  });

  it("falls back to question bank if AI generation fails", async () => {
    (prisma.assignment.findUniqueOrThrow as any).mockResolvedValue({
      id: "asgn-1",
      questions: [],
      maxMarks: 0,
    });

    // Force AI failure
    (callGeminiStrict as any).mockRejectedValue(new Error("AI Overloaded"));

    // Mock Bank fallback
    (prisma.question.findMany as any).mockResolvedValue([
      { id: "bank-q1", content: { maxMarks: 5 } }
    ]);
    (prisma.assignment.update as any).mockResolvedValue({});

    const result = await generateAssignmentAIContent("asgn-1", "user-1", 1, mockContext);

    expect(result.success).toBe(true);
    expect(result.fallbackUsed).toBe(true);
    expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ verifiedByHuman: true }),
    }));
    expect(prisma.assignment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "READY" }),
    }));
  });
});
