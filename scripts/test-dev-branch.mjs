import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.NEON_TEST_BRANCH_URL || process.env.DATABASE_URL;
const sql = postgres(url, { ssl: "require", max: 1 });

async function run() {
  try {
    const fks = await sql`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'farmer_products';
    `;
    console.log("farmer_products FKs:", fks);

    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'farmer_products';
    `;
    console.log("farmer_products columns:", cols.map(c => `${c.column_name}: ${c.data_type}`));
  } catch (err) {
    console.error("DB error:", err.message);
  } finally {
    await sql.end();
  }
}

run();
