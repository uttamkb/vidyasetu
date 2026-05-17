import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding schools...");

  const schools = [
    { name: "Kendriya Vidyalaya No. 1", state: "Karnataka", district: "Bengaluru", board: "CBSE" },
    { name: "Delhi Public School", state: "Delhi", district: "New Delhi", board: "CBSE" },
    { name: "Vydehi School of Excellence", state: "Karnataka", district: "Bengaluru", board: "CBSE" },
  ];

  for (const school of schools) {
    await prisma.school.upsert({
      where: { id: "DUMMY_ID" }, // We don't have a unique constraint on name yet, so we just use create or a dummy check
      update: {},
      create: school,
    });
  }

  // Also update existing students to belong to one of these schools
  const students = await prisma.user.findMany({ where: { role: "STUDENT" } });
  const firstSchool = await prisma.school.findFirst();
  
  if (students.length > 0 && firstSchool) {
    await prisma.user.updateMany({
      where: { role: "STUDENT" },
      data: { schoolId: firstSchool.id }
    });
    console.log(`✅ Linked ${students.length} students to ${firstSchool.name}`);
  }

  console.log("✅ School seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
