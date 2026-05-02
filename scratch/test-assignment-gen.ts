import { generateAssignment } from "../src/services/assignment-generator";
import { prisma } from "../src/lib/db";

async function run() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error("No user found");
    
    const subject = await prisma.subject.findFirst({
      where: { name: "Mathematics" },
      include: { chapters: true }
    });
    if (!subject) throw new Error("No Mathematics subject found");
    
    const chapterId = subject.chapters[0]?.id;
    if (!chapterId) throw new Error("No chapters found in Mathematics");

    console.log("Generating assignment for chapter:", chapterId);

    const result = await generateAssignment({
      userId: user.id,
      subjectId: subject.id,
      type: "CHAPTER", // the enum might be different. Let me check the exact enum.
      difficulty: "EASY",
      chapterId: chapterId,
      questionCount: 5
    });

    console.log("Assignment generated successfully!", result.assignment.id);
  } catch (err) {
    console.error("Failed:", err);
  }
}
run();
