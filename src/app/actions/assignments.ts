"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function archiveAssignment(assignmentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Add the assignmentId to the user's archivedAssignments array
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      archivedAssignments: {
        push: assignmentId,
      },
    },
  });

  revalidatePath("/assignments");
  revalidatePath("/dashboard");
}
