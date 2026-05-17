import { PrismaClient } from "@prisma/client";

/**
 * Utility script to promote/demote a user's role.
 * Usage:
 *   npx ts-node src/scripts/promote-admin.ts <email> [--role ADMIN|SUPER_ADMIN]
 *   npx ts-node src/scripts/promote-admin.ts <email> --demote
 */
async function main() {
  const prisma = new PrismaClient();
  const args = process.argv.slice(2);
  const email = args[0];
  const roleFlag = args.find((a) => a.startsWith("--role="))?.split("=")[1];
  const isDemote = args.includes("--demote");

  if (!email || email.startsWith("--")) {
    console.error("❌ Error: Please provide a user email.");
    console.log("Usage:");
    console.log("  Promote:  npx ts-node src/scripts/promote-admin.ts user@example.com --role=ADMIN");
    console.log("  Promote:  npx ts-node src/scripts/promote-admin.ts user@example.com --role=SUPER_ADMIN");
    console.log("  Demote:   npx ts-node src/scripts/promote-admin.ts user@example.com --demote");
    process.exit(1);
  }

  const targetRole = isDemote ? "STUDENT" : (roleFlag ?? "ADMIN") as "STUDENT" | "ADMIN" | "SUPER_ADMIN";

  // Prevent demoting the owner
  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
  if (isDemote && ownerEmail && email.toLowerCase().trim() === ownerEmail) {
    console.error("❌ Error: Cannot demote the OWNER_EMAIL user. This would lock you out.");
    process.exit(1);
  }

  try {
    const before = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { email: true, role: true },
    });

    if (!before) {
      console.error(`❌ Error: User with email ${email} not found.`);
      process.exit(1);
    }

    const user = await prisma.user.update({
      where: { email: email.toLowerCase().trim() },
      data: { role: targetRole },
    });

    console.log(`✅ Success: User ${user.email} role changed from ${before.role} → ${user.role}.`);
  } catch (error) {
    console.error(`❌ Error: Failed to update user ${email}.`, error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
