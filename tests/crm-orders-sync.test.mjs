import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import clientPromise from "../lib/mongodb.ts";
import {
  normalizeIndianPhone,
  buildCrmOrderPayload,
  syncOrderToWhatsAppCrm,
  processPendingCrmSyncRetries,
} from "../backend/lib/crm-sync.server.ts";
import {
  buildItemizedCrmOrderConfirmationMessage,
  sendWhatsAppTextMessage,
} from "../backend/lib/whatsapp.server.ts";
import { POST as crmOrdersRoute, GET as crmOrdersGetRoute } from "../app/api/crm/orders/route.ts";

describe("PRAJNAA STOREFRONT CHECKOUT TO WHATSAPP CRM INTEGRATION", () => {
  beforeEach(() => {
    // Reset test memory cache
    globalThis.__globalCrmOrders = [];
    globalThis.__globalWhatsAppFeed = [];
    if (globalThis.__crmSyncOutbox) {
      globalThis.__crmSyncOutbox.clear();
    }
  });

  after(async () => {
    try {
      const client = await clientPromise;
      await client.close();
    } catch {}
  });

  // 1. Phone Normalization (E.164)
  test("1. Phone Normalization (E.164 format and Indian carrier prefixes)", () => {
    assert.equal(normalizeIndianPhone("9811234567"), "+919811234567");
    assert.equal(normalizeIndianPhone("+91 98112 34567"), "+919811234567");
    assert.equal(normalizeIndianPhone("+91-98112-34567"), "+919811234567");
    assert.equal(normalizeIndianPhone("09811234567"), "+919811234567");
    assert.equal(normalizeIndianPhone("919811234567"), "+919811234567");
    assert.equal(normalizeIndianPhone("+919811234567"), "+919811234567");
    assert.equal(normalizeIndianPhone(""), "");
    assert.equal(normalizeIndianPhone("123"), "+123");
  });

  // 2. Authoritative Payload Mapping & Integer Paise Preservation
  test("2. Storefront Order Mapping & Integer Paise Preservation (No double multiplication)", () => {
    const storefrontOrder = {
      id: "ORD-2026-1005",
      orderNumber: "ORD-2026-1005",
      customerName: "Aarav Sharma",
      customerPhone: "+91 98112 34567",
      customerEmail: "aarav.sharma@gmail.com",
      status: "pending",
      paymentStatus: "pending",
      paymentMethod: "whatsapp",
      subtotalPaise: 224800,
      shippingPaise: 5000,
      discountPaise: 0,
      totalPaise: 229800, // ₹2,298.00 in paise
      shippingAddressSnapshot: {
        fullName: "Aarav Sharma",
        line1: "Flat 402, Green Glen Layout, Bellandur",
        line2: "Near EcoSpace",
        landmark: "Bellandur Gate",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560103",
      },
      items: [
        {
          productId: "himalayan-dried-apricots",
          productName: "Himalayan Dried Apricots (500g)",
          quantity: 2,
          unitPricePaise: 99900,
          totalPaise: 199800,
        },
        {
          productId: "pahadi-bilona-ghee",
          productName: "Pahadi Bilona Cow Ghee (1L)",
          quantity: 1,
          unitPricePaise: 125000,
          totalPaise: 125000,
        },
      ],
    };

    const payload = buildCrmOrderPayload(storefrontOrder);

    assert.equal(payload.id, "ORD-2026-1005");
    assert.equal(payload.orderNumber, "ORD-2026-1005");
    assert.equal(payload.customerName, "Aarav Sharma");
    assert.equal(payload.customerPhone, "+919811234567");
    assert.equal(payload.customerEmail, "aarav.sharma@gmail.com");
    assert.equal(payload.totalPaise, 229800, "totalPaise must remain 229800 without being multiplied by 100 again");
    assert.equal(payload.status, "Processing", "pending storefront status maps to CRM Processing");
    assert.equal(payload.paymentStatus, "pending", "paymentStatus must remain pending");
    assert.equal(payload.paymentMethod, "whatsapp");

    // Address Snapshot
    assert.equal(payload.shippingAddressSnapshot.fullName, "Aarav Sharma");
    assert.equal(payload.shippingAddressSnapshot.line1, "Flat 402, Green Glen Layout, Bellandur");
    assert.equal(payload.shippingAddressSnapshot.city, "Bengaluru");
    assert.equal(payload.shippingAddressSnapshot.state, "Karnataka");
    assert.equal(payload.shippingAddressSnapshot.postalCode, "560103");

    // Items array
    assert.equal(payload.items.length, 2);
    assert.equal(payload.items[0].productName, "Himalayan Dried Apricots (500g)");
    assert.equal(payload.items[0].quantity, 2);
    assert.equal(payload.items[0].unitPricePaise, 99900);
    assert.equal(payload.items[0].totalPaise, 199800);
    assert.equal(payload.items[1].productName, "Pahadi Bilona Cow Ghee (1L)");
    assert.equal(payload.items[1].quantity, 1);
    assert.equal(payload.items[1].unitPricePaise, 125000);
    assert.equal(payload.items[1].totalPaise, 125000);
  });

  // 3. Rejection of Invalid or Missing Customer Data
  test("3. CRM Order Ingestion Validation (Rejects missing/malformed fields)", async () => {
    // Missing body
    const emptyReq = new Request("http://localhost:3000/api/crm/orders", {
      method: "POST",
      body: JSON.stringify(null),
    });
    const emptyRes = await crmOrdersRoute(emptyReq);
    assert.equal(emptyRes.status, 400);

    // Missing order ID
    const noIdReq = new Request("http://localhost:3000/api/crm/orders", {
      method: "POST",
      body: JSON.stringify({ customerPhone: "+919811234567", items: [{ productName: "Almonds", quantity: 1, unitPricePaise: 1000 }] }),
    });
    const noIdRes = await crmOrdersRoute(noIdReq);
    assert.equal(noIdRes.status, 400);

    // Missing phone
    const noPhoneReq = new Request("http://localhost:3000/api/crm/orders", {
      method: "POST",
      body: JSON.stringify({ orderNumber: "ORD-1", items: [{ productName: "Almonds", quantity: 1, unitPricePaise: 1000 }], totalPaise: 1000 }),
    });
    const noPhoneRes = await crmOrdersRoute(noPhoneReq);
    assert.equal(noPhoneRes.status, 400);

    // Empty items
    const noItemsReq = new Request("http://localhost:3000/api/crm/orders", {
      method: "POST",
      body: JSON.stringify({ orderNumber: "ORD-1", customerPhone: "+919811234567", items: [], totalPaise: 1000 }),
    });
    const noItemsRes = await crmOrdersRoute(noItemsReq);
    assert.equal(noItemsRes.status, 400);

    // Negative total
    const negTotalReq = new Request("http://localhost:3000/api/crm/orders", {
      method: "POST",
      body: JSON.stringify({
        orderNumber: "ORD-1",
        customerPhone: "+919811234567",
        items: [{ productName: "Almonds", quantity: 1, unitPricePaise: 1000 }],
        totalPaise: -50,
      }),
    });
    const negTotalRes = await crmOrdersRoute(negTotalReq);
    assert.equal(negTotalRes.status, 400);
  });

  // 4. API Key Authentication (When Configured)
  test("4. CRM Endpoint Authentication Security", async () => {
    process.env.WHATSAPP_CRM_API_KEY = "super_secret_crm_key_2026";
    try {
      // Unauthorized call without key
      const unauthReq = new Request("http://localhost:3000/api/crm/orders", {
        method: "POST",
        body: JSON.stringify({ orderNumber: "ORD-TEST-AUTH", customerPhone: "+919811234567", items: [{ productName: "Ghee", quantity: 1, unitPricePaise: 1000 }], totalPaise: 1000 }),
      });
      const unauthRes = await crmOrdersRoute(unauthReq);
      assert.equal(unauthRes.status, 401, "Must reject request missing required CRM API key");

      // Authorized call with valid key
      const authReq = new Request("http://localhost:3000/api/crm/orders", {
        method: "POST",
        headers: { "x-crm-api-key": "super_secret_crm_key_2026" },
        body: JSON.stringify({ orderNumber: "ORD-TEST-AUTH", customerPhone: "+919811234567", items: [{ productName: "Ghee", quantity: 1, unitPricePaise: 1000 }], totalPaise: 1000 }),
      });
      const authRes = await crmOrdersRoute(authReq);
      assert.equal(authRes.status, 200, "Must permit authorized request with valid CRM API key");
    } finally {
      delete process.env.WHATSAPP_CRM_API_KEY;
    }
  });

  // 5. Itemized WhatsApp Confirmation Message Structure
  test("5. Prajnaa Market Itemized WhatsApp Confirmation Tone & Accuracy", () => {
    const testOrder = {
      customerName: "Aarav Sharma",
      orderNumber: "ORD-2026-1005",
      items: [
        { productName: "Himalayan Dried Apricots (500g)", quantity: 2, unitPricePaise: 99900, totalPaise: 199800 },
        { productName: "Pahadi Bilona Cow Ghee (1L)", quantity: 1, unitPricePaise: 125000, totalPaise: 125000 },
      ],
      totalPaise: 324800,
      paymentStatus: "pending",
    };

    const msg = buildItemizedCrmOrderConfirmationMessage(testOrder);

    assert.ok(msg.includes("Namaste Aarav Sharma ji! 🌿"), "Must include respectful Hindi greeting");
    assert.ok(msg.includes("Order No.: #ORD-2026-1005"), "Must include order number");
    assert.ok(msg.includes("Himalayan Dried Apricots (500g) × 2 — ₹1,998"), "Must include item 1 with line total");
    assert.ok(msg.includes("Pahadi Bilona Cow Ghee (1L) × 1 — ₹1,250"), "Must include item 2 with line total");
    assert.ok(msg.includes("Order Total: ₹3,248"), "Must show accurate total formatted in INR");
    assert.ok(msg.includes("Payment Status: Pending"), "Must explicitly maintain pending payment status");
    assert.ok(msg.includes("2–3 din lagte hain") || msg.includes("2-3 din"), "Must communicate standard 2-3 days dispatch timeline");
    assert.ok(msg.includes("Team Prajnaa Market"), "Must include Team Prajnaa Market sign-off");
  });

  // 6. CRM Idempotency: Repeated sync does NOT create duplicate orders or confirmations
  test("6. CRM Idempotency & Duplicate Confirmation Suppression", async () => {
    const testOrderId = `ORD-IDEMPOTENT-${Date.now()}`;
    const orderPayload = {
      id: testOrderId,
      orderNumber: testOrderId,
      customerName: "Sneha Patel",
      customerPhone: "+919876543210",
      totalPaise: 150000,
      status: "Processing",
      paymentStatus: "pending",
      paymentMethod: "whatsapp",
      items: [{ productName: "Pahadi Honey (500g)", quantity: 1, unitPricePaise: 150000, totalPaise: 150000 }],
    };

    // First synchronization
    const firstReq = new Request("http://localhost:3000/api/crm/orders", {
      method: "POST",
      body: JSON.stringify(orderPayload),
    });
    const firstRes = await crmOrdersRoute(firstReq);
    const firstData = await firstRes.json();

    assert.equal(firstRes.status, 200);
    assert.equal(firstData.success, true);
    assert.equal(firstData.whatsappNotification.sent, true);
    assert.equal(firstData.whatsappNotification.duplicatePrevented, false);

    // Verify order is in global CRM list
    assert.equal(globalThis.__globalCrmOrders?.length, 1);
    const initialFeedLength = globalThis.__globalWhatsAppFeed?.length || 0;
    assert.ok(initialFeedLength >= 1, "Confirmation message must be logged in feed");

    // Second synchronization (Retry or Page Refresh)
    const secondReq = new Request("http://localhost:3000/api/crm/orders", {
      method: "POST",
      body: JSON.stringify(orderPayload),
    });
    const secondRes = await crmOrdersRoute(secondReq);
    const secondData = await secondRes.json();

    assert.equal(secondRes.status, 200);
    assert.equal(secondData.success, true);
    // CRITICAL: Duplicate order was NOT created
    assert.equal(globalThis.__globalCrmOrders?.length, 1, "CRM orders count must remain 1 (no duplicate order created)");

    // CRITICAL: Duplicate confirmation was PREVENTED
    assert.equal(secondData.whatsappNotification.duplicatePrevented, true, "Duplicate confirmation must be prevented on re-sync");
    assert.equal(globalThis.__globalWhatsAppFeed?.length, initialFeedLength, "No additional confirmation message appended to feed");
  });

  // 7. Customer Opt-Out Respect
  test("7. Respects Customer Messaging Opt-Out", async () => {
    const optOutOrderId = `ORD-OPTOUT-${Date.now()}`;
    const optOutOrder = {
      id: optOutOrderId,
      orderNumber: optOutOrderId,
      customerName: "Rahul Mehra",
      customerPhone: "+919876543210",
      customerOptOut: true, // Opted out
      totalPaise: 99900,
      status: "Processing",
      paymentStatus: "pending",
      paymentMethod: "whatsapp",
      items: [{ productName: "Apricots", quantity: 1, unitPricePaise: 99900, totalPaise: 99900 }],
    };

    const req = new Request("http://localhost:3000/api/crm/orders", {
      method: "POST",
      body: JSON.stringify(optOutOrder),
    });
    const res = await crmOrdersRoute(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.whatsappNotification.sent, false);
    assert.equal(data.whatsappNotification.skipped, true);
    assert.ok(data.whatsappNotification.reason.includes("opted out"));
  });

  // 8. Outbox Resilience & Bounded Retry
  test("8. Outbox Resilience: Temporary Outage Does Not Discard Storefront Order", async () => {
    const mockOrder = {
      id: "ORD-OUTBOX-TEST",
      orderNumber: "ORD-OUTBOX-TEST",
      customerName: "Vikram Das",
      customerPhone: "+91 98111 22233",
      totalPaise: 199800,
      status: "pending",
      paymentStatus: "pending",
      paymentMethod: "whatsapp",
      items: [{ productName: "Apricots", quantity: 2, unitPricePaise: 99900, totalPaise: 199800 }],
    };

    // Simulate unreachable CRM endpoint (e.g. invalid host or port that times out fast)
    const syncResult = await syncOrderToWhatsAppCrm(mockOrder, mockOrder.items, {
      crmUrl: "http://127.0.0.1:59999", // non-existent server
      timeoutMs: 300,
    });

    // CRITICAL: Order sync failed gracefully into outbox without crashing
    assert.equal(syncResult.success, false);
    assert.equal(syncResult.status, "retry_pending");
    assert.ok(syncResult.error);

    // Verify outbox state is tracked
    const outboxEntry = globalThis.__crmSyncOutbox?.get("ORD-OUTBOX-TEST");
    assert.ok(outboxEntry, "Order must be retained in outbox for retry");
    assert.equal(outboxEntry.status, "retry_pending");
    assert.equal(outboxEntry.attempts, 1);
  });
});
