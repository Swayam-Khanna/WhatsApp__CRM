import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("No DATABASE_URL set");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", max: 1 });

async function run() {
  try {
    const res = await sql`SELECT current_database(), current_user, version()`;
    console.log("Connected successfully:", res[0]);

    // Check existing tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log("Existing tables in public schema:", tables.map(t => t.table_name));

    // Verify foreign keys to auth
    const authFks = await sql`
      SELECT tc.constraint_name, tc.table_name, ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'auth';
    `;
    console.log("Foreign keys referencing auth schema:", authFks);

    // Check database size
    const size = await sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as db_size;
    `;
    console.log("Database size:", size[0].db_size);
  } catch (err) {
    console.error("DB error:", err.message);
  } finally {
    await sql.end();
  }
}

run();
