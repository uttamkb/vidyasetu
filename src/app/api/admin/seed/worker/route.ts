import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processNextTask } from "@/services/content-seeder";

export async function POST(req: NextRequest) {
  const session = await auth();
  
  // Also allow a secret key for automated workers if needed, 
  // but for now session-based admin check is safer.
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processNextTask();
  return NextResponse.json(result);
}
