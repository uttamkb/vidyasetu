import { describe, it, expect, vi, beforeEach } from "vitest";
import { transcribeExamPaper } from "./transcription-engine";
import { prisma } from "@/lib/db";
import { callGemini } from "@/lib/gemini";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    aIValidation: {
      findMany: vi.fn(),
    },
    question: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/gemini", () => ({
  geminiProModels: {},
  callGemini: vi.fn(),
}));

describe("AI Self-Learning Loop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should inject past corrections into the transcription prompt", async () => {
    // 1. Setup mock data for past failures
    (prisma.aIValidation.findMany as any).mockResolvedValue([
      {
        id: "v1",
        type: "TRANSCRIPTION",
        aiOutput: { q1: "n" },
        humanCorrection: { q1: "π" },
        feedback: "Handwritten pi was misread as n",
      },
    ]);

    // 2. Mock Gemini calls (first pass OCR, second pass semantic mapping)
    (callGemini as any)
      .mockResolvedValueOnce({ transcribedPages: [{ pageNumber: 1, rawText: "some ocr text" }] })
      .mockResolvedValueOnce({ extractedAnswers: {} });

    // 3. Execute transcription
    await transcribeExamPaper(
      "test-assignment-id",
      ["data:image/jpeg;base64,abc"],
      [{ id: "q1", content: { question: "What is pi?" }, type: "SHORT_ANSWER" }]
    );

    // 4. Verify that callGemini's second call (the semantic mapping text call) was called with a prompt containing the corrections
    const callArgs = (callGemini as any).mock.calls[1];
    const prompt = callArgs[1]; // Second parameter is prompt

    expect(prompt).toContain("### PAST CORRECTIONS (FEW-SHOT LEARNING)");
    expect(prompt).toContain("Handwritten pi was misread as n");
    expect(prompt).toContain('"q1":"π"');
  });

  it("should not inject past corrections if none exist", async () => {
    (prisma.aIValidation.findMany as any).mockResolvedValue([]);
    (callGemini as any)
      .mockResolvedValueOnce({ transcribedPages: [{ pageNumber: 1, rawText: "some ocr text" }] })
      .mockResolvedValueOnce({ extractedAnswers: {} });

    await transcribeExamPaper(
      "test-assignment-id",
      ["data:image/jpeg;base64,abc"],
      [{ id: "q1", content: { question: "What is pi?" }, type: "SHORT_ANSWER" }]
    );

    const callArgs = (callGemini as any).mock.calls[1];
    const prompt = callArgs[1];

    expect(prompt).not.toContain("### PAST CORRECTIONS (FEW-SHOT LEARNING)");
  });

  it("should promote high performing questions and update DB in bulk", async () => {
    const { promoteHighPerformingQuestions } = await import("./self-learning-service");

    (prisma.question.findMany as any).mockResolvedValue([
      { id: "q-1" },
      { id: "q-2" }
    ]);
    (prisma.question.updateMany as any).mockResolvedValue({ count: 2 });

    const promoted = await promoteHighPerformingQuestions(5);

    expect(promoted).toBe(2);
    expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        verifiedByHuman: false,
        source: { in: ["ai_generated", "ai_seed"] },
        usageCount: { gte: 5 },
        avgAccuracy: { gte: 0.6, lte: 0.95 }
      })
    }));
    expect(prisma.question.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ["q-1", "q-2"] } },
      data: {
        verifiedByHuman: true,
        source: "ai_promoted"
      }
    }));
  });

  it("should return 0 if no eligible questions exist", async () => {
    const { promoteHighPerformingQuestions } = await import("./self-learning-service");

    (prisma.question.findMany as any).mockResolvedValue([]);

    const promoted = await promoteHighPerformingQuestions(5);

    expect(promoted).toBe(0);
    expect(prisma.question.updateMany).not.toHaveBeenCalled();
  });
});
