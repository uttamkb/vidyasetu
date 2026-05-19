const { Client } = require('@neondatabase/serverless');

const client = new Client("postgresql://neondb_owner:npg_N3ZcA4SWzsIG@ep-plain-math-amxix52z-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require");

async function main() {
  console.log("Connecting directly to Neon database via WebSocket Client...");
  await client.connect();
  const res = await client.query('SELECT id, email, role, name, "isOnboarded" FROM "User"');
  console.log("=== DATABASE USERS ===");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch(console.error);
