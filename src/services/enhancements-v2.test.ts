import { describe, it, expect, vi, beforeEach } from "vitest";
import { getQuestionSourceDistribution } from "./admin-analytics";
import { TRANSCRIPTION_PROMPT } from "@/prompts/transcription";
import { prisma } from "@/lib/db";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    question: {
      findMany: vi.fn(),
    },
  },
}));

describe("Admin Analytics & OCR Enhancements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AdminAnalyticsService", () => {
    it("should correctly categorize question sources from strategy and source tags", async () => {
      // Setup mock questions with mixed source data
      (prisma.question.findMany as any).mockResolvedValue([
        { source: "NCERT", content: { strategy: "NCERT" } },
        { source: "RD_SHARMA", content: { strategy: "RD_SHARMA" } },
        { source: "OTHER", content: { strategy: "COMPETENCY" } }, // Should map to CBSE_COMPETENCY
        { source: "HOTS", content: { strategy: "HOTS" } },
        { source: "UNSPECIFIED", content: {} }, // Should map to OTHER
      ]);

      const distribution = await getQuestionSourceDistribution();

      expect(distribution).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ source: "NCERT", count: 1 }),
          expect.objectContaining({ source: "RD_SHARMA", count: 1 }),
          expect.objectContaining({ source: "CBSE_COMPETENCY", count: 1 }),
          expect.objectContaining({ source: "HOTS", count: 1 }),
          expect.objectContaining({ source: "OTHER", count: 1 }),
        ])
      );
    });

    it("should return an empty array if no questions exist", async () => {
      (prisma.question.findMany as any).mockResolvedValue([]);
      const distribution = await getQuestionSourceDistribution();
      expect(distribution).toEqual([]);
    });
  });

  describe("OCR Confidence Tagging", () => {
    it("should include confidence tagging instructions in the transcription prompt", () => {
      const prompt = TRANSCRIPTION_PROMPT("assignment-id", "questions-context");
      
      expect(prompt).toContain("CONFIDENCE TAGGING");
      expect(prompt).toContain("<mark>");
      expect(prompt).toContain("wrap it in <mark>tags");
    });
  });
});
