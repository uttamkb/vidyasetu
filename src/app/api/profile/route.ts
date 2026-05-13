import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  grade: z.string().min(1, "Grade is required"),
  board: z.string().min(1, "Board is required"),
  image: z.string().optional().nullable(),
  leaderboardOptIn: z.boolean().optional(),
  state: z.string().min(1, "State is required").max(100),
  district: z.string().max(100).optional().nullable(),
  school: z.string().max(200).optional().nullable(),
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
    const validatedData = updateProfileSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: validatedData.name,
        grade: validatedData.grade,
        board: validatedData.board,
        image: validatedData.image,
        leaderboardOptIn: validatedData.leaderboardOptIn,
        state: validatedData.state,
        district: validatedData.district,
        school: validatedData.school,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        grade: updatedUser.grade,
        board: updatedUser.board,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid data" },
        { status: 400 }
      );
    }
    
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
