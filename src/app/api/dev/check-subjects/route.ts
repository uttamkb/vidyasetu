import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const questionCount = await prisma.question.count();
    const assignmentCount = await prisma.assignment.count();
    const generatingAssignments = await prisma.assignment.findMany({
      where: { status: "GENERATING" },
      select: { id: true, title: true, createdAt: true }
    });

    return NextResponse.json({
      questionCount,
      assignmentCount,
      generatingAssignments
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
