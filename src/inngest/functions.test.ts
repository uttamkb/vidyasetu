import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  monthlySeeder,
  seedCurriculumStructure,
  seedTopicContent,
  cleanStaleGeneratingAssignments,
  retryFailedEvaluationsJob,
  archiveOldAIValidationsJob,
  bootstrapGradeCurriculum,
} from "./functions";
import { prisma } from "@/lib/db";
import { CurriculumResearcher } from "@/services/curriculum-researcher";
import { generateTopicContentPack, saveContentPack, isContentOutdated } from "@/services/content-curator";
import { inngest } from "@/inngest/client";

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: vi.fn().mockResolvedValue({}),
    createFunction: vi.fn().mockImplementation((config, trigger, handler) => ({
      fn: handler,
      config,
      trigger,
    })),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    subject: { findMany: vi.fn(), findUnique: vi.fn() },
    topic: { findMany: vi.fn() },
    studyMaterial: { findMany: vi.fn() },
    assignment: { findMany: vi.fn(), updateMany: vi.fn() },
    task: { findMany: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    submission: { findUnique: vi.fn() },
    aIValidation: { deleteMany: vi.fn() },
  },
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

  describe("cleanStaleGeneratingAssignments", () => {
    it("should mark stale assignments as failed", async () => {
      vi.mocked(prisma.assignment.findMany).mockResolvedValue([
        { id: "asgn-stale-1" },
        { id: "asgn-stale-2" }
      ] as any);
      vi.mocked(prisma.assignment.updateMany).mockResolvedValue({ count: 2 } as any);

      const mockStep = createMockStep();
      const handler = (cleanStaleGeneratingAssignments as any).fn || (cleanStaleGeneratingAssignments as any).invoke;
      const result = await handler({ event: {}, step: mockStep });

      expect(prisma.assignment.findMany).toHaveBeenCalled();
      expect(prisma.assignment.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["asgn-stale-1", "asgn-stale-2"] } },
        data: { status: "FAILED" }
      });
      expect(result).toEqual({ cleaned: 2 });
    });

    it("should return 0 if no stale assignments exist", async () => {
      vi.mocked(prisma.assignment.findMany).mockResolvedValue([]);

      const mockStep = createMockStep();
      const handler = (cleanStaleGeneratingAssignments as any).fn || (cleanStaleGeneratingAssignments as any).invoke;
      const result = await handler({ event: {}, step: mockStep });

      expect(prisma.assignment.findMany).toHaveBeenCalled();
      expect(prisma.assignment.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual({ cleaned: 0 });
    });
  });

  describe("retryFailedEvaluationsJob", () => {
    it("should do nothing if there are no failed evaluation tasks", async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([]);
      const mockStep = createMockStep();
      const handler = (retryFailedEvaluationsJob as any).fn;
      
      const result = await handler({ event: {}, step: mockStep });
      expect(result).toEqual({ retried: 0 });
      expect(prisma.task.updateMany).not.toHaveBeenCalled();
      expect(inngest.send).not.toHaveBeenCalled();
    });

    it("should re-dispatch evaluation event and mark task as completed", async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([
        {
          id: "task-fail-1",
          type: "EVALUATION_FAILED",
          status: "FAILED",
          payload: { submissionId: "sub-1" },
          createdAt: new Date(),
        } as any,
      ]);
      vi.mocked(prisma.submission.findUnique).mockResolvedValue({
        status: "IN_PROGRESS",
        userId: "user-1",
      } as any);

      const mockStep = createMockStep();
      const handler = (retryFailedEvaluationsJob as any).fn;
      
      const result = await handler({ event: {}, step: mockStep });
      expect(result).toEqual({ retried: 1 });
      expect(inngest.send).toHaveBeenCalledWith([
        {
          name: "app/submission.evaluate",
          data: {
            submissionId: "sub-1",
            userId: "user-1",
          },
        },
      ]);
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["task-fail-1"] } },
        data: { status: "COMPLETED" },
      });
    });

    it("should skip already evaluated submissions but mark task completed", async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([
        {
          id: "task-fail-2",
          type: "EVALUATION_FAILED",
          status: "FAILED",
          payload: { submissionId: "sub-already-eval" },
          createdAt: new Date(),
        } as any,
      ]);
      vi.mocked(prisma.submission.findUnique).mockResolvedValue({
        status: "EVALUATED",
        userId: "user-2",
      } as any);

      const mockStep = createMockStep();
      const handler = (retryFailedEvaluationsJob as any).fn;
      
      const result = await handler({ event: {}, step: mockStep });
      expect(result).toEqual({ retried: 0 });
      expect(inngest.send).not.toHaveBeenCalled();
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["task-fail-2"] } },
        data: { status: "COMPLETED" },
      });
    });
  });

  describe("archiveOldAIValidationsJob", () => {
    it("should delete old validation records older than 90 days", async () => {
      vi.mocked(prisma.aIValidation.deleteMany).mockResolvedValue({ count: 123 } as any);
      
      const mockStep = createMockStep();
      const handler = (archiveOldAIValidationsJob as any).fn;
      
      const result = await handler({ event: {}, step: mockStep });
      expect(result).toEqual({ deleted: 123 });
      expect(prisma.aIValidation.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) },
        },
      });
    });
  });

  describe("bootstrapGradeCurriculum", () => {
    it("should abort if grade or board is missing", async () => {
      const mockStep = createMockStep();
      const handler = (bootstrapGradeCurriculum as any).fn || (bootstrapGradeCurriculum as any).invoke;

      const result = await handler({ event: { data: {} }, step: mockStep });
      expect(result.error).toBe("Missing grade or board");
    });

    it("should upsert 5 subjects and dispatch app/curriculum.seed events", async () => {
      // Mock subject upserts
      prisma.subject.upsert = vi.fn().mockImplementation(({ create }) => Promise.resolve({
        id: `mock-${create.name.toLowerCase()}`,
        name: create.name,
      }));

      const mockStep = createMockStep();
      const handler = (bootstrapGradeCurriculum as any).fn || (bootstrapGradeCurriculum as any).invoke;

      const result = await handler({
        event: { data: { grade: "10", board: "CBSE" } },
        step: mockStep,
      });

      expect(prisma.subject.upsert).toHaveBeenCalledTimes(5);
      expect(mockStep.sendEvent).toHaveBeenCalledWith(
        "dispatch-subject-seeders",
        [
          { name: "app/curriculum.seed", data: { subjectId: "mock-mathematics" } },
          { name: "app/curriculum.seed", data: { subjectId: "mock-science" } },
          { name: "app/curriculum.seed", data: { subjectId: "mock-social science" } },
          { name: "app/curriculum.seed", data: { subjectId: "mock-english" } },
          { name: "app/curriculum.seed", data: { subjectId: "mock-hindi" } },
        ]
      );

      expect(result).toEqual({
        grade: "10",
        board: "CBSE",
        subjectsCount: 5,
      });
    });
  });
});
