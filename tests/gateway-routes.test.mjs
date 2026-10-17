import test from "node:test";
import assert from "node:assert/strict";

// Test gateway route handlers directly in-memory to confirm parity with main
import { GET as getGateways } from "../app/api/payments/gateways/route.ts";
import { POST as postRazorpayCreate } from "../app/api/payments/razorpay/create-order/route.ts";
import { POST as postRazorpayVerify } from "../app/api/payments/razorpay/verify-payment/route.ts";
import { POST as postCashfreeCreate } from "../app/api/payments/cashfree/create-order/route.ts";
import { GET as getCashfreeVerify } from "../app/api/payments/cashfree/verify-order/route.ts";

test("Gateway Routes API parity with main", async (t) => {
  await t.test("GET /api/payments/gateways returns gateways config matching main", async () => {
    const res = await getGateways();
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.gateways);
    assert.equal(data.gateways.razorpay.enabled, false);
    assert.equal(data.gateways.cashfree.enabled, false);
    assert.equal(data.gateways.cod.enabled, true);
    assert.equal(data.gateways.whatsapp.enabled, true);
  });

  await t.test("POST /api/payments/razorpay/create-order is strictly blocked with 403 matching main", async () => {
    const req = new Request("http://localhost:3000/api/payments/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ slug: "walnuts", qty: 1 }] }),
    });
    const res = await postRazorpayCreate(req);
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.code, "GATEWAY_DISABLED");
  });

  await t.test("POST /api/payments/razorpay/verify-payment is strictly blocked with 403", async () => {
    const req = new Request("http://localhost:3000/api/payments/razorpay/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ razorpay_order_id: "order_123" }),
    });
    const res = await postRazorpayVerify(req);
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.code, "ONLINE_PAYMENTS_DISABLED");
  });

  await t.test("POST /api/payments/cashfree/create-order is strictly blocked with 403 matching main", async () => {
    const req = new Request("http://localhost:3000/api/payments/cashfree/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 100 }),
    });
    const res = await postCashfreeCreate(req);
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.code, "GATEWAY_DISABLED");
  });

  await t.test("GET /api/payments/cashfree/verify-order is strictly blocked with 403", async () => {
    const req = new Request("http://localhost:3000/api/payments/cashfree/verify-order?orderId=ord_123", {
      method: "GET",
    });
    const res = await getCashfreeVerify(req);
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.code, "ONLINE_PAYMENTS_DISABLED");
  });
});

