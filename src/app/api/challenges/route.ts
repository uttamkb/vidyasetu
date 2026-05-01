import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // 1. Get active weekly challenges
    const activeChallenges = await prisma.weeklyChallenge.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    // 2. Get user progress for these challenges
    const userChallenges = await prisma.userChallenge.findMany({
      where: {
        userId: session.user.id,
        challengeId: { in: activeChallenges.map(c => c.id) }
      },
      include: { challenge: true }
    });
    
    // 3. For any challenge not yet linked to the user, create an initial record
    const linkedChallengeIds = new Set(userChallenges.map(uc => uc.challengeId));
    const unlinkedChallenges = activeChallenges.filter(c => !linkedChallengeIds.has(c.id));
    
    if (unlinkedChallenges.length > 0) {
      await prisma.userChallenge.createMany({
        data: unlinkedChallenges.map(c => ({
          userId: session.user.id as string,
          challengeId: c.id,
          progress: 0,
        }))
      });
      
      // Re-fetch to get complete list
      const updatedUserChallenges = await prisma.userChallenge.findMany({
        where: {
          userId: session.user.id,
          challengeId: { in: activeChallenges.map(c => c.id) }
        },
        include: { challenge: true }
      });
      
      return NextResponse.json({ success: true, data: updatedUserChallenges });
    }

    return NextResponse.json({ success: true, data: userChallenges });
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
