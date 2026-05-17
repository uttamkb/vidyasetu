/**
 * clean-auth.ts — Wipes all users, accounts, and sessions from the database.
 * Run with: npx tsx scripts/clean-auth.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env.local");
  process.exit(1);
}

async function main() {
  const sql = neon(DATABASE_URL!);

  console.log("🗑️  Cleaning auth tables...");

  await sql`TRUNCATE TABLE "accounts", "sessions", "users" CASCADE`;

  console.log("✅ Done! All users, accounts, and sessions have been removed.");
  console.log("   You can now sign in fresh with Google.");
}

main().catch((e) => {
  console.error("❌ Failed:", e);
  process.exit(1);
});
