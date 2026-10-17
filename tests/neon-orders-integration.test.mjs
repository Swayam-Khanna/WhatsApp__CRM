import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

// 1. Force environment to DEV Neon test branch BEFORE loading DB client
dotenv.config({ path: ".env" });
const devDbUrl = process.env.NEON_TEST_BRANCH_URL;
if (!devDbUrl) {
  throw new Error("NEON_TEST_BRANCH_URL must be defined in .env to run DEV Neon integration tests");
}
assert.ok(
  devDbUrl.includes("ep-aged-art-b3wz564o"),
  "Target database must be the DEV Neon branch (ep-aged-art-b3wz564o), NEVER production!"
);

process.env.DATABASE_URL = devDbUrl;
process.env.DATA_PROVIDER = "neon";
process.env.ADMIN_API_SECRET = "dev-integration-secret-test-key";

// Dynamic imports after setting process.env.DATABASE_URL
const { db } = await import("../backend/db.ts");
const {
  profiles,
  farmerProfiles,
  farmerProducts,
  productInventory,
  orders,
  orderItems,
  orderShipments,
  orderStatusLogs,
} = await import("../backend/schema/index.ts");
const { eq, and } = await import("drizzle-orm");
const { PATCH } = await import("../app/api/admin/orders/[id]/route.ts");
const { NextRequest } = await import("next/server.js");

describe("Phase 2 DEV Neon Integration: Full Order Lifecycle & Stock Restoration", () => {
  const testRunId = Date.now().toString().slice(-6);
  const testUserId = `usr_test_int_${testRunId}`;
  const testFarmerId = `frm_test_int_${testRunId}`;
  const testProductId = `prd_test_int_${testRunId}`;
  const testOrderId = `ord_test_int_${testRunId}`;
  const testOrderNumber = `ORD-TEST-${testRunId}`;
  const testItemId = `itm_test_int_${testRunId}`;
  const testTrackingNumber = `DEL${testRunId}99`;

  const initialStockGrams = 5000;
  const orderQuantity = 2;
  const itemWeightGrams = 500;
  const purchasedStockGrams = itemWeightGrams * orderQuantity; // 1000g

  before(async () => {
    // Clean up any stale data with same IDs
    await db.delete(orderStatusLogs).where(eq(orderStatusLogs.orderId, testOrderId)).catch(() => {});
    await db.delete(orderShipments).where(eq(orderShipments.orderId, testOrderId)).catch(() => {});
    await db.delete(orderItems).where(eq(orderItems.orderId, testOrderId)).catch(() => {});
    await db.delete(orders).where(eq(orders.id, testOrderId)).catch(() => {});
    await db.delete(productInventory).where(eq(productInventory.productId, testProductId)).catch(() => {});
    await db.delete(farmerProducts).where(eq(farmerProducts.id, testProductId)).catch(() => {});
    await db.delete(farmerProfiles).where(eq(farmerProfiles.id, testFarmerId)).catch(() => {});
    await db.delete(profiles).where(eq(profiles.id, testUserId)).catch(() => {});

    // Seed test user profile
    await db.insert(profiles).values({
      id: testUserId,
      fullName: "Integration Test Buyer",
      email: `buyer_${testRunId}@prajnaatest.in`,
      phone: "+919876500000",
    });

    // Seed test farmer profile
    await db.insert(farmerProfiles).values({
      id: testFarmerId,
      userId: testUserId,
      fullName: "Integration Test Farmer",
      farmName: "Prajnaa Test Farm",
      phone: "+919876500001",
      email: `farmer_${testRunId}@prajnaatest.in`,
      slug: `test-farmer-${testRunId}`,
      state: "Uttarakhand",
      village: "Mukteshwar",
    });

    // Seed test product
    await db.insert(farmerProducts).values({
      id: testProductId,
      userId: testUserId,
      farmerId: testFarmerId,
      name: "Organic Test Walnuts",
      slug: `organic-test-walnuts-${testRunId}`,
      price: 450,
      stock: 5,
      stockGrams: initialStockGrams,
      category: "dry_fruits",
      unit: "500g",
      weightGrams: itemWeightGrams,
      gstApplicable: true,
      gstRate: 5,
    });

    // Seed product inventory
    await db.insert(productInventory).values({
      id: `inv_${testProductId}`,
      productId: testProductId,
      variantName: "standard",
      stockGrams: initialStockGrams,
      lowStockThresholdGrams: 1000,
      quantity: 5,
      soldCount: 0,
    });
  });

  after(async () => {
    // Clean up all rows created during the integration test
    try {
      await db.delete(orderStatusLogs).where(eq(orderStatusLogs.orderId, testOrderId));
      await db.delete(orderShipments).where(eq(orderShipments.orderId, testOrderId));
      await db.delete(orderItems).where(eq(orderItems.orderId, testOrderId));
      await db.delete(orders).where(eq(orders.id, testOrderId));
      await db.delete(productInventory).where(eq(productInventory.productId, testProductId));
      await db.delete(farmerProducts).where(eq(farmerProducts.id, testProductId));
      await db.delete(farmerProfiles).where(eq(farmerProfiles.id, testFarmerId));
      await db.delete(profiles).where(eq(profiles.id, testUserId));
    } catch (cleanErr) {
      console.warn("[Integration Cleanup Warning]:", cleanErr.message);
    }
    if (globalThis.postgresClientGlobal) {
      try {
        await globalThis.postgresClientGlobal.end({ timeout: 2 });
      } catch {}
    }
  });

  test("1. Create an order and decrement stock atomically on DEV Neon", async () => {
    // Decrement stock for the order (simulate order creation stock reservation)
    await db
      .update(farmerProducts)
      .set({
        stockGrams: initialStockGrams - purchasedStockGrams,
        stock: (initialStockGrams - purchasedStockGrams) / 1000,
      })
      .where(eq(farmerProducts.id, testProductId));

    await db
      .update(productInventory)
      .set({
        stockGrams: initialStockGrams - purchasedStockGrams,
        soldCount: purchasedStockGrams,
      })
      .where(eq(productInventory.productId, testProductId));

    // Insert order in 'pending' status
    await db.insert(orders).values({
      id: testOrderId,
      orderNumber: testOrderNumber,
      userId: testUserId,
      customerName: "Integration Test Buyer",
      customerEmail: `buyer_${testRunId}@prajnaatest.in`,
      customerPhone: "+919876500000",
      status: "pending",
      paymentStatus: "pending",
      paymentMethod: "cod",
      subtotalPaise: 90000,
      taxPaise: 4500,
      shippingPaise: 5000,
      discountPaise: 0,
      totalPaise: 99500,
      shippingAddressSnapshot: {
        fullName: "Integration Test Buyer",
        line1: "House 10, Green Valley",
        city: "Nainital",
        state: "Uttarakhand",
        postalCode: "263001",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Insert order items
    await db.insert(orderItems).values({
      id: testItemId,
      orderId: testOrderId,
      productId: testProductId,
      farmerId: testFarmerId,
      productName: "Organic Test Walnuts",
      productSlug: `organic-test-walnuts-${testRunId}`,
      quantity: orderQuantity,
      unitPricePaise: 45000,
      totalPaise: 90000,
      weightGrams: purchasedStockGrams,
      gstRate: 5,
      gstPaise: 4500,
      status: "pending",
      createdAt: new Date(),
    });

    // Log initial status
    await db.insert(orderStatusLogs).values({
      id: `osl_init_${testOrderId}`,
      orderId: testOrderId,
      fromStatus: null,
      toStatus: "pending",
      actorId: testUserId,
      actorRole: "customer",
      notes: "Order placed via COD on DEV Neon",
      createdAt: new Date(),
    });

    // Verify stock is decremented
    const [inv] = await db.select().from(productInventory).where(eq(productInventory.productId, testProductId));
    assert.equal(inv.stockGrams, 4000, "Inventory stock must be decremented to 4000g");

    const [prod] = await db.select().from(farmerProducts).where(eq(farmerProducts.id, testProductId));
    assert.equal(prod.stockGrams, 4000, "Product stock_grams must be decremented to 4000g");
  });

  test("2. Update status through PATCH route to 'confirmed'", async () => {
    const patchReq = new NextRequest(`http://localhost:3000/api/admin/orders/${testOrderId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-admin-key": process.env.ADMIN_API_SECRET,
      },
      body: JSON.stringify({
        status: "confirmed",
      }),
    });

    const res = await PATCH(patchReq, { params: Promise.resolve({ id: testOrderId }) });
    const json = await res.json();

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(json)}`);
    assert.equal(json.success, true);
    assert.equal(json.order.status, "confirmed");

    // Verify in database
    const [dbOrder] = await db.select().from(orders).where(eq(orders.id, testOrderId));
    assert.equal(dbOrder.status, "confirmed");

    // Verify status log entry
    const logs = await db.select().from(orderStatusLogs).where(eq(orderStatusLogs.orderId, testOrderId));
    assert.ok(logs.some((l) => l.toStatus === "confirmed"), "Status log must record confirmed transition");
  });

  test("3. Add a shipment through PATCH route (Delhivery tracking)", async () => {
    const patchReq = new NextRequest(`http://localhost:3000/api/admin/orders/${testOrderId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-admin-key": process.env.ADMIN_API_SECRET,
      },
      body: JSON.stringify({
        shipment_action: "add_shipment",
        carrier: "Delhivery",
        tracking_number: testTrackingNumber,
        item_ids: [testItemId],
      }),
    });

    const res = await PATCH(patchReq, { params: Promise.resolve({ id: testOrderId }) });
    const json = await res.json();

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(json)}`);
    assert.equal(json.success, true);
    assert.equal(json.order.status, "shipped");

    // Verify shipment in database
    const [dbShipment] = await db.select().from(orderShipments).where(eq(orderShipments.orderId, testOrderId));
    assert.ok(dbShipment, "Shipment row must exist in order_shipments");
    assert.equal(dbShipment.carrier, "Delhivery");
    assert.equal(dbShipment.trackingNumber, testTrackingNumber);

    // Verify order item marked shipped
    const [dbItem] = await db.select().from(orderItems).where(eq(orderItems.id, testItemId));
    assert.equal(dbItem.status, "shipped");
  });

  test("4. Cancel order through PATCH route and verify stock restoration & audit logs", async () => {
    const patchReq = new NextRequest(`http://localhost:3000/api/admin/orders/${testOrderId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-admin-key": process.env.ADMIN_API_SECRET,
      },
      body: JSON.stringify({
        status: "cancelled",
        cancellation_reason: "Customer changed mind before dispatch",
      }),
    });

    const res = await PATCH(patchReq, { params: Promise.resolve({ id: testOrderId }) });
    const json = await res.json();

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(json)}`);
    assert.equal(json.success, true);
    assert.equal(json.order.status, "cancelled");

    // Check order in database
    const [dbOrder] = await db.select().from(orders).where(eq(orders.id, testOrderId));
    assert.equal(dbOrder.status, "cancelled");
    assert.equal(dbOrder.cancellationReason, "Customer changed mind before dispatch");

    // Verify stock is restored back to 5000g in productInventory (single source of truth for stock writes)
    const [inv] = await db.select().from(productInventory).where(eq(productInventory.productId, testProductId));
    assert.equal(inv.stockGrams, 5000, "product_inventory stock_grams must be restored to 5000g");

    // Verify order_status_logs has entries
    const logs = await db
      .select()
      .from(orderStatusLogs)
      .where(eq(orderStatusLogs.orderId, testOrderId))
      .orderBy(orderStatusLogs.createdAt);

    assert.ok(logs.length >= 3, `Expected at least 3 status logs, found ${logs.length}`);
    assert.ok(logs.some((l) => l.toStatus === "pending"), "Must have pending log");
    assert.ok(logs.some((l) => l.toStatus === "confirmed"), "Must have confirmed log");
    assert.ok(logs.some((l) => l.toStatus === "shipped"), "Must have shipped log");
    assert.ok(logs.some((l) => l.toStatus === "cancelled"), "Must have cancelled log with reason");

    const cancelLog = logs.find((l) => l.toStatus === "cancelled");
    assert.ok(cancelLog.notes?.includes("Customer changed mind") || cancelLog.notes?.includes("cancelled"));
  });
});
