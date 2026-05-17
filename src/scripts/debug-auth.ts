import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Auth Debug Report ---");
  
  const users = await prisma.user.findMany({
    include: { accounts: true }
  });
  
  console.log(`Total Users: ${users.length}`);
  
  users.forEach(u => {
    console.log(`User: ${u.email} | ID: ${u.id} | Accounts: ${u.accounts.length}`);
    u.accounts.forEach(a => {
      console.log(`  - Account: ${a.provider} | ProviderID: ${a.providerAccountId}`);
    });
  });

  const accounts = await prisma.account.findMany();
  console.log(`\nTotal Accounts: ${accounts.length}`);
  
  const emails = users.map(u => u.email);
  const duplicates = emails.filter((item, index) => emails.indexOf(item) !== index);
  if (duplicates.length > 0) {
    console.log(`\nDUPLICATE EMAILS DETECTED: ${duplicates.join(", ")}`);
  } else {
    console.log("\nNo duplicate emails detected.");
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
