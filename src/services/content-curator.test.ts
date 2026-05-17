import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateTopicContentPack, saveContentPack, isContentOutdated, LATEST_CONTENT_VERSION, type ContentPack } from "./content-curator";
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
      deleteMany: vi.fn(),
    },
    subtopic: {
      findMany: vi.fn(),
    },
    question: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/youtube", () => ({
  fetchYouTubeMeta: vi.fn(),
  extractYouTubeId: vi.fn((url) => url.split("v=")[1] || null),
  youTubeThumbnailUrl: vi.fn((id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`),
}));

vi.mock("@/lib/gemini", () => ({
  genAI: {
    getGenerativeModel: vi.fn(() => ({})),
  },
  callGemini: vi.fn(),
}));

vi.mock("./video-curator", () => ({
  curateVideosForTopic: vi.fn(() => Promise.resolve([
    { videoId: "mock-video-id", title: "Mock Video", description: "Mock Desc", channelName: "Mock Channel", relevanceScore: 90, keyMoments: [] }
  ])),
  saveCuratedVideos: vi.fn(() => Promise.resolve()),
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
    youtubeVideos: [{ videoId: "dQw4w9WgXcQ", title: "Intro to Inertia" }],
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
    (prisma.question.deleteMany as any).mockResolvedValue({});
    const { fetchYouTubeMeta } = await import("@/lib/youtube");
    (fetchYouTubeMeta as any).mockResolvedValue({ thumbnailUrl: "thumb", title: "Video Title" });

    const { curateVideosForTopic, saveCuratedVideos } = await import("./video-curator");
    const result = await saveContentPack(mockTopicId, mockPack);

    expect(result.materialId).toBe(`ai-notes-${mockTopicId}`);
    expect(result.questionsAdded).toBe(1);
    
    // Verify study material was saved
    expect(prisma.studyMaterial.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: `ai-notes-${mockTopicId}` }
    }));

    // Verify Phase 2 Video Curation was triggered
    expect(curateVideosForTopic).toHaveBeenCalled();
    expect(saveCuratedVideos).toHaveBeenCalled();

    // Verify question bank seeding
    expect(prisma.question.create).toHaveBeenCalled();
  });

  it("identifies outdated content correctly", () => {
    // Case 1: No materials
    expect(isContentOutdated([])).toBe(true);

    // Case 2: No PLATFORM_CONTENT
    expect(isContentOutdated([{ type: "VIDEO" } as any])).toBe(true);

    // Case 3: Wrong version marker
    expect(isContentOutdated([{ type: "PLATFORM_CONTENT", description: "Old v0" } as any])).toBe(true);

    // Case 4: Correct version marker
    expect(isContentOutdated([{ 
      type: "PLATFORM_CONTENT", 
      description: `Premium Notes [Version: ${LATEST_CONTENT_VERSION}]` 
    } as any])).toBe(false);
  });

  it("handles empty sections in saveContentPack", async () => {
    (prisma.topic.findUniqueOrThrow as any).mockResolvedValue(mockTopic);
    (prisma.subtopic.findMany as any).mockResolvedValue([]);
    (prisma.studyMaterial.upsert as any).mockResolvedValue({});
    (prisma.question.deleteMany as any).mockResolvedValue({});

    const emptyPack: ContentPack = {
      coreConcepts: [],
      microTopics: [],
      explanations: [],
      examples: [],
      misconceptions: [],
      revisionSheet: { keyFormulas: [], keyTerms: [], mnemonics: [] },
      selfAssessmentQuestions: [],
      keyTakeaways: [],
      terminology: [],
      youtubeVideos: [],
    };

    const result = await saveContentPack(mockTopicId, emptyPack);
    expect(result.materialsCreated).toBe(2);
    expect(prisma.question.create).not.toHaveBeenCalled();
  });

  it("handles keyDates in revision sheet", async () => {
    (prisma.topic.findUniqueOrThrow as any).mockResolvedValue(mockTopic);
    (prisma.studyMaterial.upsert as any).mockResolvedValue({});
    
    const historyPack = {
      ...mockPack,
      revisionSheet: { ...mockPack.revisionSheet, keyDates: ["1947: Independence"] }
    };

    await saveContentPack(mockTopicId, historyPack);
    expect(prisma.studyMaterial.upsert).toHaveBeenCalled();
  });

});

