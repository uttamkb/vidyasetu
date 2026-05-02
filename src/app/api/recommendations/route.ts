import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRecommendations, getNextUpSummary } from "@/services/recommendation-engine";

// GET /api/recommendations — personalized recommendations for the student
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") ?? "full"; // "full" | "dashboard"

  try {
    if (mode === "dashboard") {
      const summary = await getNextUpSummary(session.user.id);
      return NextResponse.json(summary);
    }

    const recommendations = await getRecommendations(session.user.id, 10);
    return NextResponse.json({ recommendations });
  } catch (err) {
    console.error("[GET /api/recommendations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
