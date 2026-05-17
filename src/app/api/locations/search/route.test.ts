import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

describe("Location Search API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns master suggestions for districts when state matches", async () => {
    (prisma.user.findMany as any).mockResolvedValue([]);
    
    const req = new NextRequest("http://localhost/api/locations/search?type=district&state=Odisha&query=Kho");
    const res = await GET(req);
    const data = await res.json();

    expect(data.suggestions).toContain("Khordha");
    expect(data.suggestions.length).toBeGreaterThan(0);
  });

  it("returns school chain suggestions for schools", async () => {
    (prisma.user.findMany as any).mockResolvedValue([]);
    
    const req = new NextRequest("http://localhost/api/locations/search?type=school&query=Kend");
    const res = await GET(req);
    const data = await res.json();

    expect(data.suggestions).toContain("Kendriya Vidyalaya");
  });

  it("merges database results with master data", async () => {
    (prisma.user.findMany as any).mockResolvedValue([
      { school: "Custom School" }
    ]);
    
    const req = new NextRequest("http://localhost/api/locations/search?type=school&query=Cus");
    const res = await GET(req);
    const data = await res.json();

    expect(data.suggestions).toContain("Custom School");
  });

  it("returns empty for short queries", async () => {
    const req = new NextRequest("http://localhost/api/locations/search?type=school&query=a");
    const res = await GET(req);
    const data = await res.json();

    expect(data.suggestions).toEqual([]);
  });
});
