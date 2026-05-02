/**
 * Recommendation Engine Service
 *
 * Analyzes UserMastery to:
 * 1. Identify weak subtopics (mastery < 50)
 * 2. Respect chapter prerequisite ordering
 * 3. Suggest study materials for weak topics
 * 4. Generate remedial assignments targeting weak areas
 */

import { prisma } from "@/lib/db";

export interface Recommendation {
  type: "STUDY_MATERIAL" | "REMEDIAL_ASSIGNMENT" | "TOPIC_REVIEW";
  priority: "HIGH" | "MEDIUM" | "LOW";
  subtopicId: string;
  subtopicName: string;
  topicName: string;
  chapterName: string;
  subjectName: string;
  masteryScore: number;
  reason: string;
  action: string;
}

const WEAK_THRESHOLD = 50;
const REMEDIAL_THRESHOLD = 30;

// ─────────────────────────────────────────────────────────
// Main: Get Personalized Recommendations
// ─────────────────────────────────────────────────────────

export async function getRecommendations(
  userId: string,
  limit = 6
): Promise<Recommendation[]> {
  // 1. Get all UserMastery rows for the user
  const masteryRows = await prisma.userMastery.findMany({
    where: { userId },
    include: {
      subtopic: {
        include: {
          topic: {
            include: {
              chapter: {
                include: { subject: true },
              },
            },
          },
        },
      },
    },
    orderBy: { masteryScore: "asc" }, // weakest first
  });

  const recommendations: Recommendation[] = [];

  for (const mastery of masteryRows) {
    if (recommendations.length >= limit) break;
    if (mastery.masteryScore >= WEAK_THRESHOLD) continue; // skip strong topics

    const { subtopic } = mastery;
    const topic = subtopic.topic;
    const chapter = topic.chapter;
    const subject = chapter.subject;

    const priority =
      mastery.masteryScore < REMEDIAL_THRESHOLD
        ? "HIGH"
        : mastery.masteryScore < WEAK_THRESHOLD
        ? "MEDIUM"
        : "LOW";

    const reason =
      mastery.masteryScore < REMEDIAL_THRESHOLD
        ? `Low mastery (${Math.round(mastery.masteryScore)}%) — needs remediation`
        : `Below target mastery (${Math.round(mastery.masteryScore)}%) — needs review`;

    // Check if there are study materials available for this topic
    const materialsCount = await prisma.studyMaterial.count({
      where: { topicId: topic.id, isPublished: true },
    });

    if (materialsCount > 0) {
      recommendations.push({
        type: "STUDY_MATERIAL",
        priority,
        subtopicId: subtopic.id,
        subtopicName: subtopic.name,
        topicName: topic.name,
        chapterName: chapter.name,
        subjectName: subject.name,
        masteryScore: Math.round(mastery.masteryScore),
        reason,
        action: `Study materials available for ${topic.name}`,
      });
    }

    if (mastery.masteryScore < REMEDIAL_THRESHOLD) {
      recommendations.push({
        type: "REMEDIAL_ASSIGNMENT",
        priority: "HIGH",
        subtopicId: subtopic.id,
        subtopicName: subtopic.name,
        topicName: topic.name,
        chapterName: chapter.name,
        subjectName: subject.name,
        masteryScore: Math.round(mastery.masteryScore),
        reason: `Very low mastery (${Math.round(mastery.masteryScore)}%) — practice more`,
        action: `Generate a remedial test on ${subtopic.name}`,
      });
    }
  }

  // Sort: HIGH priority first
  return recommendations.sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return order[a.priority] - order[b.priority];
  });
}

// ─────────────────────────────────────────────────────────
// Get "Next Up" summary for dashboard widget
// ─────────────────────────────────────────────────────────

export async function getNextUpSummary(userId: string) {
  const recommendations = await getRecommendations(userId, 3);

  const weakSubjects = await prisma.userMastery.groupBy({
    by: ["subtopicId"],
    where: {
      userId,
      masteryScore: { lt: WEAK_THRESHOLD },
    },
    _avg: { masteryScore: true },
    orderBy: { _avg: { masteryScore: "asc" } },
    take: 5,
  });

  const strongSubtopics = await prisma.userMastery.findMany({
    where: { userId, masteryScore: { gte: 70 } },
    orderBy: { masteryScore: "desc" },
    take: 3,
    include: { subtopic: { include: { topic: { include: { chapter: { include: { subject: true } } } } } } },
  });

  return {
    recommendations,
    weakAreaCount: weakSubjects.length,
    strongAreas: strongSubtopics.map((m) => ({
      name: m.subtopic.name,
      subject: m.subtopic.topic.chapter.subject.name,
      masteryScore: Math.round(m.masteryScore),
    })),
  };
}

// ─────────────────────────────────────────────────────────
// Generate Remedial Assignment for a weak subtopic
// ─────────────────────────────────────────────────────────

export async function generateRemedialAssignment(
  userId: string,
  subtopicId: string
) {
  const subtopic = await prisma.subtopic.findUniqueOrThrow({
    where: { id: subtopicId },
    include: {
      topic: {
        include: {
          chapter: {
            include: { subject: true },
          },
        },
      },
    },
  });

  const { generateAssignment } = await import("./assignment-generator");

  const assignment = await generateAssignment({
    userId,
    subjectId: subtopic.topic.chapter.subject.id,
    type: "REMEDIAL",
    difficulty: "EASY", // start easy for remediation
    chapterId: subtopic.topic.chapter.id,
    topicIds: [subtopic.topic.id],
    questionCount: 5,
  });

  return assignment;
}
