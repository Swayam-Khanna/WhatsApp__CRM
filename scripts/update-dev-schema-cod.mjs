import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const devUrl = process.env.NEON_TEST_BRANCH_URL || process.env.DATABASE_URL;
console.log("Updating DEV branch endpoint:", new URL(devUrl).host);

const sql = postgres(devUrl, { ssl: "require", max: 1 });

async function run() {
  try {
    console.log("Applying COD & WhatsApp schema refinements to DEV database...");

    // 1. Drop payment_webhook_events table
    await sql`DROP TABLE IF EXISTS "public"."payment_webhook_events" CASCADE;`;
    console.log("✓ Dropped payment_webhook_events table");

    // 2. Drop online gateway columns from orders table if they exist
    await sql`
      ALTER TABLE "public"."orders"
        DROP COLUMN IF EXISTS "razorpay_order_id",
        DROP COLUMN IF EXISTS "razorpay_payment_id",
        DROP COLUMN IF EXISTS "razorpay_signature",
        DROP COLUMN IF EXISTS "cashfree_order_id";
    `;
    console.log("✓ Dropped razorpay_* and cashfree_* columns from orders");

    // 3. Update order_payment_method enum to strictly ('cod', 'whatsapp')
    // We convert column to text, drop old enum, create new enum, convert back
    await sql`
      ALTER TABLE "public"."orders" 
        ALTER COLUMN "payment_method" DROP DEFAULT,
        ALTER COLUMN "payment_method" TYPE text;
    `;
    await sql`DROP TYPE IF EXISTS "public"."order_payment_method" CASCADE;`;
    await sql`CREATE TYPE "public"."order_payment_method" AS ENUM ('cod', 'whatsapp');`;
    await sql`
      ALTER TABLE "public"."orders" 
        ALTER COLUMN "payment_method" TYPE "public"."order_payment_method" 
        USING (CASE WHEN "payment_method" IN ('cod', 'whatsapp') THEN "payment_method"::"public"."order_payment_method" ELSE 'cod'::"public"."order_payment_method" END);
    `;
    console.log("✓ Updated order_payment_method enum to ('cod', 'whatsapp')");

    // 4. Update order_payment_status enum to ('pending', 'collected', 'refunded')
    await sql`
      ALTER TABLE "public"."orders" 
        ALTER COLUMN "payment_status" DROP DEFAULT,
        ALTER COLUMN "payment_status" TYPE text;
    `;
    await sql`DROP TYPE IF EXISTS "public"."order_payment_status" CASCADE;`;
    await sql`CREATE TYPE "public"."order_payment_status" AS ENUM ('pending', 'collected', 'refunded');`;
    await sql`
      ALTER TABLE "public"."orders" 
        ALTER COLUMN "payment_status" SET DEFAULT 'pending'::"public"."order_payment_status",
        ALTER COLUMN "payment_status" TYPE "public"."order_payment_status" 
        USING (
          CASE 
            WHEN "payment_status" = 'paid' THEN 'collected'::"public"."order_payment_status"
            WHEN "payment_status" IN ('pending', 'collected', 'refunded') THEN "payment_status"::"public"."order_payment_status"
            ELSE 'pending'::"public"."order_payment_status"
          END
        );
    `;
    console.log("✓ Updated order_payment_status enum to ('pending', 'collected', 'refunded')");

    // Verify current columns in orders
    const orderCols = await sql`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      ORDER BY ordinal_position;
    `;
    console.log("\nUpdated orders table columns on DEV:");
    orderCols.forEach(c => console.log(` - ${c.column_name}: ${c.udt_name} (${c.data_type})`));

    // Verify tables on DEV
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log("\nTotal tables on DEV:", tables.length);
    console.log("Has payment_webhook_events?", tables.some(t => t.table_name === "payment_webhook_events"));

  } catch (err) {
    console.error("Error updating DEV schema:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
