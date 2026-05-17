const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");

async function main() {
  console.log("--- Auth Debug Report ---");
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not found in environment.");
    return;
  }

  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
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
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => console.error(e));
