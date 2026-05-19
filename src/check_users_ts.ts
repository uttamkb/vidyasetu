import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { prisma } from "./lib/db";

async function main() {
  console.log("Querying database with loaded environment variables...");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
    }
  });
  console.log("=== DATABASE USERS ===");
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
