import { test, describe } from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env" });

const devDbUrl = process.env.NEON_TEST_BRANCH_URL || process.env.DATABASE_URL;

if (devDbUrl && devDbUrl.includes("ep-snowy-fog-b3wop5vp")) {
  throw new Error("Targeting production database is strictly prohibited!");
}

describe("Order PRJ61763810 Product Lookup & Parity Test", () => {
  test("Order PRJ61763810 in DB has two distinct walnut items resolved by slug", async () => {
    const sql = postgres(devDbUrl, { ssl: "require" });
    try {
      const items = await sql`
        SELECT id, order_id, product_id, product_name, product_slug, unit_price_paise, quantity 
        FROM order_items 
        WHERE order_id = (SELECT id FROM orders WHERE order_number = 'PRJ61763810' OR id = 'PRJ61763810')
        ORDER BY id
      `;

      assert.equal(items.length, 3, "Order PRJ61763810 must have exactly 3 items");

      const walnutItems = items.filter((it) => it.product_id === "walnuts");
      assert.equal(walnutItems.length, 2, "There must be 2 items with product_id 'walnuts'");

      const slug1 = walnutItems.find((it) => it.product_slug === "walnuts-2xmh");
      const slug2 = walnutItems.find((it) => it.product_slug === "walnuts");

      assert.ok(slug1, "Must find item with slug 'walnuts-2xmh'");
      assert.ok(slug2, "Must find item with slug 'walnuts'");
      assert.notEqual(slug1.id, slug2.id, "The two items must have distinct IDs");
      assert.notEqual(slug1.product_slug, slug2.product_slug, "The two items must have distinct slugs");
    } finally {
      await sql.end();
    }
  });

  test("calculateOrderServerTotals resolves items with same productId by slug first without ambiguity", async () => {
    const sql = postgres(devDbUrl, { ssl: "require" });
    try {
      await sql`
        INSERT INTO farmer_profiles (id, user_id, full_name, farm_name, phone, state, village, slug)
        VALUES ('farmer_ramesh', 'fI2iZKDI6SWmIpfHgu1xfLpYPLA3', 'Ramesh Singh', 'Prajnaa Organic Farm', '9876543210', 'Uttarakhand', 'Ranikhet', 'ramesh-singh')
        ON CONFLICT (id) DO NOTHING
      `;
      await sql`
        INSERT INTO farmer_products (id, user_id, farmer_id, slug, name, price, category, status, gst_applicable, gst_rate, weight_grams)
        VALUES ('fI2iZKDI6SWmIpfHgu1xfLpYPLA3_walnuts-2xmh', 'fI2iZKDI6SWmIpfHgu1xfLpYPLA3', 'farmer_ramesh', 'walnuts-2xmh', 'Walnuts', 549, 'dry-fruits', 'published', true, 5, 500)
        ON CONFLICT (id) DO UPDATE SET slug = 'walnuts-2xmh'
      `;
    } catch (e) {



      console.error("SQL Insert Error:", e);
    } finally {
      await sql.end();
    }

    const { calculateOrderServerTotals } = await import("../backend/lib/orders.server.ts");

    // Order items mirroring PRJ61763810
    const inputItems = [
      {
        productId: "walnuts",
        slug: "walnuts-2xmh",
        quantity: 1,
      },
      {
        productId: "walnuts",
        slug: "walnuts",
        quantity: 1,
      },
    ];

    try {
      const calc = await calculateOrderServerTotals(
        inputItems,
        "110001",
        "cod"
      );

      assert.equal(calc.items.length, 2, "Must calculate both items");
      assert.equal(calc.items[0].productSlug, "walnuts-2xmh", "First item must resolve to walnuts-2xmh");
      assert.equal(calc.items[1].productSlug, "walnuts", "Second item must resolve to walnuts");
      assert.ok(calc.items[0].unitPricePaise > 0, "Unit price must be calculated");
      assert.ok(calc.items[1].unitPricePaise > 0, "Unit price must be calculated");
      assert.equal(calc.subtotalPaise, calc.items[0].unitPricePaise + calc.items[1].unitPricePaise);
    } catch (err) {
      console.error("Calculate Error in test:", err);
      throw err;
    }
  });


  test("Static products with missing inventory rows are treated as unlimited stock", async () => {
    const { decrementStockAtomicTx } = await import("../backend/lib/orders.server.ts");
    const { db } = await import("../backend/db.ts");

    // Run within a transaction that rolls back so no DB pollution occurs
    await db.transaction(async (tx) => {
      // Calling decrementStockAtomicTx for static product with no product_inventory row
      // must NOT throw an error (unlimited stock behavior)
      await assert.doesNotReject(async () => {
        await decrementStockAtomicTx(
          tx,
          [
            {
              productId: "walnuts",
              slug: "walnuts",
              productName: "Himalayan Mountain Walnuts",
              weightGrams: 500,
            },
          ],
          "test_order_unlimited_stock"
        );
      });

      // Rollback
      tx.rollback();
    }).catch((err) => {
      // Drizzle rollback triggers a RollbackError which is expected
      if (err?.message !== "Rollback" && !err?.name?.includes("Rollback")) {
        throw err;
      }
    });
  });
});
