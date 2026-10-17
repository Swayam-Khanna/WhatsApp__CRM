import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const devUrl = process.env.NEON_TEST_BRANCH_URL || process.env.DATABASE_URL;
const sql = postgres(devUrl, { ssl: "require", max: 1 });

async function run() {
  try {
    const checks = await sql`
      SELECT c.conname, r.relname, pg_get_constraintdef(c.oid) as def 
      FROM pg_constraint c 
      JOIN pg_class r ON c.conrelid = r.oid 
      WHERE c.contype = 'c' AND r.relnamespace = 'public'::regnamespace 
      ORDER BY r.relname, c.conname;
    `;
    console.log("\n=================== DEV BRANCH CHECK CONSTRAINTS ===================");
    checks.forEach(c => console.log(` - ${c.relname}.${c.conname}: ${c.def}`));

    const timestamps = await sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name IN ('orders', 'order_items', 'order_shipments', 'order_status_logs', 'payment_webhook_events', 'file_uploads', 'product_variants', 'product_inventory', 'stock_history', 'shipping_slabs')
        AND data_type LIKE '%timestamp%'
      ORDER BY table_name, column_name;
    `;
    console.log("\n=================== TIMESTAMP TYPES ON PHASE 2 TABLES ===================");
    timestamps.forEach(t => console.log(` - ${t.table_name}.${t.column_name}: ${t.data_type}`));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await sql.end();
  }
}

run();
