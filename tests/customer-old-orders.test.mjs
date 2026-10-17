import test from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const devDbUrl = process.env.NEON_TEST_BRANCH_URL || process.env.DATABASE_URL;

if (!devDbUrl || devDbUrl.includes("ep-snowy-fog-b3wop5vp")) {
  throw new Error("Invalid or production connection string detected.");
}

const sql = postgres(devDbUrl, { ssl: "require", max: 2 });

test("Customer can see their old historical orders after Better Auth migration", async (t) => {
  t.after(async () => {
    await sql.end();
  });

  await t.test("Customer 1 with 5 historical orders retrieves them with correct items", async () => {
    const customerId = "fI2iZKDI6SWmIpfHgu1xfLpYPLA3";

    // 1. Verify user exists in Better Auth user table
    const [userRow] = await sql`
      SELECT id, email_verified FROM "user" WHERE id = ${customerId}
    `;
    assert.ok(userRow, "Better Auth user row must exist with the same Firebase UID");
    assert.equal(userRow.id, customerId);

    // 2. Query customer's orders as the customer order screen/API would
    const customerOrders = await sql`
      SELECT 
        o.id,
        o.order_number,
        o.status,
        o.payment_status,
        o.payment_method,
        o.total_paise,
        o.created_at,
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'unit_price_paise', oi.unit_price_paise,
            'total_paise', oi.total_paise
          )
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = ${customerId}
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;

    assert.equal(customerOrders.length, 5, "Customer 1 must see exactly 5 historical orders");

    const orderNumbers = customerOrders.map((o) => o.order_number);
    assert.ok(orderNumbers.includes("PRJ31765198"));
    assert.ok(orderNumbers.includes("PRJ36329868"));
    assert.ok(orderNumbers.includes("PRJ61763810"));
    assert.ok(orderNumbers.includes("PRJ97957563"));
    assert.ok(orderNumbers.includes("order_mock_nstq66n"));

    // Verify all items are attached
    for (const order of customerOrders) {
      assert.ok(Array.isArray(order.items) && order.items.length > 0, `Order ${order.order_number} must have items`);
    }
  });

  await t.test("Customer 2 with 1 historical order retrieves their order", async () => {
    const customerId = "IKrQe9EKQJZGkppuBe7k2X3tbi62";

    const [userRow] = await sql`
      SELECT id FROM "user" WHERE id = ${customerId}
    `;
    assert.ok(userRow, "Better Auth user row must exist");

    const customerOrders = await sql`
      SELECT id, order_number, total_paise FROM orders WHERE user_id = ${customerId}
    `;

    assert.equal(customerOrders.length, 1);
    assert.equal(customerOrders[0].order_number, "PRJ68259035");
  });

  await t.test("Unrelated customer sees 0 orders", async () => {
    const unrelatedId = "non_existent_customer_xyz";
    const customerOrders = await sql`
      SELECT id FROM orders WHERE user_id = ${unrelatedId}
    `;
    assert.equal(customerOrders.length, 0);
  });
});
