import postgres from "postgres";
import dotenv from "dotenv";
import fs from "fs";

// Load from .env and .env.local
dotenv.config({ path: ".env" });
if (fs.existsSync(".env.local")) {
  const localConfig = dotenv.parse(fs.readFileSync(".env.local"));
  for (const [k, v] of Object.entries(localConfig)) {
    if (!process.env[k]) process.env[k] = v;
  }
}

const oldUrl = process.env.OLD_DATABASE_URL;

if (!oldUrl) {
  console.error("Error: OLD_DATABASE_URL is not set in .env or .env.local.");
  process.exit(1);
}

const sql = postgres(oldUrl, { ssl: "require", max: 1 });

async function verifyOldDb() {
  try {
    console.log("Connecting to old Supabase database...");
    const dbInfo = await sql`SELECT current_database(), current_user, version()`;
    console.log("Connected successfully to old database:", dbInfo[0].current_database);

    const sizeRes = await sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as total_size,
             pg_size_pretty(COALESCE(sum(pg_total_relation_size(c.oid)), 0)) as public_size
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public';
    `;
    console.log(`Database Size: Total = ${sizeRes[0].total_size}, Public Schema = ${sizeRes[0].public_size}`);

    const tables = await sql`
      SELECT relname as table_name, n_live_tup as row_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY relname;
    `;

    console.log("\n=======================================================");
    console.log("       OLD SUPABASE DATABASE: TABLE ROW COUNTS         ");
    console.log("=======================================================");
    if (tables.length === 0) {
      console.log("No tables found in public schema.");
    } else {
      console.log("Table Name".padEnd(35) + "Row Count".padEnd(15));
      console.log("-------------------------------------------------------");
      for (const t of tables) {
        // Also do exact COUNT(*) to guarantee accuracy beyond pg_stat approximations
        const exactCount = await sql`SELECT COUNT(*)::int as count FROM ${sql(t.table_name)}`;
        console.log(t.table_name.padEnd(35) + String(exactCount[0].count).padEnd(15));
      }
    }
    console.log("=======================================================\n");
  } catch (err) {
    console.error("Error querying old database:", err.message);
  } finally {
    await sql.end();
  }
}

verifyOldDb();
