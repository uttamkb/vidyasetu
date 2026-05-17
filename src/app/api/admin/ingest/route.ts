import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractQuestionsFromBuffer } from "@/services/content-ingestor";
import { prisma } from "@/lib/db";

/**
 * Endpoint for on-the-spot document extraction.
 * Takes a file and metadata, returns structured AI-extracted questions for admin review.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const schoolId = formData.get("schoolId") as string;
    const subjectId = formData.get("subjectId") as string;
    const grade = formData.get("grade") as string;

    if (!file || !schoolId || !subjectId || !grade) {
      return NextResponse.json({ error: "Missing required fields (file, schoolId, subjectId, grade)" }, { status: 400 });
    }

    // 1. Validate existence
    const [school, subject] = await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId } }),
      prisma.subject.findUnique({ where: { id: subjectId } }),
    ]);

    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });
    if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

    // 2. Read file into buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;

    // 3. Trigger AI extraction (Pro model cascade)
    console.log(`[AdminIngest] Processing document for ${school.name} - ${subject.name} (Grade ${grade})...`);
    const extraction = await extractQuestionsFromBuffer(buffer, mimeType, {
      schoolName: school.name,
      subjectName: subject.name,
      grade,
    });

    return NextResponse.json({
      success: true,
      extraction,
      metadata: {
        schoolId,
        subjectId,
        grade,
      }
    });
  } catch (error: any) {
    console.error("[AdminIngest] Error during extraction:", error);
    return NextResponse.json(
      { error: "AI extraction failed. Please try a clearer document or different file format." }, 
      { status: 500 }
    );
  }
}
