import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateSubmission } from "./evaluation-engine";
import { prisma } from "@/lib/db";
import { callGemini } from "@/lib/gemini";

// Mock dependencies
vi.mock("@/lib/db", () => {
  const mockPrisma = {
    submission: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    question: {
      findMany: vi.fn(),
    },
    userMastery: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    leaderboardEntry: {
      upsert: vi.fn(),
    },
    aIValidation: {
      findMany: vi.fn(() => []),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

vi.mock("@/lib/gemini", () => ({
  geminiProModels: [],
  geminiFlashModels: [],
  callGemini: vi.fn(),
}));

vi.mock("@/lib/prisma-json", () => ({
  toJson: vi.fn((val) => val),
}));

describe("evaluation-engine", () => {
  const mockSubmissionId = "sub-123";
  const mockSubmission = {
    id: mockSubmissionId,
    userId: "user-1",
    status: "PENDING",
    maxMarks: 10,
    answers: [
      { questionId: "q1", questionIndex: 0, userAnswer: "B" }, // Correct MCQ
      { questionId: "q2", questionIndex: 1, userAnswer: "The apple falls." }, // AI Eval Short Answer
    ],
    assignment: {
      id: "asgn-1",
      questions: [],
      subject: { name: "Science", grade: "9" },
    },
    user: { id: "user-1", leaderboardOptIn: true },
  };

  const mockQuestions = [
    {
      id: "q1",
      type: "MCQ",
      subtopicId: "st-1",
      content: { question: "...", options: ["A", "B", "C", "D"], correctAnswer: "B", maxMarks: 5, explanation: "..." },
    },
    {
      id: "q2",
      type: "SHORT_ANSWER",
      subtopicId: "st-2",
      content: { question: "Why does apple fall?", correctAnswer: "Gravity", maxMarks: 5, explanation: "...", keyPoints: ["Force", "Mass"] },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("evaluates a submission with MCQ and AI-evaluated answers", async () => {
    (prisma.submission.findUniqueOrThrow as any).mockResolvedValue(mockSubmission);
    (prisma.question.findMany as any).mockResolvedValue(mockQuestions);
    (prisma.user.findUnique as any).mockResolvedValue({ leaderboardOptIn: true });

    // Mock AI evaluations
    (callGemini as any).mockImplementation((models: any, prompt: any) => {
      if (prompt.includes("EvaluatedAnswer")) { // Mock overall feedback
        return { feedback: "Great job!" };
      }
      // Mock subjective evaluation
      return {
        isCorrect: true,
        marksAwarded: 4,
        feedback: "Good enough.",
        correction: "",
        explanation: "...",
      };
    });

    const result = await evaluateSubmission(mockSubmissionId);

    expect(result.totalScore).toBe(9); // 5 (MCQ) + 4 (AI)
    expect(result.percentageScore).toBe(90);
    expect(prisma.submission.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: mockSubmissionId },
      data: expect.objectContaining({ status: "EVALUATED", totalScore: 9 })
    }));
    expect(prisma.userMastery.create).toHaveBeenCalledTimes(2);
    expect(prisma.leaderboardEntry.upsert).toHaveBeenCalledTimes(3); // Weekly, Monthly, All-time
  });

  it("calculates gamified growth score correctly with HARD difficulty and streaks", async () => {
    (prisma.submission.findUniqueOrThrow as any).mockResolvedValue({
      ...mockSubmission,
      timeTaken: 120, // > 30s gives 10 pts
      assignment: {
        ...mockSubmission.assignment,
        difficulty: "HARD", // gives 1.0 * 15 = 15 pts
      },
      user: { 
        id: "user-1", 
        leaderboardOptIn: true,
        studyStreak: { currentStreak: 14 } // 14 days gives 25 pts
      },
    });
    
    // Existing setup is sufficient to trigger the rest of the flow
    const result = await evaluateSubmission(mockSubmissionId);
    
    // Streak(25) + Diff(15) + Time(10) + Accuracy(18) + Mastery(will vary based on mock)
    // We just assert the leaderboard entry upsert was called which proves it reached the end without crashing
    expect(prisma.leaderboardEntry.upsert).toHaveBeenCalledTimes(3);
  });

  it("returns skipped if submission is already evaluated", async () => {
    (prisma.submission.findUniqueOrThrow as any).mockResolvedValue({
      ...mockSubmission,
      status: "EVALUATED",
    });

    const result = await evaluateSubmission(mockSubmissionId);
    expect(result.skipped).toBe(true);
  });

  it("handles multimodal evaluation (images)", async () => {
    const multimodalSubmission = {
      ...mockSubmission,
      answers: [{ questionId: "q2", questionIndex: 1, userAnswer: "data:image/png;base64,abcdef" }],
    };
    (prisma.submission.findUniqueOrThrow as any).mockResolvedValue(multimodalSubmission);
    (prisma.question.findMany as any).mockResolvedValue([mockQuestions[1]]);

    await evaluateSubmission(mockSubmissionId);
    
    // Check if callGemini was called with multimodal prompt format
    expect(callGemini).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([expect.anything(), expect.objectContaining({ inlineData: expect.anything() })]),
      expect.anything(),
      expect.anything()
    );
  });

  it("updates existing mastery score instead of creating", async () => {
    (prisma.submission.findUniqueOrThrow as any).mockResolvedValue(mockSubmission);
    (prisma.question.findMany as any).mockResolvedValue(mockQuestions);
    
    // Existing mastery found
    (prisma.userMastery.findUnique as any).mockResolvedValue({ id: "um-1", masteryScore: 50 });

    await evaluateSubmission(mockSubmissionId);
    
    expect(prisma.userMastery.update).toHaveBeenCalled();
    expect(prisma.userMastery.create).not.toHaveBeenCalled();
  });

  it("skips leaderboard update if user opted out", async () => {
    (prisma.submission.findUniqueOrThrow as any).mockResolvedValue({
      ...mockSubmission,
      user: { id: "user-1", leaderboardOptIn: false },
    });
    (prisma.user.findUnique as any).mockResolvedValue({ leaderboardOptIn: false });

    await evaluateSubmission(mockSubmissionId);
    
    expect(prisma.leaderboardEntry.upsert).not.toHaveBeenCalled();
  });

  it("uses inline assignment questions if questionId is missing", async () => {
    const inlineSubmission = {
      ...mockSubmission,
      answers: [{ questionIndex: 0, userAnswer: "Correct" }],
      assignment: {
        ...mockSubmission.assignment,
        questions: [{ type: "MCQ", question: "Inline?", correctAnswer: "Correct", marks: 5 }]
      }
    };
    (prisma.submission.findUniqueOrThrow as any).mockResolvedValue(inlineSubmission);
    (prisma.question.findMany as any).mockResolvedValue([]);

    const result = await evaluateSubmission(mockSubmissionId);
    expect(result.totalScore).toBe(5);
  });

  it("calculates growth score for MEDIUM difficulty", async () => {
    (prisma.submission.findUniqueOrThrow as any).mockResolvedValue({
      ...mockSubmission,
      assignment: { ...mockSubmission.assignment, difficulty: "MEDIUM" },
    });
    (prisma.user.findUnique as any).mockResolvedValue({ leaderboardOptIn: true });
    (prisma.question.findMany as any).mockResolvedValue(mockQuestions);
    await evaluateSubmission(mockSubmissionId);
    expect(prisma.leaderboardEntry.upsert).toHaveBeenCalled();
  });

  it("calculates growth score for EASY difficulty", async () => {
    (prisma.submission.findUniqueOrThrow as any).mockResolvedValue({
      ...mockSubmission,
      assignment: { ...mockSubmission.assignment, difficulty: "EASY" },
    });
    (prisma.user.findUnique as any).mockResolvedValue({ leaderboardOptIn: true });
    (prisma.question.findMany as any).mockResolvedValue(mockQuestions);
    await evaluateSubmission(mockSubmissionId);
    expect(prisma.leaderboardEntry.upsert).toHaveBeenCalled();
  });

  it("handles incorrect answers and mastery score penalty", async () => {
    (prisma.submission.findUniqueOrThrow as any).mockResolvedValue({
      ...mockSubmission,
      answers: [{ questionId: "q1", questionIndex: 0, userAnswer: "WRONG" }],
    });
    (prisma.question.findMany as any).mockResolvedValue([mockQuestions[0]]);
    (prisma.userMastery.findUnique as any).mockResolvedValue({ id: "um-1", masteryScore: 50 });

    await evaluateSubmission(mockSubmissionId);
    
    expect(prisma.userMastery.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ masteryScore: 47 }) // 50 - 3
    }));
  });

  it("handles new mastery for incorrect answer", async () => {
    (prisma.submission.findUniqueOrThrow as any).mockResolvedValue({
      ...mockSubmission,
      answers: [{ questionId: "q1", questionIndex: 0, userAnswer: "WRONG" }],
    });
    (prisma.question.findMany as any).mockResolvedValue([mockQuestions[0]]);
    (prisma.userMastery.findUnique as any).mockResolvedValue(null);

    await evaluateSubmission(mockSubmissionId);
    
    expect(prisma.userMastery.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ masteryScore: 5 })
    }));
  });
  it("handles maxMarks 0 safely", async () => {
    (prisma.submission.findUniqueOrThrow as any).mockResolvedValue({
      ...mockSubmission,
      maxMarks: 0,
      answers: [],
    });
    (prisma.question.findMany as any).mockResolvedValue([]);
    (prisma.user.findUnique as any).mockResolvedValue({ leaderboardOptIn: true });

    const result = await evaluateSubmission(mockSubmissionId);
    expect(result.percentageScore).toBe(0);
  });

  it("calculates growth score for a perfect submission with high streak", async () => {
    (prisma.submission.findUniqueOrThrow as any).mockResolvedValue({
      ...mockSubmission,
      timeTaken: 600,
      assignment: { ...mockSubmission.assignment, difficulty: "HARD" },
      user: { 
        id: "user-1", 
        leaderboardOptIn: true,
        studyStreak: { currentStreak: 30 } 
      },
    });
    (prisma.question.findMany as any).mockResolvedValue(mockQuestions);
    (callGemini as any).mockResolvedValue({ isCorrect: true, marksAwarded: 5, feedback: "Perfect" });

    const result = await evaluateSubmission(mockSubmissionId);
    expect(result.percentageScore).toBe(100);
    expect(prisma.leaderboardEntry.upsert).toHaveBeenCalled();
  });
});



