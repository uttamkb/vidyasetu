import { describe, it, expect, vi, beforeEach } from "vitest";
import { CurriculumResearcher } from "./curriculum-researcher";
import { prisma } from "@/lib/db";
import { callGemini } from "@/lib/gemini";

// Mock dependencies
vi.mock("@/lib/db", () => {
  const mockPrisma = {
    subject: {
      findUnique: vi.fn(),
    },
    chapter: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((ops) => {
      if (typeof ops === "function") {
        return ops(mockPrisma);
      }
      return Promise.all(ops);
    }),
  };
  return { prisma: mockPrisma };
});

vi.mock("@/lib/gemini", () => ({
  geminiProModels: [],
  callGemini: vi.fn(),
}));

describe("curriculum-researcher", () => {
  const mockSubjectId = "sub-123";
  const mockSubject = {
    id: mockSubjectId,
    name: "Mathematics",
    grade: "9",
    chapters: [],
  };

  const mockCurriculum = {
    chapters: [
      {
        name: "Number Systems",
        topics: [{ name: "Irrational Numbers" }],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates curriculum structure for an empty subject", async () => {
    (prisma.subject.findUnique as any).mockResolvedValue(mockSubject);
    (callGemini as any).mockResolvedValue(mockCurriculum);
    (prisma.chapter.findMany as any).mockResolvedValue([{ name: "Number Systems" }]);

    const result = await CurriculumResearcher.generateCurriculumStructure(mockSubjectId);

    expect(result.length).toBe(1);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(callGemini).toHaveBeenCalled();
  });

  it("skips generation if chapters already exist", async () => {
    (prisma.subject.findUnique as any).mockResolvedValue({
      ...mockSubject,
      chapters: [{ id: "ch-1" }],
    });

    const result = await CurriculumResearcher.generateCurriculumStructure(mockSubjectId);

    expect(result.length).toBe(1);
    expect(callGemini).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("throws error if subject is not found", async () => {
    (prisma.subject.findUnique as any).mockResolvedValue(null);

    await expect(CurriculumResearcher.generateCurriculumStructure(mockSubjectId)).rejects.toThrow("Subject sub-123 not found");
  });
});
