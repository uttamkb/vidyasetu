import { inngest } from "./client";
import { prisma } from "@/lib/db";
import { CurriculumResearcher } from "@/services/curriculum-researcher";
import { generateTopicContentPack, saveContentPack, isContentOutdated, LATEST_CONTENT_VERSION } from "@/services/content-curator";

// 0. Cron Job: Daily Subscription Expiry Check
// Marks subscriptions as EXPIRED when past their expiry date
export const dailySubscriptionExpiry = inngest.createFunction(
  { id: "daily-subscription-expiry", concurrency: 1 },
  { cron: "0 6 * * *" }, // Run daily at 6 AM
  async ({ step }) => {
    const expired = await step.run("mark-expired-subscriptions", async () => {
      const result = await prisma.user.updateMany({
        where: {
          subscriptionStatus: "ACTIVE",
          subscriptionExpiresAt: { lt: new Date() },
        },
        data: {
          subscriptionStatus: "EXPIRED",
          subscriptionPlan: "FREE",
        },
      });
      return result.count;
    });

    console.log(`[Inngest] Daily expiry check: ${expired} subscriptions marked as EXPIRED`);
    return { expired };
  }
);

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

    // B. Find topics without materials OR with outdated materials
    const topicsToSeed = await step.run("find-topics-needing-seed", async () => {
      const allTopics = await prisma.topic.findMany({
        select: { id: true, name: true, studyMaterials: true }
      });

      return allTopics.filter(topic => isContentOutdated(topic.studyMaterials))
        .map(t => ({ id: t.id, name: t.name }));
    });

    if (topicsToSeed.length > 0) {
      console.log(`[Inngest] Monthly Seeder: Found ${topicsToSeed.length} topics needing seed/refresh (Version: ${LATEST_CONTENT_VERSION}).`);
      await step.sendEvent(
        "dispatch-topic-seeders",
        topicsToSeed.map(topic => ({
          name: "app/topic.seed",
          data: { topicId: topic.id }
        }))
      );
    }

    return {
      message: "Monthly scan complete",
      subjectsQueued: emptySubjects.length,
      topicsQueued: topicsToSeed.length
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
      const { forceRefresh } = event.data;
      
      // Check if already populated and up-to-date
      const materials = await prisma.studyMaterial.findMany({
        where: { topicId }
      });

      const outdated = isContentOutdated(materials);

      if (materials.length > 0 && !outdated && !forceRefresh) {
        return { skipped: true, reason: "Topic already has up-to-date materials" };
      }

      if (outdated || forceRefresh) {
        console.log(`[Inngest] Refreshing content for topic ${topicId} (Force: ${!!forceRefresh}, Outdated: ${outdated})`);
      }

      const pack = await generateTopicContentPack(topicId);
      const saved = await saveContentPack(topicId, pack);
      
      return { success: true, saved };
    });

    return { topicId, result };
  }
);

// 4. Cron Job: Curation Engine (The Brain)
// Performs redundancy pruning and 3-month archival cleanup
export const curationEngine = inngest.createFunction(
  { id: "curation-engine", concurrency: 1 },
  { cron: "0 0 * * 0" }, // Every Sunday at midnight
  async ({ step }) => {
    await step.run("run-curation-cycle", async () => {
      const { runCurationCycle } = await import("@/services/curation-engine");
      await runCurationCycle();
    });
    return { success: true };
  }
);

// 5. Cron Job: Stale Generating Assignment Cleanup
// Cleans up assignments stuck in 'GENERATING' status for more than 15 minutes
export const cleanStaleGeneratingAssignments = inngest.createFunction(
  { id: "clean-stale-generating-assignments", concurrency: 1 },
  { cron: "*/15 * * * *" }, // Run every 15 minutes
  async ({ step }) => {
    const cleaned = await step.run("mark-stale-assignments-failed", async () => {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      const staleAssignments = await prisma.assignment.findMany({
        where: {
          status: "GENERATING",
          createdAt: { lt: fifteenMinutesAgo },
        },
        select: { id: true }
      });

      if (staleAssignments.length === 0) return 0;

      const ids = staleAssignments.map((a) => a.id);

      const result = await prisma.assignment.updateMany({
        where: {
          id: { in: ids }
        },
        data: {
          status: "FAILED"
        }
      });

      return result.count;
    });

    console.log(`[Inngest] Stale Generating Assignment Cleanup: Marked ${cleaned} assignments as FAILED`);
    return { cleaned };
  }
);

// 6. Cron Job: Self-Learning Question Bank Auto-Promotion
// Auto-promotes high-performing AI questions to the verified master question bank
export const autoPromoteAIQuestionsJob = inngest.createFunction(
  { id: "auto-promote-ai-questions", concurrency: 1 },
  { cron: "0 2 * * *" }, // Run every day at 2 AM
  async ({ step }) => {
    const promotedCount = await step.run("promote-questions", async () => {
      const { promoteHighPerformingQuestions } = await import("@/services/self-learning-service");
      return await promoteHighPerformingQuestions();
    });
    return { success: true, promotedCount };
  }
);

// 7. Cron Job: Retry DLQ'd Failed Evaluations
// Finds EVALUATION_FAILED tasks, re-dispatches evaluation events, then marks them RETRIED
export const retryFailedEvaluationsJob = inngest.createFunction(
  { id: "retry-failed-evaluations", concurrency: 1 },
  { cron: "0 3 * * *" }, // Run every day at 3 AM
  async ({ step }) => {
    const retried = await step.run("find-and-retry-dlq-tasks", async () => {
      const failedTasks = await prisma.task.findMany({
        where: {
          type: "EVALUATION_FAILED",
          status: "FAILED",
        },
        take: 50, // Cap at 50 per run to avoid queue flooding
        orderBy: { createdAt: "asc" }, // Oldest first
      });

      if (failedTasks.length === 0) return 0;

      const events = [];
      const taskIds = [];

      for (const task of failedTasks) {
        const payload = task.payload as any;
        if (!payload?.submissionId) continue;

        // Verify the submission still exists and is still IN_PROGRESS
        const sub = await prisma.submission.findUnique({
          where: { id: payload.submissionId },
          select: { status: true, userId: true },
        });

        if (!sub || sub.status === "EVALUATED") {
          // Already evaluated (student re-submitted manually) — mark task as resolved
          taskIds.push(task.id);
          continue;
        }

        // Re-dispatch evaluation event
        events.push({
          name: "app/submission.evaluate" as const,
          data: {
            submissionId: payload.submissionId,
            userId: sub.userId,
          },
        });
        taskIds.push(task.id);
      }

      // Dispatch all retry events
      if (events.length > 0) {
        await inngest.send(events);
      }

      // Mark all processed DLQ tasks as COMPLETED so they aren't retried again
      if (taskIds.length > 0) {
        await prisma.task.updateMany({
          where: { id: { in: taskIds } },
          data: { status: "COMPLETED" },
        });
      }

      return events.length;
    });

    console.log(`[Inngest] DLQ Retry: Re-dispatched ${retried} failed evaluations`);
    return { retried };
  }
);

// 8. Cron Job: AIValidation Table Archival
// Deletes self-learning feedback records older than 90 days to prevent table bloat.
export const archiveOldAIValidationsJob = inngest.createFunction(
  { id: "archive-old-ai-validations", concurrency: 1 },
  { cron: "0 4 1 * *" }, // Run at 4 AM on the 1st of every month
  async ({ step }) => {
    const deleted = await step.run("delete-old-validations", async () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const result = await prisma.aIValidation.deleteMany({
        where: {
          createdAt: { lt: ninetyDaysAgo },
        },
      });

      return result.count;
    });

    console.log(`[Inngest] AIValidation Archival: Deleted ${deleted} records older than 90 days`);
    return { deleted };
  }
);

// 9. On-Demand / Queue: Bootstrap Full Grade Curriculum
// Triggered by admin to seed the 5 standard CBSE subjects for a grade and initiate AI scanning
export const bootstrapGradeCurriculum = inngest.createFunction(
  { id: "bootstrap-grade-curriculum", concurrency: 1 },
  { event: "curriculum/bootstrap.grade" },
  async ({ event, step }) => {
    const { grade, board } = event.data;

    if (!grade || !board) {
      console.error("[Inngest] bootstrap-grade-curriculum: Missing grade or board in event data", event.data);
      return { error: "Missing grade or board" };
    }

    const seededSubjects = await step.run("seed-subjects", async () => {
      const cbseSubjects = [
        { name: "Mathematics",    color: "bg-blue-500",   icon: "Calculator" },
        { name: "Science",        color: "bg-green-500",  icon: "FlaskConical" },
        { name: "Social Science", color: "bg-amber-500",  icon: "Globe" },
        { name: "English",        color: "bg-purple-500", icon: "BookOpen" },
        { name: "Hindi",          color: "bg-rose-500",   icon: "Pen" },
      ];

      const results = [];
      for (const sub of cbseSubjects) {
        const subject = await prisma.subject.upsert({
          where: {
            name_grade_board: {
              name: sub.name,
              grade,
              board,
            },
          },
          update: {},
          create: {
            name: sub.name,
            color: sub.color,
            icon: sub.icon,
            grade,
            board,
          },
          select: { id: true, name: true },
        });
        results.push(subject);
      }
      return results;
    });

    if (seededSubjects.length > 0) {
      await step.sendEvent(
        "dispatch-subject-seeders",
        seededSubjects.map((subject) => ({
          name: "app/curriculum.seed",
          data: { subjectId: subject.id },
        }))
      );
    }

    return { grade, board, subjectsCount: seededSubjects.length };
  }
);
