/**
 * Content Seeder Service
 * 
 * Manages background seeding of study materials for topics.
 * Uses the Task table as a simple queue.
 */

import { prisma } from "@/lib/db";
import { generateTopicContentPack, saveContentPack } from "./content-curator";

export async function initiateSeeding() {
  // 1. Find all topics that don't have study notes yet
  const topics = await prisma.topic.findMany({
    where: {
      studyMaterials: {
        none: {
          type: "PLATFORM_CONTENT"
        }
      }
    },
    select: { id: true, name: true }
  });

  if (topics.length === 0) {
    return { message: "All topics already have study notes.", count: 0 };
  }

  // 2. Create a task for each topic if it doesn't already have one PENDING
  let createdCount = 0;
  for (const topic of topics) {
    const existing = await prisma.task.findFirst({
      where: {
        type: "SEED_STUDY_MATERIAL",
        status: "PENDING",
        payload: { path: ["topicId"], equals: topic.id }
      }
    });

    if (!existing) {
      await prisma.task.create({
        data: {
          type: "SEED_STUDY_MATERIAL",
          status: "PENDING",
          payload: { topicId: topic.id, topicName: topic.name },
          progress: 0
        }
      });
      createdCount++;
    }
  }

  return { message: `Queued ${createdCount} topics for seeding.`, count: createdCount };
}

export async function processNextTask() {
  // 1. Get the next pending task
  const task = await prisma.task.findFirst({
    where: { status: "PENDING", type: "SEED_STUDY_MATERIAL" },
    orderBy: { createdAt: "asc" }
  });

  if (!task) {
    return { message: "No pending seeding tasks." };
  }

  // 2. Mark as processing
  await prisma.task.update({
    where: { id: task.id },
    data: { status: "PROCESSING", updatedAt: new Date() }
  });

  const payload = task.payload as { topicId: string; topicName: string };

  try {
    // 3. Generate and save content
    console.log(`[Seeder] Seeding topic: ${payload.topicName} (${payload.topicId})`);
    const pack = await generateTopicContentPack(payload.topicId);
    await saveContentPack(payload.topicId, pack);

    // 4. Mark as completed
    await prisma.task.update({
      where: { id: task.id },
      data: { 
        status: "COMPLETED", 
        progress: 100, 
        updatedAt: new Date() 
      }
    });

    return { success: true, topicId: payload.topicId, topicName: payload.topicName };
  } catch (err) {
    console.error(`[Seeder] Failed to seed ${payload.topicName}:`, err);
    
    // 5. Mark as failed
    await prisma.task.update({
      where: { id: task.id },
      data: { 
        status: "FAILED", 
        error: err instanceof Error ? err.message : String(err),
        updatedAt: new Date() 
      }
    });

    return { success: false, error: err };
  }
}

export async function getSeederStatus() {
  const stats = await prisma.task.groupBy({
    by: ["status"],
    _count: true,
    where: { type: "SEED_STUDY_MATERIAL" }
  });

  const recentTasks = await prisma.task.findMany({
    where: { type: "SEED_STUDY_MATERIAL" },
    orderBy: { updatedAt: "desc" },
    take: 10
  });

  return {
    stats: stats.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count }), {} as Record<string, number>),
    recentTasks
  };
}
