import { PrismaClient } from "@prisma/client";

/**
 * Utility script to promote a user to ADMIN role.
 * Usage: npx ts-node src/scripts/promote-admin.ts <email>
 */
async function main() {
  const prisma = new PrismaClient();
  const email = process.argv[2];

  if (!email) {
    console.error("❌ Error: Please provide a user email.");
    console.log("Usage: npx ts-node src/scripts/promote-admin.ts student@example.com");
    process.exit(1);
  }

  try {
    const user = await prisma.user.update({
      where: { email: email.toLowerCase().trim() },
      data: { role: "ADMIN" },
    });

    console.log(`✅ Success: User ${user.email} has been promoted to ADMIN.`);
  } catch (error) {
    console.error(`❌ Error: User with email ${email} not found.`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
