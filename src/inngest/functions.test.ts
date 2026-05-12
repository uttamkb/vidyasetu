import { describe, it, expect, vi, beforeEach } from "vitest";
import { monthlySeeder, seedCurriculumStructure, seedTopicContent } from "./functions";
import { prisma } from "@/lib/db";
import { CurriculumResearcher } from "@/services/curriculum-researcher";
import { generateTopicContentPack, saveContentPack, isContentOutdated } from "@/services/content-curator";

vi.mock("@/lib/db", () => ({
  prisma: {
    subject: { findMany: vi.fn(), findUnique: vi.fn() },
    topic: { findMany: vi.fn() },
    studyMaterial: { findMany: vi.fn() }
  }
}));

vi.mock("@/services/curriculum-researcher", () => ({
  CurriculumResearcher: {
    generateCurriculumStructure: vi.fn()
  }
}));

vi.mock("@/services/content-curator", () => ({
  generateTopicContentPack: vi.fn(),
  saveContentPack: vi.fn(),
  isContentOutdated: vi.fn(),
  LATEST_CONTENT_VERSION: "premium-v1"
}));

// Helper to mock Inngest step context
const createMockStep = () => ({
  run: vi.fn().mockImplementation(async (name, fn) => fn()),
  sendEvent: vi.fn().mockResolvedValue({})
});

describe("Inngest Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("monthlySeeder", () => {
    it("should queue seeders for empty subjects and topics", async () => {
      // Mock empty subjects
      vi.mocked(prisma.subject.findMany).mockResolvedValue([
        { id: "sub-1", name: "Math", grade: "10", board: "CBSE" } as any
      ]);
      // Mock empty topics
      vi.mocked(prisma.topic.findMany).mockResolvedValue([
        { id: "top-1", name: "Algebra", studyMaterials: [] } as any
      ]);
      vi.mocked(isContentOutdated).mockReturnValue(true);

      const mockStep = createMockStep();
      
      // Execute the Inngest handler. Inngest v3 stores the handler on .fn
      // We pass a mock event and step context.
      const handler = (monthlySeeder as any).fn || (monthlySeeder as any).invoke;
      const result = await handler({ event: {}, step: mockStep });

      expect(mockStep.run).toHaveBeenCalledWith("find-empty-subjects", expect.any(Function));
      expect(mockStep.sendEvent).toHaveBeenCalledWith(
        "dispatch-subject-seeders",
        [{ name: "app/curriculum.seed", data: { subjectId: "sub-1" } }]
      );
      expect(mockStep.sendEvent).toHaveBeenCalledWith(
        "dispatch-topic-seeders",
        [{ name: "app/topic.seed", data: { topicId: "top-1" } }]
      );
      
      expect(result).toEqual({
        message: "Monthly scan complete",
        subjectsQueued: 1,
        topicsQueued: 1
      });
    });

    it("should not queue if no empty subjects or topics exist", async () => {
      vi.mocked(prisma.subject.findMany).mockResolvedValue([]);
      vi.mocked(prisma.topic.findMany).mockResolvedValue([
        { id: "top-existing", name: "Geometry", studyMaterials: [{ id: "mat-1" }] } as any
      ]);
      vi.mocked(isContentOutdated).mockReturnValue(false);

      const mockStep = createMockStep();
      const handler = (monthlySeeder as any).fn || (monthlySeeder as any).invoke;
      const result = await handler({ event: {}, step: mockStep });

      expect(mockStep.sendEvent).not.toHaveBeenCalled();
      expect(result.subjectsQueued).toBe(0);
    });
  });

  describe("seedCurriculumStructure", () => {
    it("should abort if subjectId is missing", async () => {
      const mockStep = createMockStep();
      const handler = (seedCurriculumStructure as any).fn || (seedCurriculumStructure as any).invoke;
      
      const result = await handler({ event: { data: {} }, step: mockStep });
      expect(result.error).toBe("Missing subjectId");
    });

    it("should skip if subject already has chapters", async () => {
      vi.mocked(prisma.subject.findUnique).mockResolvedValue({
        id: "sub-1",
        chapters: [{ id: "chap-1" }] // Not empty
      } as any);

      const mockStep = createMockStep();
      const handler = (seedCurriculumStructure as any).fn || (seedCurriculumStructure as any).invoke;
      
      const result = await handler({ event: { data: { subjectId: "sub-1" } }, step: mockStep });
      expect(mockStep.run).toHaveBeenCalled();
      expect(CurriculumResearcher.generateCurriculumStructure).not.toHaveBeenCalled();
      // Since `step.run` returns { skipped: true }, the handler completes
      expect(result.status).toBe("completed");
    });

    it("should generate curriculum if subject is empty", async () => {
      vi.mocked(prisma.subject.findUnique).mockResolvedValue({
        id: "sub-1",
        chapters: [] // Empty
      } as any);

      const mockStep = createMockStep();
      const handler = (seedCurriculumStructure as any).fn || (seedCurriculumStructure as any).invoke;
      
      await handler({ event: { data: { subjectId: "sub-1" } }, step: mockStep });
      
      expect(CurriculumResearcher.generateCurriculumStructure).toHaveBeenCalledWith("sub-1");
    });
  });

  describe("seedTopicContent", () => {
    it("should abort if topicId is missing", async () => {
      const mockStep = createMockStep();
      const handler = (seedTopicContent as any).fn || (seedTopicContent as any).invoke;
      
      const result = await handler({ event: { data: {} }, step: mockStep });
      expect(result.error).toBe("Missing topicId");
    });

    it("should skip if topic already has materials", async () => {
      vi.mocked(prisma.studyMaterial.findMany).mockResolvedValue([
        { id: "mat-1" } as any
      ]);

      const mockStep = createMockStep();
      const handler = (seedTopicContent as any).fn || (seedTopicContent as any).invoke;
      
      vi.mocked(isContentOutdated).mockReturnValue(false);
      await handler({ event: { data: { topicId: "top-1" } }, step: mockStep });
      
      expect(generateTopicContentPack).not.toHaveBeenCalled();
    });

    it("should generate and save content pack if topic is empty", async () => {
      vi.mocked(prisma.studyMaterial.findMany).mockResolvedValue([]);
      vi.mocked(isContentOutdated).mockReturnValue(true);
      
      const mockPack = { topicId: "top-1", materials: [] };
      vi.mocked(generateTopicContentPack).mockResolvedValue(mockPack as any);
      vi.mocked(saveContentPack).mockResolvedValue({ count: 2 } as any);

      const mockStep = createMockStep();
      const handler = (seedTopicContent as any).fn || (seedTopicContent as any).invoke;
      
      const result = await handler({ event: { data: { topicId: "top-1" } }, step: mockStep });
      
      expect(generateTopicContentPack).toHaveBeenCalledWith("top-1");
      expect(saveContentPack).toHaveBeenCalledWith("top-1", mockPack);
      expect(result.result).toEqual({ success: true, saved: { count: 2 } });
    });
  });
});
