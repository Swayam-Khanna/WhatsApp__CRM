import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const devUrl = process.env.NEON_TEST_BRANCH_URL || process.env.DATABASE_URL;
console.log("Restoring gateway columns & payment_webhook_events to DEV endpoint:", new URL(devUrl).host);

const sql = postgres(devUrl, { ssl: "require", max: 1 });

async function run() {
  try {
    // 1. Update order_payment_method enum to ('cod', 'whatsapp', 'razorpay', 'cashfree')
    await sql`
      ALTER TABLE "public"."orders" 
        ALTER COLUMN "payment_method" DROP DEFAULT,
        ALTER COLUMN "payment_method" TYPE text;
    `;
    await sql`DROP TYPE IF EXISTS "public"."order_payment_method" CASCADE;`;
    await sql`CREATE TYPE "public"."order_payment_method" AS ENUM ('cod', 'whatsapp', 'razorpay', 'cashfree');`;
    await sql`
      ALTER TABLE "public"."orders" 
        ALTER COLUMN "payment_method" TYPE "public"."order_payment_method" 
        USING ("payment_method"::"public"."order_payment_method");
    `;
    console.log("✓ Restored order_payment_method enum to ('cod', 'whatsapp', 'razorpay', 'cashfree')");

    // 2. Add back gateway columns to orders
    await sql`
      ALTER TABLE "public"."orders"
        ADD COLUMN IF NOT EXISTS "razorpay_order_id" text UNIQUE,
        ADD COLUMN IF NOT EXISTS "razorpay_payment_id" text,
        ADD COLUMN IF NOT EXISTS "razorpay_signature" text,
        ADD COLUMN IF NOT EXISTS "cashfree_order_id" text;
    `;
    console.log("✓ Restored razorpay_* and cashfree_* columns in orders table");

    // 3. Re-create payment_webhook_events table
    await sql`
      CREATE TABLE IF NOT EXISTS "public"."payment_webhook_events" (
        "id" text PRIMARY KEY NOT NULL,
        "event_id" text NOT NULL UNIQUE,
        "gateway" text NOT NULL,
        "event_type" text NOT NULL,
        "order_id" text,
        "raw_body_sha256" text NOT NULL,
        "payload" jsonb NOT NULL,
        "status" text DEFAULT 'processed' NOT NULL,
        "error_message" text,
        "processed_at" timestamptz DEFAULT now() NOT NULL
      );
    `;
    console.log("✓ Restored payment_webhook_events table");

    // 4. Verify tables on DEV
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log(`\nTotal tables on DEV: ${tables.length}`);
    console.log("Has payment_webhook_events?", tables.some(t => t.table_name === "payment_webhook_events"));

  } catch (err) {
    console.error("Error restoring DEV DB schema:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
