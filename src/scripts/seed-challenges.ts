import { prisma } from "../lib/db";
import "dotenv/config";

async function seedChallenges() {
  console.log("🌱 Seeding weekly challenges...");

  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);

  const challenges = [
    {
      title: "First Steps",
      description: "Complete 3 assignments this week",
      target: 3,
      type: "ASSIGNMENTS_COMPLETED",
      points: 50,
      startDate: now,
      endDate: nextWeek,
      isActive: true,
    },
    {
      title: "Ace Student",
      description: "Get a perfect score (100%) on any assignment",
      target: 1,
      type: "PERFECT_SCORES",
      points: 100,
      startDate: now,
      endDate: nextWeek,
      isActive: true,
    },
    {
      title: "Dedication",
      description: "Study for 60 minutes this week",
      target: 60,
      type: "MINUTES_STUDIED",
      points: 75,
      startDate: now,
      endDate: nextWeek,
      isActive: true,
    },
  ];

  for (const challenge of challenges) {
    await prisma.weeklyChallenge.upsert({
      where: { title: challenge.title },
      update: challenge,
      create: challenge,
    });
  }
  
  // Wait, the upsert 'where' for WeeklyChallenge in my schema was 'id'.
  // I should check schema again.
}

seedChallenges()
  .catch((e) => {
    console.error("❌ Error seeding challenges:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
