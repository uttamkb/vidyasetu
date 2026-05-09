import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRecommendations, getNextUpSummary, generateRemedialAssignment } from "./recommendation-engine";
import { prisma } from "@/lib/db";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    userMastery: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    studyMaterial: {
      count: vi.fn(),
    },
    subtopic: {
      findUniqueOrThrow: vi.fn(),
    },
  },
}));

vi.mock("./assignment-generator", () => ({
  generateAssignment: vi.fn(() => Promise.resolve({ id: "asgn-1" })),
}));

describe("recommendation-engine", () => {
  const mockUserId = "user-123";
  const mockMasteryRows = [
    {
      masteryScore: 25, // Remedial (HIGH)
      subtopic: {
        id: "st-1",
        name: "Gravity",
        topic: {
          id: "t-1",
          name: "Gravitation",
          chapter: {
            name: "Physics Basics",
            subject: { name: "Science", id: "sub-1" },
          },
        },
      },
    },
    {
      masteryScore: 45, // Weak (MEDIUM)
      subtopic: {
        id: "st-2",
        name: "Friction",
        topic: {
          id: "t-2",
          name: "Force",
          chapter: {
            name: "Physics Basics",
            subject: { name: "Science", id: "sub-1" },
          },
        },
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns prioritized recommendations based on mastery", async () => {
    (prisma.userMastery.findMany as any).mockResolvedValue(mockMasteryRows);
    (prisma.studyMaterial.count as any).mockResolvedValue(1);

    const recs = await getRecommendations(mockUserId);

    expect(recs.length).toBe(3); // 2 study materials + 1 remedial assignment for st-1
    expect(recs[0].priority).toBe("HIGH");
    expect(recs[0].type).toBe("STUDY_MATERIAL");
    expect(recs[1].type).toBe("REMEDIAL_ASSIGNMENT");
    expect(recs[2].priority).toBe("MEDIUM");
  });

  it("returns summary for dashboard including strong areas", async () => {
    (prisma.userMastery.findMany as any)
      .mockResolvedValueOnce(mockMasteryRows) // For getRecommendations
      .mockResolvedValueOnce([ // For strong areas
        {
          masteryScore: 85,
          subtopic: {
            name: "Algebra",
            topic: { chapter: { subject: { name: "Math" } } }
          }
        }
      ]);
    (prisma.userMastery.groupBy as any).mockResolvedValue([{ subtopicId: "st-1" }]);
    (prisma.studyMaterial.count as any).mockResolvedValue(1);

    const summary = await getNextUpSummary(mockUserId);

    expect(summary.recommendations.length).toBe(3);
    expect(summary.strongAreas.length).toBe(1);
    expect(summary.strongAreas[0].name).toBe("Algebra");
  });

  it("generates remedial assignment for a specific subtopic", async () => {
    (prisma.subtopic.findUniqueOrThrow as any).mockResolvedValue(mockMasteryRows[0].subtopic);
    
    const result = await generateRemedialAssignment(mockUserId, "st-1");

    expect(result).toBeDefined();
    expect(prisma.subtopic.findUniqueOrThrow).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "st-1" }
    }));
  });
});
