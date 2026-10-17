import { config } from "dotenv";
config();
import postgres from "postgres";

const connStr = process.env.NEON_TEST_BRANCH_URL || process.env.DATABASE_URL;
const sql = postgres(connStr!);

async function main() {
  const tables = [
    "user",
    "account",
    "profiles",
    "user_roles",
    "orders",
    "order_items",
    "order_shipments",
    "order_status_logs",
    "farmer_profiles",
    "farmer_products",
    "product_inventory",
    "shipping_slabs",
    "pincode_zones",
    "last_mile_rates",
    "app_settings",
    "system_notifications",
    "notification_preferences",
    "wishlist_items",
    "product_reviews",
    "addresses",
    "recently_viewed",
  ];

  const results: Record<string, number> = {};
  for (const t of tables) {
    const tableName = t === "user" ? '"user"' : t;
    const [row] = await sql.unsafe(`SELECT COUNT(*)::int as count FROM ${tableName}`);
    results[t] = row.count;
  }

  console.log("=== DEV NEON DATABASE TABLE COUNTS ===");
  console.table(results);
  await sql.end();
}

main().catch(console.error);
