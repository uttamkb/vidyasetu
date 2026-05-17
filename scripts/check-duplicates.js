/**
 * check-duplicates.js — Checks for duplicate subjects in the DB.
 */

const path = require("path");
const fs = require("fs");

// Manually load .env.local
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env.local");
  process.exit(1);
}

const postgres = require("postgres");

async function main() {
  console.log("🔍 Connecting to database...");
  const sql = postgres(DATABASE_URL, { ssl: "require", max: 1 });

  try {
    const results = await sql`
      SELECT name, COUNT(*) as count 
      FROM "Subject" 
      GROUP BY name 
      HAVING COUNT(*) > 1
    `;

    if (results.length === 0) {
      console.log("✅ No duplicate subject names found in the DB.");
    } else {
      console.log("⚠️ Found duplicate subject names:");
      console.table(results);
      
      for (const item of results) {
        const rows = await sql`SELECT id, name FROM "Subject" WHERE name = ${item.name}`;
        console.log(`\nDuplicates for "${item.name}":`);
        console.table(rows);
      }
    }
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error("❌ Failed:", e.message || e);
  process.exit(1);
});
