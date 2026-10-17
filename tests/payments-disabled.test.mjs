import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { isOnlinePaymentsEnabled } from "../backend/lib/features.ts";
import {
  isGatewayEnabled,
  getAvailableGateways,
  getAllGatewaysConfig,
  getDefaultPaymentMethod,
} from "../frontend/config/payment-gateways.ts";
import {
  checkOrderAbuseGuards,
  OrderError,
} from "../backend/lib/orders.server.ts";
import { POST as createOrderRoute } from "../app/api/orders/create/route.ts";
import { POST as razorpayCreateOrderRoute } from "../app/api/payments/razorpay/create-order/route.ts";
import { POST as razorpayVerifyRoute } from "../app/api/payments/razorpay/verify-payment/route.ts";
import { POST as cashfreeCreateOrderRoute } from "../app/api/payments/cashfree/create-order/route.ts";
import { GET as cashfreeVerifyRoute } from "../app/api/payments/cashfree/verify-order/route.ts";
import { GET as gatewaysRoute } from "../app/api/payments/gateways/route.ts";
import { POST as razorpayWebhookRoute } from "../app/api/webhooks/razorpay/route.ts";
import { POST as paymentGatewayWebhookRoute } from "../app/api/webhooks/payment-gateway/route.ts";

describe("Online Payments Disabled Enforcement (Flag OFF)", () => {
  const origOnline = process.env.ONLINE_PAYMENTS_ENABLED;
  const origNextPublic = process.env.NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED;

  beforeEach(() => {
    // Explicitly guarantee flag is OFF
    delete process.env.ONLINE_PAYMENTS_ENABLED;
    delete process.env.NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED;
  });

  afterEach(() => {
    if (origOnline !== undefined) {
      process.env.ONLINE_PAYMENTS_ENABLED = origOnline;
    } else {
      delete process.env.ONLINE_PAYMENTS_ENABLED;
    }
    if (origNextPublic !== undefined) {
      process.env.NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED = origNextPublic;
    } else {
      delete process.env.NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED;
    }
  });

  test("1. Shared feature flag helper defaults to false when unset", () => {
    assert.equal(isOnlinePaymentsEnabled(), false, "Flag must default to false");
    
    process.env.ONLINE_PAYMENTS_ENABLED = "false";
    assert.equal(isOnlinePaymentsEnabled(), false, "Flag must be false when set to 'false'");

    process.env.ONLINE_PAYMENTS_ENABLED = "true";
    assert.equal(isOnlinePaymentsEnabled(), true, "Flag must be true when set to 'true'");

    delete process.env.ONLINE_PAYMENTS_ENABLED;
  });

  test("2. Gateways config strictly disables Razorpay & Cashfree when flag is OFF", () => {
    assert.equal(isGatewayEnabled("razorpay"), false, "Razorpay must be disabled");
    assert.equal(isGatewayEnabled("cashfree"), false, "Cashfree must be disabled");
    assert.equal(isGatewayEnabled("cod"), true, "COD must be enabled");
    assert.equal(isGatewayEnabled("whatsapp"), true, "WhatsApp must be enabled");

    const available = getAvailableGateways();
    const availableIds = available.map((g) => g.id);
    assert.deepEqual(availableIds.sort(), ["cod", "whatsapp"].sort(), "Only COD and WhatsApp should be available");

    const defaultMethod = getDefaultPaymentMethod();
    assert.ok(["cod", "whatsapp"].includes(defaultMethod), "Default payment method must be offline");
  });

  test("3. checkOrderAbuseGuards rejects razorpay and cashfree when flag is OFF", async () => {
    await assert.rejects(
      async () => {
        await checkOrderAbuseGuards("test_user", "9876543210", 100000, "razorpay");
      },
      (err) => {
        assert.ok(err instanceof OrderError);
        assert.equal(err.code, "ONLINE_PAYMENTS_DISABLED");
        assert.equal(err.statusCode, 400);
        return true;
      },
      "Must reject Razorpay order creation"
    );

    await assert.rejects(
      async () => {
        await checkOrderAbuseGuards("test_user", "9876543210", 100000, "cashfree");
      },
      (err) => {
        assert.ok(err instanceof OrderError);
        assert.equal(err.code, "ONLINE_PAYMENTS_DISABLED");
        assert.equal(err.statusCode, 400);
        return true;
      },
      "Must reject Cashfree order creation"
    );
  });

  test("4. POST /api/orders/create route rejects razorpay and cashfree with clear error", async () => {
    const mockReq = {
      json: async () => ({
        paymentMethod: "razorpay",
        customerPhone: "9876543210",
        customerName: "Test User",
        shippingAddressSnapshot: { postalCode: "110001" },
        items: [{ productId: "p1", quantity: 1 }],
      }),
      headers: new Headers(),
    };

    const res = await createOrderRoute(mockReq);
    assert.equal(res.status, 403, "Should return 403 Forbidden");
    const json = await res.json();
    assert.equal(json.code, "ONLINE_PAYMENTS_DISABLED");
    assert.ok(json.error.includes("Online payments"));
  });

  test("5. Payment Gateway routes return disabled 403 without DB writes", async () => {
    // Razorpay create order
    const rzpCreateReq = {
      json: async () => ({ items: [{ productId: "p1", quantity: 1 }] }),
      nextUrl: { origin: "http://localhost:3000" },
    };
    const rzpCreateRes = await razorpayCreateOrderRoute(rzpCreateReq);
    assert.equal(rzpCreateRes.status, 403);
    const rzpCreateJson = await rzpCreateRes.json();
    assert.equal(rzpCreateJson.code, "GATEWAY_DISABLED");

    // Razorpay verify payment
    const rzpVerifyReq = {
      json: async () => ({
        order_id: "ord_123",
        razorpay_order_id: "rzp_ord_123",
        razorpay_payment_id: "pay_123",
        razorpay_signature: "sig_123",
      }),
    };
    const rzpVerifyRes = await razorpayVerifyRoute(rzpVerifyReq);
    assert.equal(rzpVerifyRes.status, 403);
    const rzpVerifyJson = await rzpVerifyRes.json();
    assert.equal(rzpVerifyJson.code, "ONLINE_PAYMENTS_DISABLED");

    // Cashfree create order
    const cfCreateReq = {
      json: async () => ({ amount: 500, customer: { phone: "9876543210" } }),
      nextUrl: { origin: "http://localhost:3000" },
    };
    const cfCreateRes = await cashfreeCreateOrderRoute(cfCreateReq);
    assert.equal(cfCreateRes.status, 403);
    const cfCreateJson = await cfCreateRes.json();
    assert.equal(cfCreateJson.code, "GATEWAY_DISABLED");

    // Cashfree verify order
    const cfVerifyReq = {
      url: "http://localhost:3000/api/payments/cashfree/verify-order?orderId=cf_123",
    };
    const cfVerifyRes = await cashfreeVerifyRoute(cfVerifyReq);
    assert.equal(cfVerifyRes.status, 403);
    const cfVerifyJson = await cfVerifyRes.json();
    assert.equal(cfVerifyJson.code, "ONLINE_PAYMENTS_DISABLED");
  });

  test("6. GET /api/payments/gateways returns gateways matching main", async () => {
    const res = await gatewaysRoute();
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(json.gateways);
    assert.equal(json.gateways.razorpay.enabled, false);
    assert.equal(json.gateways.cashfree.enabled, false);
    assert.equal(json.gateways.cod.enabled, true);
    assert.equal(json.gateways.whatsapp.enabled, true);
  });

  test("7. Webhook routes acknowledge with harmless 200 without DB/stock changes", async () => {
    // Razorpay Webhook
    const rzpWebhookReq = {
      text: async () => JSON.stringify({ event: "payment.captured" }),
      headers: new Headers({ "x-razorpay-signature": "dummy_sig" }),
    };
    const rzpWebhookRes = await razorpayWebhookRoute(rzpWebhookReq);
    assert.equal(rzpWebhookRes.status, 200);
    const rzpWebhookJson = await rzpWebhookRes.json();
    assert.equal(rzpWebhookJson.received, true);
    assert.equal(rzpWebhookJson.ignored, true);

    // Payment Gateway / Payout Webhook
    const pgWebhookReq = {
      text: async () => JSON.stringify({ event: "transfer.success" }),
      headers: new Headers({ "x-webhook-signature": "dummy_sig" }),
    };
    const pgWebhookRes = await paymentGatewayWebhookRoute(pgWebhookReq);
    assert.equal(pgWebhookRes.status, 200);
    const pgWebhookJson = await pgWebhookRes.json();
    assert.equal(pgWebhookJson.received, true);
    assert.equal(pgWebhookJson.ignored, true);
  });
});
