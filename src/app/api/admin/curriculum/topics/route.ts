import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const topics = await prisma.topic.findMany({
      orderBy: { name: "asc" },
      include: {
        chapter: {
          include: {
            subject: true
          }
        }
      }
    });

    return NextResponse.json({ topics });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch topics" }, { status: 500 });
  }
}
