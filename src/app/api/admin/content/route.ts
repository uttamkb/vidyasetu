import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { topicId, type, title, description, url, content, schoolId } = body;

    if (!topicId || !type || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const topic = await prisma.topic.findUniqueOrThrow({
      where: { id: topicId },
      include: { chapter: { include: { subject: true } } }
    });

    const material = await prisma.studyMaterial.create({
      data: {
        title,
        description,
        type,
        youtubeUrl: type === "VIDEO" ? url : null,
        fileUrl: (type === "PDF" || type === "WORKSHEET") ? url : null,
        content: type === "NOTES" ? content : null,
        topicId,
        chapterId: topic.chapterId,
        subjectId: topic.chapter.subjectId,
        isAIGenerated: false,
        isPublished: true,
        schoolId: schoolId || null,
      } as any
    });

    return NextResponse.json({ success: true, material });
  } catch (error: any) {
    console.error("[POST /api/admin/content]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
