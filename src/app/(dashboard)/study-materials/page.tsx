import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { CurriculumBrowser } from "./curriculum-browser";

async function getSubjectsForUser(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { grade: true, board: true },
  });

  const subjects = await prisma.subject.findMany({
    where: { grade: user.grade, board: user.board },
    select: {
      id: true,
      name: true,
      color: true,
      icon: true,
      grade: true,
      board: true,
    },
    orderBy: { orderIndex: "asc" },
  });

  return subjects;
}

export default async function StudyMaterialsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const subjects = await getSubjectsForUser(session.user.id);

  return <CurriculumBrowser subjects={subjects} />;
}
