import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
  },
}));

describe("GET /api/curriculum", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if unauthorized", async () => {
    (auth as any).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/curriculum");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns curriculum tree for authorized user", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.user.findUniqueOrThrow as any).mockResolvedValue({ grade: "9", board: "CBSE" });
    (prisma.subject.findMany as any).mockResolvedValue([
      {
        id: "sub-1",
        name: "Math",
        chapters: [
          {
            id: "ch-1",
            name: "Chapter 1",
            topics: [],
            studyMaterials: [],
          },
        ],
      },
    ]);

    const req = new NextRequest("http://localhost/api/curriculum");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.curriculum.length).toBe(1);
    expect(data.curriculum[0].name).toBe("Math");
  });
});
