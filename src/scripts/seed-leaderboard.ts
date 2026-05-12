import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log("No users found.");
    return;
  }

  const currentUser = users[0];
  console.log(`Opting in user: ${currentUser.name} (${currentUser.id})`);

  // Opt-in the user
  await prisma.user.update({
    where: { id: currentUser.id },
    data: { leaderboardOptIn: true },
  });

  // Create some fake leaderboard entries for this week
  const now = new Date();
  const year = now.getFullYear();
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1);
  const weekNum = Math.ceil(((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);
  const weekPeriod = `${year}-W${String(weekNum).padStart(2, "0")}`;

  console.log(`Seeding leaderboard for period: ${weekPeriod}`);

  // Create entries for several users to make it look "relevant"
  for (let i = 0; i < Math.min(users.length, 10); i++) {
    const user = users[i];
    const score = 50 + Math.floor(Math.random() * 50);
    
    await prisma.leaderboardEntry.upsert({
      where: {
        userId_period_periodType: {
          userId: user.id,
          period: weekPeriod,
          periodType: "WEEKLY",
        },
      },
      create: {
        userId: user.id,
        period: weekPeriod,
        periodType: "WEEKLY",
        totalScore: score,
        submissionCount: 1 + Math.floor(Math.random() * 5),
      },
      update: {
        totalScore: score,
        submissionCount: { increment: 1 },
      },
    });
  }

  console.log("Leaderboard seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
