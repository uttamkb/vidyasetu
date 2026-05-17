import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { inngest } from "@/inngest/client";

// Cache Bust Timestamp: 2026-05-15T00:48:00Z
export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { grade, board } = await req.json();
    
    if (!grade || !board) {
      return NextResponse.json({ error: "Missing grade or board" }, { status: 400 });
    }

    // Trigger Inngest to bootstrap the full subject tree for this grade/board
    await inngest.send({
      name: "curriculum/bootstrap.grade",
      data: { grade, board }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Bootstrapping Grade ${grade} (${board}) in background via Inngest.` 
    });
  } catch (error: any) {
    console.error("[POST /api/admin/seeder/bootstrap]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
