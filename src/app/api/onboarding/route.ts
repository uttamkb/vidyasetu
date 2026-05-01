import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const onboardingSchema = z.object({
  hardestSubjects: z.array(z.string()).min(1, "Select at least one subject"),
  targetScore: z.number().min(0).max(100),
  studyTimePreference: z.string().min(1, "Select a study time preference"),
});

export async function PATCH(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = onboardingSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        hardestSubjects: validatedData.hardestSubjects,
        targetScore: validatedData.targetScore,
        studyTimePreference: validatedData.studyTimePreference,
        isOnboarded: true,
      },
    });

    // Create initial diagnostic session
    try {
      await prisma.practiceSession.create({
        data: {
          userId: updatedUser.id,
          type: "DIAGNOSTIC",
          status: "IN_PROGRESS",
          targetDuration: 20,
          interleaved: true,
        },
      });
    } catch (e) {
      console.error("Failed to create initial diagnostic session:", e);
      // Don't fail onboarding if session creation fails
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        isOnboarded: updatedUser.isOnboarded,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error during onboarding:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
