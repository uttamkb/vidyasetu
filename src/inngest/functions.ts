import { inngest } from "./client";
import { prisma } from "@/lib/db";
import { CurriculumResearcher } from "@/services/curriculum-researcher";
import { generateTopicContentPack, saveContentPack } from "@/services/content-curator";

// 1. Cron Job: Monthly Seeder Scan
// Scans for empty subjects and topics, then dispatches individual seed events
export const monthlySeeder = inngest.createFunction(
  { id: "monthly-seeder", concurrency: 1 },
  { cron: "0 0 1 * *" }, // Run at midnight on the 1st of every month
  async ({ step }) => {
    // A. Find empty subjects
    const emptySubjects = await step.run("find-empty-subjects", async () => {
      return prisma.subject.findMany({
        where: { chapters: { none: {} } },
        select: { id: true, name: true, grade: true, board: true }
      });
    });

    if (emptySubjects.length > 0) {
      console.log(`[Inngest] Monthly Seeder: Found ${emptySubjects.length} empty subjects. Queuing seeders...`);
      await step.sendEvent(
        "dispatch-subject-seeders",
        emptySubjects.map(subject => ({
          name: "app/curriculum.seed",
          data: { subjectId: subject.id }
        }))
      );
    }

    // B. Find topics without materials
    const emptyTopics = await step.run("find-empty-topics", async () => {
      return prisma.topic.findMany({
        where: { studyMaterials: { none: {} } },
        select: { id: true, name: true }
      });
    });

    if (emptyTopics.length > 0) {
      await step.sendEvent(
        "dispatch-topic-seeders",
        emptyTopics.map(topic => ({
          name: "app/topic.seed",
          data: { topicId: topic.id }
        }))
      );
    }

    return {
      message: "Monthly scan complete",
      subjectsQueued: emptySubjects.length,
      topicsQueued: emptyTopics.length
    };
  }
);

// 2. On-Demand / Queue: Seed Curriculum Structure
// Uses Gemini to generate chapters and topics for a subject
export const seedCurriculumStructure = inngest.createFunction(
  { id: "seed-curriculum-structure", concurrency: { limit: 2 } },
  { event: "app/curriculum.seed" },
  async ({ event, step }) => {
    const { subjectId } = event.data;

    if (!subjectId) {
      console.error("[Inngest] seed-curriculum-structure: Missing subjectId in event data", event.data);
      return { error: "Missing subjectId" };
    }

    await step.run("generate-curriculum", async () => {
      // Check if it was already generated to be idempotent
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        include: { chapters: true }
      });

      if (!subject || subject.chapters.length > 0) {
        return { skipped: true, reason: "Subject not found or already populated" };
      }

      await CurriculumResearcher.generateCurriculumStructure(subjectId);
      return { success: true };
    });

    return { subjectId, status: "completed" };
  }
);

// 3. On-Demand / Queue: Seed Topic Content
// Uses Gemini to generate Smart Notes and YouTube links
export const seedTopicContent = inngest.createFunction(
  { id: "seed-topic-content", concurrency: { limit: 5 } },
  { event: "app/topic.seed" },
  async ({ event, step }) => {
    const { topicId } = event.data;

    if (!topicId) {
      console.error("[Inngest] seed-topic-content: Missing topicId in event data", event.data);
      return { error: "Missing topicId" };
    }

    const result = await step.run("generate-and-save-content", async () => {
      // Check if already populated to ensure idempotency
      const materials = await prisma.studyMaterial.findMany({
        where: { topicId }
      });

      if (materials.length > 0) {
        return { skipped: true, reason: "Topic already has materials" };
      }

      const pack = await generateTopicContentPack(topicId);
      const saved = await saveContentPack(topicId, pack);
      
      return { success: true, saved };
    });

    return { topicId, result };
  }
);
