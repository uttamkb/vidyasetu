import { describe, it, expect, vi, beforeEach } from "vitest";
import { commitIngestedContent } from "./content-ingestor";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    sourceDocument: { create: vi.fn() },
    schoolExamPattern: { upsert: vi.fn() },
    subtopic: { findFirst: vi.fn() },
    question: { createMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma-json", () => ({
  toJson: vi.fn((val) => val),
}));

describe("content-ingestor", () => {
  const mockExtraction = {
    blueprint: {
      totalMarks: 40,
      sections: [{ name: "A", type: "MCQ", count: 10, marksPerQuestion: 1 }],
      stylisticContext: "NCERT style",
    },
    questions: [
      {
        type: "MCQ",
        content: { question: "What is 2+2?", correctAnswer: "4", options: ["1", "2", "3", "4"], explanation: "Math", maxMarks: 1 },
        difficulty: 1,
        bloomLevel: "UNDERSTAND",
        suggestedSubtopicName: "Addition",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully commits ingested content to the database", async () => {
    (prisma.sourceDocument.create as any).mockResolvedValue({ id: "doc-1" });
    (prisma.subtopic.findFirst as any).mockResolvedValue({ id: "st-1" });
    (prisma.question.createMany as any).mockResolvedValue({ count: 1 });

    const result = await commitIngestedContent({
      schoolId: "school-1",
      subjectId: "sub-1",
      grade: "9",
      examType: "UNIT_TEST",
      extraction: mockExtraction as any,
    });

    expect(prisma.sourceDocument.create).toHaveBeenCalled();
    expect(prisma.schoolExamPattern.upsert).toHaveBeenCalled();
    expect(prisma.question.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          subtopicId: "st-1",
          schoolId: "school-1",
          sourceDocumentId: "doc-1",
        }),
      ]),
    });
    expect(result.questionCount).toBe(1);
  });

  it("handles missing subtopic mapping by skipping the question", async () => {
    (prisma.sourceDocument.create as any).mockResolvedValue({ id: "doc-1" });
    (prisma.subtopic.findFirst as any).mockResolvedValue(null); // No match found
    (prisma.question.createMany as any).mockResolvedValue({ count: 0 });

    const result = await commitIngestedContent({
      schoolId: "school-1",
      subjectId: "sub-1",
      grade: "9",
      examType: "UNIT_TEST",
      extraction: mockExtraction as any,
    });

    expect(result.questionCount).toBe(0);
    expect(prisma.question.createMany).not.toHaveBeenCalled();
  });
});
