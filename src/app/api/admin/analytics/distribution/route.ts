import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuestionSourceDistribution } from "@/services/admin-analytics";

export async function GET(req: NextRequest) {
  const session = await auth();
  
  // Security: Only Admins can view distribution analytics
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const grade = searchParams.get("grade") || undefined;
  const subjectId = searchParams.get("subjectId") || undefined;

  try {
    const distribution = await getQuestionSourceDistribution(grade, subjectId);
    return NextResponse.json({ distribution });
  } catch (err) {
    console.error("[GET /api/admin/analytics/distribution] Error:", err);
    return NextResponse.json({ error: "Failed to fetch distribution analytics" }, { status: 500 });
  }
}
