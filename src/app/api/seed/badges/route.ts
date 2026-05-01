import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const badges = [
  {
    name: "First Steps",
    description: "Completed your first assignment on VidyaSetu",
    icon: "🎯",
    category: "FIRST_STEPS",
    condition: JSON.stringify({ type: "first_submission" }),
    points: 10,
  },
  {
    name: "Quick Starter",
    description: "Logged in for the first time",
    icon: "🚀",
    category: "FIRST_STEPS",
    condition: JSON.stringify({ type: "first_login" }),
    points: 5,
  },
  {
    name: "Perfect Score",
    description: "Scored 100% on an assignment",
    icon: "⭐",
    category: "MASTERY",
    condition: JSON.stringify({ type: "perfect_score" }),
    points: 25,
  },
  {
    name: "3-Day Streak",
    description: "Studied for 3 consecutive days",
    icon: "🔥",
    category: "CONSISTENCY",
    condition: JSON.stringify({ type: "streak", count: 3 }),
    points: 15,
  },
  {
    name: "7-Day Streak",
    description: "Studied for 7 consecutive days",
    icon: "🔥🔥",
    category: "CONSISTENCY",
    condition: JSON.stringify({ type: "streak", count: 7 }),
    points: 30,
  },
  {
    name: "30-Day Streak",
    description: "Studied for 30 consecutive days",
    icon: "🔥🔥🔥",
    category: "CONSISTENCY",
    condition: JSON.stringify({ type: "streak", count: 30 }),
    points: 100,
  },
  {
    name: "Math Whiz",
    description: "Scored above 90% in 5 Math assignments",
    icon: "🧮",
    category: "MASTERY",
    condition: JSON.stringify({ type: "subject_mastery", subject: "Math", count: 5, minScore: 90 }),
    points: 50,
  },
  {
    name: "Science Star",
    description: "Scored above 90% in 5 Science assignments",
    icon: "🔬",
    category: "MASTERY",
    condition: JSON.stringify({ type: "subject_mastery", subject: "Science", count: 5, minScore: 90 }),
    points: 50,
  },
  {
    name: "All-Rounder",
    description: "Completed at least one assignment in all 5 subjects",
    icon: "🏆",
    category: "MASTERY",
    condition: JSON.stringify({ type: "all_subjects" }),
    points: 40,
  },
  {
    name: "Quick Thinker",
    description: "Completed an assignment in under 10 minutes",
    icon: "⚡",
    category: "SPEED",
    condition: JSON.stringify({ type: "fast_completion", maxMinutes: 10 }),
    points: 20,
  },
  {
    name: "Night Owl",
    description: "Studied after 9 PM",
    icon: "🦉",
    category: "SPECIAL",
    condition: JSON.stringify({ type: "night_study", afterHour: 21 }),
    points: 10,
  },
  {
    name: "Early Bird",
    description: "Studied before 7 AM",
    icon: "🐦",
    category: "SPECIAL",
    condition: JSON.stringify({ type: "morning_study", beforeHour: 7 }),
    points: 10,
  },
];

export async function POST(request: NextRequest) {
  try {
    for (const badge of badges) {
      await prisma.badge.upsert({
        where: { name: badge.name },
        update: badge,
        create: badge,
      });
    }

    return NextResponse.json({ message: `✅ Seeded ${badges.length} badges` });
  } catch (error) {
    console.error("Error seeding badges:", error);
    return NextResponse.json(
      { error: "Failed to seed badges" },
      { status: 500 }
    );
  }
}
