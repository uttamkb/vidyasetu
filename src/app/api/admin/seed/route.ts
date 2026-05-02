import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { initiateSeeding, getSeederStatus } from "@/services/content-seeder";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getSeederStatus();
  return NextResponse.json(status);
}

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await initiateSeeding();
  return NextResponse.json(result);
}
