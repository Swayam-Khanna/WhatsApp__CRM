import { config } from "dotenv";
config();
import postgres from "postgres";
import { adminDb } from "../frontend/lib/firebase-admin.ts";

const connStr = process.env.NEON_TEST_BRANCH_URL || process.env.DATABASE_URL;
const sql = postgres(connStr!);

async function main() {
  console.log("=== FIRESTORE farmer_products ===");
  if (adminDb) {
    const snap = await adminDb.collection("farmer_products").get();
    snap.docs.forEach((doc) => {
      const d = doc.data();
      console.log(`[Firestore] ID: ${doc.id}, slug: ${d.slug}, price: ${d.price}, farmer_id: ${d.farmer_id}`);
    });
  }

  console.log("\n=== NEON farmer_products ===");
  const rows = await sql`SELECT id, slug, name, price, farmer_id FROM farmer_products`;
  rows.forEach((r) => {
    console.log(`[Neon] ID: ${r.id}, slug: ${r.slug}, price: ${r.price}, farmer_id: ${r.farmer_id}`);
  });

  await sql.end();
}

main().catch(console.error);
