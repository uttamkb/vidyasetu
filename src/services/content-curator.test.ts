import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateTopicContentPack, saveContentPack, type ContentPack } from "./content-curator";
import { prisma } from "@/lib/db";
import { callGemini } from "@/lib/gemini";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    topic: {
      findUniqueOrThrow: vi.fn(),
    },
    studyMaterial: {
      upsert: vi.fn(),
    },
    subtopic: {
      findMany: vi.fn(),
    },
    question: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/gemini", () => ({
  genAI: {
    getGenerativeModel: vi.fn(() => ({})),
  },
  callGemini: vi.fn(),
}));

describe("content-curator", () => {
  const mockTopicId = "topic-123";
  const mockTopic = {
    id: mockTopicId,
    name: "Laws of Motion",
    chapter: {
      name: "Force and Motion",
      subject: {
        name: "Science",
        grade: "9",
      },
    },
    subtopics: [
      { id: "st-1", name: "First Law" },
      { id: "st-2", name: "Second Law" },
    ],
  };

  const mockPack: ContentPack = {
    coreConcepts: [{ concept: "Inertia", explanation: "Tendency to remain at rest." }],
    microTopics: [{ title: "First Law", summary: "Object stays at rest unless acted upon." }],
    explanations: [{ topic: "Newton's First Law", detail: "Inertia is key.", ncertReference: "Sec 3.1" }],
    examples: [{ title: "Car Stop", problem: "Why do you fall forward?", solution: "Due to inertia." }],
    misconceptions: [{ wrong: "Force is needed for motion", correct: "Force is needed to change motion", why: "Inertia exists" }],
    revisionSheet: {
      keyFormulas: ["F = ma"],
      keyTerms: ["Inertia: resistance to change"],
      mnemonics: ["N-F-L: No Force, Life-stays-same"],
    },
    selfAssessmentQuestions: [
      { type: "MCQ", question: "What is inertia?", options: ["A", "B"], answer: "A", difficulty: "easy" },
    ],
    keyTakeaways: ["Force causes acceleration"],
    terminology: [{ term: "Inertia", definition: "Property of matter" }],
    youtubeSearchQueries: ["NCERT Class 9 Science Laws of Motion"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a content pack for a topic", async () => {
    (prisma.topic.findUniqueOrThrow as any).mockResolvedValue(mockTopic);
    (callGemini as any).mockResolvedValue(mockPack);

    const result = await generateTopicContentPack(mockTopicId);

    expect(result).toEqual(mockPack);
    expect(prisma.topic.findUniqueOrThrow).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: mockTopicId }
    }));
    expect(callGemini).toHaveBeenCalled();
  });

  it("saves a content pack and seeds questions", async () => {
    (prisma.topic.findUniqueOrThrow as any).mockResolvedValue(mockTopic);
    (prisma.subtopic.findMany as any).mockResolvedValue([{ id: "st-1" }]);
    (prisma.studyMaterial.upsert as any).mockResolvedValue({});
    (prisma.question.create as any).mockResolvedValue({});

    const result = await saveContentPack(mockTopicId, mockPack);

    expect(result.materialId).toBe(`ai-notes-${mockTopicId}`);
    expect(result.questionsAdded).toBe(1);
    
    // Verify study material was saved
    expect(prisma.studyMaterial.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: `ai-notes-${mockTopicId}` }
    }));

    // Verify video ref was saved
    expect(prisma.studyMaterial.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: `ai-video-ref-${mockTopicId}` }
    }));

    // Verify question bank seeding
    expect(prisma.question.create).toHaveBeenCalled();
  });
});
