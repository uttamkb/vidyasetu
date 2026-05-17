const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");

const connectionString = process.env.DATABASE_URL;

async function main() {
  if (!connectionString) {
    console.error("DATABASE_URL not found.");
    return;
  }

  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log("--- Auth Purge Started (JS) ---");
  
  try {
    const accounts = await prisma.account.deleteMany();
    console.log(`Deleted ${accounts.count} accounts.`);
    
    const sessions = await prisma.session.deleteMany();
    console.log(`Deleted ${sessions.count} sessions.`);
    
    const users = await prisma.user.deleteMany();
    console.log(`Deleted ${users.count} users.`);
    
    console.log("--- Auth Purge Completed Successfully ---");
  } catch (err) {
    console.error("Purge Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => console.error(e));
