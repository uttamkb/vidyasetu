import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();

    if (!["FREE", "PRO"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        subscriptionPlan: plan,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: plan === "PRO" 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
          : null,
      },
    });

    return NextResponse.json({ 
      success: true, 
      plan: updatedUser.subscriptionPlan,
      status: updatedUser.subscriptionStatus 
    });
  } catch (error) {
    console.error("[SubscriptionAPI] Error updating plan:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
