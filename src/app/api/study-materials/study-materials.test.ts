import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateTopicContentPack, saveContentPack, isContentOutdated } from "@/services/content-curator";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
    },
    subject: {
      findMany: vi.fn(),
    },
    studyMaterial: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    question: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/services/content-curator", () => ({
  generateTopicContentPack: vi.fn(),
  saveContentPack: vi.fn(),
  isContentOutdated: vi.fn(),
}));

vi.mock("@/lib/require-subscription", () => ({
  requireSubscription: vi.fn(() => Promise.resolve({ allowed: true, reason: "OK", code: "OK", shadowMode: false })),
  incrementUsage: vi.fn(() => Promise.resolve()),
}));

describe("GET /api/study-materials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if unauthorized", async () => {
    (auth as any).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/study-materials");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("triggers JIT generation if topic has no materials", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.user.findUniqueOrThrow as any).mockResolvedValue({ grade: "9", board: "CBSE" });
    (prisma.subject.findMany as any).mockResolvedValue([{ id: "sub-1" }]);
    
    // First call returns empty, second call (after JIT) returns generated material
    (prisma.studyMaterial.findMany as any)
      .mockResolvedValueOnce([]) 
      .mockResolvedValueOnce([{ id: "mat-1", type: "PLATFORM_CONTENT", title: "Smart Notes", subject: {}, chapter: {}, topic: {} }]);

    (generateTopicContentPack as any).mockResolvedValue({ coreConcepts: [] });
    (saveContentPack as any).mockResolvedValue({});
    (isContentOutdated as any).mockReturnValue(true);

    const req = new NextRequest("http://localhost/api/study-materials?topicId=topic-1");
    const res = await GET(req);
    const data = await res.json();

    expect(generateTopicContentPack).toHaveBeenCalledWith("topic-1");
    expect(saveContentPack).toHaveBeenCalled();
    expect(data.materials.length).toBe(1);
    expect(data.materials[0].title).toBe("Smart Notes");
  });

  it("auto-heals broken AI notes", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.user.findUniqueOrThrow as any).mockResolvedValue({ grade: "9", board: "CBSE" });
    (prisma.subject.findMany as any).mockResolvedValue([{ id: "sub-1" }]);
    
    // Returns a broken note (too short)
    (prisma.studyMaterial.findMany as any).mockResolvedValue([
      { id: "broken-1", type: "PLATFORM_CONTENT", content: "Study notes for Topic X", title: "Broken", subject: {}, chapter: {}, topic: {} }
    ]);
    (isContentOutdated as any).mockReturnValue(true);

    const req = new NextRequest("http://localhost/api/study-materials?topicId=topic-1");
    await GET(req);

    expect(prisma.studyMaterial.deleteMany).toHaveBeenCalledWith({ where: { topicId: "topic-1" } });
  });
});
