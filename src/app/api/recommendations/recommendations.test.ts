import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { auth } from "@/lib/auth";
import { getRecommendations, getNextUpSummary } from "@/services/recommendation-engine";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/services/recommendation-engine", () => ({
  getRecommendations: vi.fn(),
  getNextUpSummary: vi.fn(),
}));

describe("Recommendations API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if unauthorized", async () => {
    (auth as any).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/recommendations");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns full recommendations by default", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (getRecommendations as any).mockResolvedValue([{ id: "rec-1" }]);

    const req = new NextRequest("http://localhost/api/recommendations");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.recommendations.length).toBe(1);
    expect(getRecommendations).toHaveBeenCalledWith("user-1", 10);
  });

  it("returns dashboard summary when mode=dashboard", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (getNextUpSummary as any).mockResolvedValue({ recommendations: [], weakAreaCount: 2, strongAreas: [] });

    const req = new NextRequest("http://localhost/api/recommendations?mode=dashboard");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.weakAreaCount).toBe(2);
    expect(getNextUpSummary).toHaveBeenCalledWith("user-1");
  });
});
