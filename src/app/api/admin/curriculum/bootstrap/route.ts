import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { CurriculumResearcher } from "@/services/curriculum-researcher";

const CORE_SUBJECTS = [
  { name: "Mathematics", color: "bg-blue-500", icon: "Calculator" },
  { name: "Science", color: "bg-green-500", icon: "FlaskConical" },
  { name: "Social Science", color: "bg-orange-500", icon: "Globe" },
  { name: "English", color: "bg-purple-500", icon: "BookOpen" },
  { name: "Hindi", color: "bg-rose-500", icon: "Pen" },
];

export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = session?.user?.role;

    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { grade } = await req.json();
    if (!grade) {
      return NextResponse.json({ error: "Grade is required" }, { status: 400 });
    }

    console.log(`🌱 Bootstrapping Grade ${grade} curriculum...`);

    const results = [];

    for (const core of CORE_SUBJECTS) {
      // 1. Create or Get Subject
      const subject = await prisma.subject.upsert({
        where: {
          name_grade_board: {
            name: core.name,
            grade: grade.toString(),
            board: "CBSE",
          },
        },
        update: {},
        create: {
          name: core.name,
          grade: grade.toString(),
          board: "CBSE",
          color: core.color,
          icon: core.icon,
        },
      });

      // 2. Trigger AI Generation (Curriculum Structure)
      // Note: In production, this should be an Inngest job, but for direct Admin action
      // we'll run it and wait for completion to provide immediate feedback.
      try {
        await CurriculumResearcher.generateCurriculumStructure(subject.id);
        results.push({ subject: core.name, status: "SUCCESS" });
      } catch (err) {
        console.error(`Failed to seed ${core.name} for Grade ${grade}:`, err);
        results.push({ subject: core.name, status: "FAILED", error: String(err) });
      }
    }

    return NextResponse.json({ 
      message: `Bootstrapping complete for Grade ${grade}`,
      results 
    });

  } catch (error) {
    console.error("Curriculum Bootstrap Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
