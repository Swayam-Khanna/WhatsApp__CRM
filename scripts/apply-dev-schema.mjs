import postgres from "postgres";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const devUrl = process.env.NEON_TEST_BRANCH_URL || process.env.DATABASE_URL;
console.log("Applying schema to DEV branch endpoint:", new URL(devUrl).host);

const sql = postgres(devUrl, { ssl: "require", max: 1 });

async function run() {
  try {
    const sqlFilePath = path.join(process.cwd(), "drizzle", "phase2a_dev_migration.sql");
    const migrationSql = fs.readFileSync(sqlFilePath, "utf8");

    console.log("Executing migration SQL on DEV database...");
    await sql.unsafe(migrationSql);
    console.log("✓ Migration executed successfully!");

    // List all tables on DEV
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log("\n=================== DEV BRANCH TABLES ===================");
    console.log(`Total Tables: ${tables.length}`);
    tables.forEach((t, i) => console.log(`${String(i + 1).padStart(2, " ")}. ${t.table_name}`));

    // List all indexes on DEV for Phase 2 tables
    const indexes = await sql`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;
    console.log("\n=================== DEV BRANCH INDEXES ===================");
    console.log(`Total Indexes: ${indexes.length}`);
    indexes.forEach((idx, i) => console.log(`${String(i + 1).padStart(2, " ")}. ${idx.tablename} -> ${idx.indexname}`));

  } catch (err) {
    console.error("Migration error on DEV DB:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
