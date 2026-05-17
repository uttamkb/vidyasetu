import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { seedQuestionBank } from "@/services/question-seeder";
import { z } from "zod";

const seedSchema = z.object({
  topicId: z.string().uuid(),
  strategy: z.enum(["STANDARD", "EXAM_EXCELLENCE", "COMPETENCY_FOCUS"]),
  quantity: z.number().min(1).max(50),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = seedSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload", details: parsed.error }, { status: 400 });
    }

    const result = await seedQuestionBank(parsed.data);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[POST /api/admin/seeder/questions] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
