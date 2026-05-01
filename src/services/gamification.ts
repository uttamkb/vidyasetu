import { prisma } from "@/lib/db";
import { User, Submission, PracticeSession } from "@prisma/client";

// Defines the shape of the parsed condition JSON string on the Badge model
export type BadgeCondition = 
  | { type: "first_submission" }
  | { type: "first_login" }
  | { type: "perfect_score" }
  | { type: "streak"; count: number }
  | { type: "subject_mastery"; subject: string; count: number; minScore: number }
  | { type: "all_subjects" }
  | { type: "fast_completion"; maxMinutes: number }
  | { type: "night_study"; afterHour: number }
  | { type: "morning_study"; beforeHour: number };

export interface GamificationEvent {
  userId: string;
  type: "LOGIN" | "SUBMISSION" | "SESSION_COMPLETED";
  data?: any; // E.g., submission details, session duration
}

export class GamificationService {
  /**
   * Processes an event and checks if any new badges or levels were earned.
   * Returns newly earned badges.
   */
  async processEvent(event: GamificationEvent) {
    const user = await prisma.user.findUnique({
      where: { id: event.userId },
      include: {
        userBadges: { select: { badgeId: true } },
      },
    });

    if (!user) return [];

    const existingBadgeIds = new Set(user.userBadges.map(ub => ub.badgeId));
    const allBadges = await prisma.badge.findMany();
    
    const unearnedBadges = allBadges.filter(b => !existingBadgeIds.has(b.id));
    const newlyEarned = [];
    
    let xpGained = 0;

    // Base XP for events
    if (event.type === "SUBMISSION") {
      xpGained += 50; // Base 50 XP for submission
      if (event.data?.score === event.data?.maxMarks) xpGained += 50; // Bonus for perfect score
    } else if (event.type === "SESSION_COMPLETED") {
      xpGained += 20; // XP for practice session
    }

    // Evaluate badges
    for (const badge of unearnedBadges) {
      const condition = JSON.parse(badge.condition) as BadgeCondition;
      const earned = await this.evaluateCondition(condition, event, user.id);
      
      if (earned) {
        newlyEarned.push(badge);
        xpGained += badge.points;
      }
    }

    // Assign newly earned badges
    if (newlyEarned.length > 0) {
      await prisma.userBadge.createMany({
        data: newlyEarned.map(badge => ({
          userId: user.id,
          badgeId: badge.id,
        })),
      });
    }

    // Update User XP and Level
    if (xpGained > 0) {
      const newXp = user.xp + xpGained;
      const newLevel = this.calculateLevel(newXp);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { xp: newXp, level: newLevel },
      });
    }

    return newlyEarned;
  }

  private calculateLevel(xp: number): string {
    if (xp >= 5000) return "Board Ready";
    if (xp >= 2000) return "Topper";
    if (xp >= 500) return "Scholar";
    return "Beginner";
  }

  private async evaluateCondition(condition: BadgeCondition, event: GamificationEvent, userId: string): Promise<boolean> {
    switch (condition.type) {
      case "first_login":
        return event.type === "LOGIN";

      case "first_submission":
        return event.type === "SUBMISSION";

      case "perfect_score":
        if (event.type === "SUBMISSION" && event.data) {
          return event.data.score === event.data.maxMarks;
        }
        return false;

      case "streak":
        // Requires fetching the current streak from StudyStreak model
        const streak = await prisma.studyStreak.findUnique({ where: { userId } });
        return (streak?.currentStreak || 0) >= condition.count;

      case "subject_mastery": {
        if (event.type !== "SUBMISSION") return false;
        // Find if user has `count` submissions in `subject` with score >= `minScore`
        const submissions = await prisma.submission.count({
          where: {
            userId,
            assignment: { subject: { name: condition.subject } },
          }
        });
        // Simplification: just counting submissions for now, actual score threshold would require raw query or fetching.
        // Let's do a robust check:
        const highScoringSubmissions = await prisma.submission.findMany({
          where: {
            userId,
            assignment: { subject: { name: condition.subject } },
          },
          select: { score: true, maxMarks: true }
        });
        const passedCount = highScoringSubmissions.filter(s => (s.score / s.maxMarks) * 100 >= condition.minScore).length;
        return passedCount >= condition.count;
      }

      case "all_subjects": {
        if (event.type !== "SUBMISSION") return false;
        const subjectsWithSubmissions = await prisma.submission.groupBy({
          by: ['assignmentId'],
          where: { userId },
        });
        // Just a simplification. To properly check 5 subjects we need a join.
        const subjectIds = await prisma.submission.findMany({
          where: { userId },
          select: { assignment: { select: { subjectId: true } } }
        });
        const uniqueSubjects = new Set(subjectIds.map(s => s.assignment.subjectId));
        return uniqueSubjects.size >= 5;
      }

      case "fast_completion": {
        if (event.type !== "SUBMISSION" || !event.data?.timeTaken) return false;
        // timeTaken is typically in seconds
        return event.data.timeTaken <= condition.maxMinutes * 60;
      }

      case "night_study":
      case "morning_study": {
        // Evaluate based on current time
        const hour = new Date().getHours();
        if (condition.type === "night_study") return hour >= condition.afterHour;
        if (condition.type === "morning_study") return hour <= condition.beforeHour;
        return false;
      }

      default:
        return false;
    }
  }
}

export const gamificationService = new GamificationService();
