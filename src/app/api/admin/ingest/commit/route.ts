import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { commitIngestedContent } from "@/services/content-ingestor";

/**
 * Endpoint for committing the admin-verified extraction to the database.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { schoolId, subjectId, grade, examType, extraction } = body;

    if (!schoolId || !subjectId || !grade || !examType || !extraction) {
      return NextResponse.json({ 
        error: "Missing required fields for commitment (schoolId, subjectId, grade, examType, extraction)" 
      }, { status: 400 });
    }

    console.log(`[AdminIngestCommit] Committing verified questions for school ${schoolId}...`);
    const result = await commitIngestedContent({
      schoolId,
      subjectId,
      grade,
      examType,
      extraction,
    });

    return NextResponse.json({ 
      success: true, 
      message: `Successfully ingested ${result.questionCount} questions into the bank.`,
      result 
    });
  } catch (error: any) {
    console.error("[AdminIngestCommit] Error during commit:", error);
    return NextResponse.json({ error: "Database commit failed." }, { status: 500 });
  }
}
