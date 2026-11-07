import postgres from "postgres";
import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/prajna";

async function runMigrations() {
  console.log("--------------------------------------------------");
  console.log("  PRAJNAA POSTGRESQL SCHEMA MIGRATION RUNNER");
  console.log("--------------------------------------------------");

  try {
    const parsed = new URL(connectionString);
    console.log(`Connecting to: ${parsed.protocol}//${parsed.username ? parsed.username + "@" : ""}${parsed.host}${parsed.pathname}`);
  } catch {
    console.log(`Connecting to configured DATABASE_URL...`);
  }

  const isSsl =
    connectionString.includes("sslmode=require") ||
    connectionString.includes(".neon.tech") ||
    process.env.DATABASE_SSL === "true";

  const sql = postgres(connectionString, {
    max: 1,
    ssl: isSsl ? "require" : undefined,
    connect_timeout: 20,
  });

  try {
    const drizzleDir = path.resolve(process.cwd(), "drizzle");
    const files = fs
      .readdirSync(drizzleDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    console.log(`Found ${files.length} SQL migration files in /drizzle:`);
    files.forEach((f) => console.log(`  • ${f}`));
    console.log("--------------------------------------------------");

    for (const file of files) {
      const filePath = path.join(drizzleDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf-8");
      console.log(`→ Executing migration: ${file}...`);
      await sql.unsafe(sqlContent);
      console.log(`✓ Applied: ${file}`);
    }

    console.log("--------------------------------------------------");
    console.log("✓ All PostgreSQL migrations executed successfully!");
    console.log("--------------------------------------------------");
  } catch (err: any) {
    console.error("\n[PostgreSQL Migration Error]:", err?.message || err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();

