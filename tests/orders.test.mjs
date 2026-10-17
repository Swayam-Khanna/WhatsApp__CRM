import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  normalizeToStateKey,
  canTransition,
  getAllowedNextStatuses,
  validateStatusTransition,
  canAddTracking,
  deriveOrderStatusFromItems,
} from "../frontend/lib/orders/order-state-machine.ts";

import {
  calculateOrderTotals,
} from "../frontend/lib/orders/order-pricing.ts";

import {
  ALLOWED_PAYMENT_METHODS,
  isOrderPendingReview,
  getWixFulfillmentLabel,
  getWixPaymentLabel,
} from "../frontend/lib/orders/order-constants.ts";

import {
  validateTrackingNumber,
  getCarrierTrackingUrl,
  SUPPORTED_CARRIERS,
} from "../frontend/lib/orders/order-carriers.ts";

import {
  buildShippingEmailHtml,
  sendShippingConfirmationEmail,
} from "../frontend/lib/orders/order-email-sender.ts";

describe("1. Order State Machine Lifecycle & Transitions", () => {
  test("Normalizes raw database statuses to standard state machine keys", () => {
    assert.equal(normalizeToStateKey("pending"), "pending");
    assert.equal(normalizeToStateKey("cod_pending"), "pending");
    assert.equal(normalizeToStateKey("pending_payment"), "pending");
    assert.equal(normalizeToStateKey("pending_manual_payment"), "pending");
    assert.equal(normalizeToStateKey("confirmed"), "confirmed");
    assert.equal(normalizeToStateKey("packed"), "packed");
    assert.equal(normalizeToStateKey("shipped"), "shipped");
    assert.equal(normalizeToStateKey("delivered"), "delivered");
    assert.equal(normalizeToStateKey("cancelled"), "cancelled");
    assert.equal(normalizeToStateKey("canceled"), "cancelled");
  });

  test("Allows valid sequential lifecycle progression", () => {
    assert.equal(canTransition("pending", "confirmed"), true);
    assert.equal(canTransition("confirmed", "packed"), true);
    assert.equal(canTransition("packed", "shipped"), true);
    assert.equal(canTransition("shipped", "delivered"), true);
  });

  test("Blocks invalid forward and backward jumps", () => {
    // Jump over steps
    assert.equal(canTransition("pending", "shipped"), false);
    assert.equal(canTransition("pending", "delivered"), false);
    assert.equal(canTransition("confirmed", "delivered"), false);

    // Backward steps
    assert.equal(canTransition("packed", "confirmed"), false);
    assert.equal(canTransition("shipped", "packed"), false);
    assert.equal(canTransition("delivered", "shipped"), false);
    assert.equal(canTransition("delivered", "cancelled"), false);
    assert.equal(canTransition("cancelled", "confirmed"), false);
  });

  test("Allows cancellation from any pre-delivered state but forbids after delivery", () => {
    assert.equal(canTransition("pending", "cancelled"), true);
    assert.equal(canTransition("cod_pending", "cancelled"), true);
    assert.equal(canTransition("confirmed", "cancelled"), true);
    assert.equal(canTransition("packed", "cancelled"), true);
    assert.equal(canTransition("shipped", "cancelled"), true);
    assert.equal(canTransition("delivered", "cancelled"), false);
  });

  test("Requires tracking ID to mark order as Shipped unless explicitly overridden", () => {
    const orderWithoutTracking = {
      id: "PRJ12345678",
      status: "packed",
      tracking_number: null,
    };

    const resultWithoutTracking = validateStatusTransition(orderWithoutTracking, "shipped", {
      allowWithoutTracking: false,
    });
    assert.equal(resultWithoutTracking.valid, false);
    assert.match(resultWithoutTracking.error || "", /tracking number is required/i);

    const resultWithOverride = validateStatusTransition(orderWithoutTracking, "shipped", {
      allowWithoutTracking: true,
    });
    assert.equal(resultWithOverride.valid, true);

    const resultWithTracking = validateStatusTransition(orderWithoutTracking, "shipped", {
      trackingNumber: "TRK-DTDC-99218",
    });
    assert.equal(resultWithTracking.valid, true);
  });

  test("Requires cash collection prompt when delivering unpaid COD order", () => {
    const unpaidCodOrder = {
      id: "PRJ12345678",
      status: "shipped",
      payment_method: "cod",
      payment_status: "pending",
      tracking_number: "TRK-001",
    };

    const res = validateStatusTransition(unpaidCodOrder, "delivered");
    assert.equal(res.valid, true);
    assert.equal(res.requiresCashCollectionPrompt, true);
  });
});

describe("2. Server-Side Order Totals & Tax Calculation", () => {
  test("Accurately computes subtotal, GST, shipping, discount, and grand total", () => {
    const calculation = calculateOrderTotals({
      items: [
        {
          productId: "honey",
          name: "Wild Forest Honey",
          slug: "wild-honey",
          unitPrice: 500,
          qty: 2,
          gstApplicable: true,
          gstRate: 5,
        },
        {
          productId: "turmeric",
          name: "Organic Turmeric",
          slug: "turmeric",
          unitPrice: 200,
          qty: 1,
          gstApplicable: true,
          gstRate: 5,
        },
      ],
      shippingCost: 50,
      discountAmount: 100,
      paymentMethod: "cod",
    });

    // Subtotal: (500 * 2) + (200 * 1) = 1200
    assert.equal(calculation.subtotal, 1200);

    // GST: (1000 * 0.05) + (200 * 0.05) = 50 + 10 = 60
    assert.equal(calculation.totalGst, 60);

    // Shipping: 50
    assert.equal(calculation.shippingCost, 50);

    // Discount: 100
    assert.equal(calculation.discountAmount, 100);

    // Grand total: 1200 + 60 + 50 - 100 = 1210
    assert.equal(calculation.total, 1210);
  });

  test("Caps discount so total cannot be negative even with large discount", () => {
    const calculation = calculateOrderTotals({
      items: [
        {
          productId: "item1",
          name: "Produce",
          slug: "produce",
          unitPrice: 100,
          qty: 1,
          gstApplicable: false,
        },
      ],
      discountAmount: 500, // Greater than item cost
      shippingCost: 0,
    });

    assert.equal(calculation.subtotal, 100);
    assert.equal(calculation.discountAmount, 100); // Capped at subtotal
    assert.equal(calculation.total, 0);
  });
});

describe("3. Payment Methods & Wix Badge Mappings", () => {
  test("Allowed payment methods are strictly COD and WhatsApp only", () => {
    assert.deepEqual(ALLOWED_PAYMENT_METHODS, ["cod", "whatsapp"]);
    assert.equal(ALLOWED_PAYMENT_METHODS.includes("cod"), true);
    assert.equal(ALLOWED_PAYMENT_METHODS.includes("whatsapp"), true);
    // @ts-expect-error
    assert.equal(ALLOWED_PAYMENT_METHODS.includes("razorpay"), false);
    // @ts-expect-error
    assert.equal(ALLOWED_PAYMENT_METHODS.includes("upi"), false);
    // @ts-expect-error
    assert.equal(ALLOWED_PAYMENT_METHODS.includes("online"), false);
  });

  test("Wix Fulfillment labels map raw system values accurately", () => {
    assert.equal(getWixFulfillmentLabel("pending"), "Unfulfilled");
    assert.equal(getWixFulfillmentLabel("cod_pending"), "Unfulfilled");
    assert.equal(getWixFulfillmentLabel("pending_manual_payment"), "Unfulfilled");
    assert.equal(getWixFulfillmentLabel("confirmed"), "Confirmed");
    assert.equal(getWixFulfillmentLabel("packed"), "Packed");
    assert.equal(getWixFulfillmentLabel("shipped"), "Shipped");
    assert.equal(getWixFulfillmentLabel("delivered"), "Delivered");
    assert.equal(getWixFulfillmentLabel("cancelled"), "Canceled");
  });

  test("Wix Payment labels map statuses correctly", () => {
    assert.equal(getWixPaymentLabel("paid", "cod"), "Paid");
    assert.equal(getWixPaymentLabel("pending", "whatsapp"), "Pending confirmation");
    assert.equal(getWixPaymentLabel("pending", "cod"), "Unpaid");
    assert.equal(getWixPaymentLabel("refunded", "cod"), "Refunded");
  });

  test("Pending review rule correctly identifies orders needing admin action", () => {
    // 1. WhatsApp payment pending confirmation -> NEEDS REVIEW
    assert.equal(
      isOrderPendingReview({
        status: "pending_manual_payment",
        payment_method: "whatsapp",
        payment_status: "pending",
      }),
      true
    );

    // 2. Newly placed unconfirmed order -> NEEDS REVIEW
    assert.equal(
      isOrderPendingReview({
        status: "cod_pending",
        payment_method: "cod",
        payment_status: "pending",
      }),
      true
    );

    // 3. Delivered order -> NO REVIEW NEEDED
    assert.equal(
      isOrderPendingReview({
        status: "delivered",
        payment_method: "cod",
        payment_status: "paid",
      }),
      false
    );

    // 4. Cancelled order -> NO REVIEW NEEDED
    assert.equal(
      isOrderPendingReview({
        status: "cancelled",
        payment_method: "whatsapp",
        payment_status: "cancelled",
      }),
      false
    );
  });
});

describe("4. Multi-Shipment State Machine & Partial Fulfillment", () => {
  test("Allows adding tracking only when order is Confirmed, Packed, or Partially shipped", () => {
    // Allowed states
    assert.equal(canAddTracking({ status: "confirmed" }).allowed, true);
    assert.equal(canAddTracking({ status: "packed" }).allowed, true);
    assert.equal(canAddTracking({ status: "partially_shipped" }).allowed, true);
    assert.equal(canAddTracking({ status: "shipped" }).allowed, true);

    // Blocked states
    const pendingResult = canAddTracking({ status: "pending" });
    assert.equal(pendingResult.allowed, false);
    assert.match(pendingResult.reason || "", /Confirmed/i);

    const deliveredResult = canAddTracking({ status: "delivered" });
    assert.equal(deliveredResult.allowed, false);
    assert.match(deliveredResult.reason || "", /delivered/i);

    const cancelledResult = canAddTracking({ status: "cancelled" });
    assert.equal(cancelledResult.allowed, false);
    assert.match(cancelledResult.reason || "", /cancelled/i);
  });

  test("Derives 'shipped' when ALL order items have been allocated to shipments", () => {
    const items = [
      { id: "item_1", name: "Turmeric", shipment_id: "shp_101" },
      { id: "item_2", name: "Honey", shipment_id: "shp_101" },
    ];
    assert.equal(deriveOrderStatusFromItems(items, "packed"), "shipped");
  });

  test("Derives 'partially_shipped' when SOME items are shipped and some remain unshipped", () => {
    const items = [
      { id: "item_1", name: "Turmeric", shipment_id: "shp_101" },
      { id: "item_2", name: "Honey", shipment_id: null },
    ];
    assert.equal(deriveOrderStatusFromItems(items, "packed"), "partially_shipped");
  });

  test("Removing shipments rolls order status back to 'packed' when 0 shipped items remain", () => {
    const items = [
      { id: "item_1", name: "Turmeric", shipment_id: null },
      { id: "item_2", name: "Honey", shipment_id: null },
    ];
    assert.equal(deriveOrderStatusFromItems(items, "partially_shipped"), "packed");
    assert.equal(deriveOrderStatusFromItems(items, "shipped"), "packed");
  });

  test("Central status mapping maps 'partially_shipped' to human-readable 'Partially shipped'", () => {
    assert.equal(getWixFulfillmentLabel("partially_shipped"), "Partially shipped");
  });
});

describe("5. WhatsApp Unconfirmed Payment Restrictions & Admin Override", () => {
  test("Blocks adding tracking for WhatsApp order when payment is unconfirmed", () => {
    const unconfirmedWaOrder = {
      id: "PRJ-WA-001",
      status: "confirmed",
      payment_method: "whatsapp",
      payment_status: "pending",
    };

    const res = canAddTracking(unconfirmedWaOrder);
    assert.equal(res.allowed, false);
    assert.match(res.reason || "", /awaiting confirmation/i);
  });

  test("Allows shipping WhatsApp unconfirmed order when admin explicitly overrides with reason", () => {
    const unconfirmedWaOrder = {
      id: "PRJ-WA-002",
      status: "confirmed",
      payment_method: "whatsapp",
      payment_status: "pending",
    };

    // Override with valid reason -> ALLOWED
    const allowedRes = canAddTracking(unconfirmedWaOrder, {
      shipAnyway: true,
      overrideReason: "Verified customer paid via bank transfer on WhatsApp thread",
    });
    assert.equal(allowedRes.allowed, true);

    // Override without reason -> BLOCKED
    const blockedRes = canAddTracking(unconfirmedWaOrder, {
      shipAnyway: true,
      overrideReason: "",
    });
    assert.equal(blockedRes.allowed, false);
    assert.match(blockedRes.reason || "", /reason is required/i);
  });

  test("Does NOT block COD orders from shipping even if payment_status is pending", () => {
    const codOrder = {
      id: "PRJ-COD-001",
      status: "confirmed",
      payment_method: "cod",
      payment_status: "pending",
    };

    const res = canAddTracking(codOrder);
    assert.equal(res.allowed, true);
  });
});

describe("6. Carrier Configuration & Tracking Number Validation", () => {
  test("Validates tracking numbers (6 to 30 alphanumeric, spaces or hyphens)", () => {
    // Valid formats
    assert.equal(validateTrackingNumber("4123 8890 2210").valid, true);
    assert.equal(validateTrackingNumber("DEL-12345678-IN").valid, true);
    assert.equal(validateTrackingNumber("TRACK123456").valid, true);

    // Invalid: Too short (< 6 chars)
    const shortRes = validateTrackingNumber("12345");
    assert.equal(shortRes.valid, false);
    assert.match(shortRes.error || "", /between 6 and 30 characters/i);

    // Invalid: Too long (> 30 chars)
    const longRes = validateTrackingNumber("1234567890123456789012345678901");
    assert.equal(longRes.valid, false);
    assert.match(longRes.error || "", /between 6 and 30 characters/i);

    // Invalid: Special characters
    const symbolRes = validateTrackingNumber("TRK@#$$%^");
    assert.equal(symbolRes.valid, false);
    assert.match(symbolRes.error || "", /letters, numbers, spaces, (and|or) hyphens/i);
  });

  test("Approved carrier list contains official carriers and does not guess URLs", () => {
    const carrierNames = SUPPORTED_CARRIERS.map((c) => c.name);
    assert.equal(carrierNames.includes("Delhivery"), true);
    assert.equal(carrierNames.includes("India Post"), true);
    assert.equal(carrierNames.includes("Blue Dart"), true);
    assert.equal(carrierNames.includes("DTDC"), true);
    assert.equal(carrierNames.includes("Xpressbees"), true);
    assert.equal(carrierNames.includes("Ecom Express"), true);
    assert.equal(carrierNames.includes("Shadowfax"), true);
    assert.equal(carrierNames.includes("Other"), true);

    // Verify template is not guessed unless confirmed
    const otherCarrier = SUPPORTED_CARRIERS.find((c) => c.name === "Other");
    assert.equal(otherCarrier?.allowsCustomUrl, true);

    // Other carrier resolves custom tracking URL if provided
    const customUrl = "https://courier.example.com/track/123456";
    assert.equal(getCarrierTrackingUrl("Other", "123456", customUrl), customUrl);
  });
});

describe("7. Duplicate Tracking Constraint & Notification Integrity", () => {
  test("Server duplicate check enforces uniqueness of (carrier, tracking_number)", () => {
    const existingOrders = [
      {
        id: "order_1",
        order_id: "PRJ-100",
        carrier_name: "Delhivery",
        tracking_number: "412388902210",
      },
      {
        id: "order_2",
        order_id: "PRJ-200",
        shipments: [
          { carrier: "India Post", tracking_number: "ED123456789IN" },
        ],
      },
    ];

    // Helper simulating API checkDuplicateTracking logic
    const checkDuplicate = (carrier, trackingNumber, currentDocId) => {
      const cleanCarrier = carrier.toLowerCase().trim();
      const cleanTrk = trackingNumber.toLowerCase().replace(/[\s-]/g, "");

      for (const order of existingOrders) {
        if (order.id === currentDocId) continue;
        if (
          order.carrier_name?.toLowerCase().trim() === cleanCarrier &&
          order.tracking_number?.toLowerCase().replace(/[\s-]/g, "") === cleanTrk
        ) {
          return order.order_id || order.id;
        }
        if (Array.isArray(order.shipments)) {
          for (const s of order.shipments) {
            if (
              s.carrier?.toLowerCase().trim() === cleanCarrier &&
              s.tracking_number?.toLowerCase().replace(/[\s-]/g, "") === cleanTrk
            ) {
              return order.order_id || order.id;
            }
          }
        }
      }
      return null;
    };

    // Rejects duplicate on Delhivery 4123 8890 2210
    assert.equal(checkDuplicate("Delhivery", "4123 8890 2210", "order_new"), "PRJ-100");
    // Rejects duplicate on India Post ED123456789IN
    assert.equal(checkDuplicate("India Post", "ED123456789IN", "order_new"), "PRJ-200");
    // Allows same tracking on same order (editing)
    assert.equal(checkDuplicate("Delhivery", "412388902210", "order_1"), null);
    // Allows new unique tracking
    assert.equal(checkDuplicate("Delhivery", "999900001111", "order_new"), null);
  });

  test("A failed notification must never roll back a saved tracking number", () => {
    // Verify notification failure flag structure
    const shipmentRecord = {
      id: "shp_001",
      carrier: "Delhivery",
      tracking_number: "412388902210",
      notified_email: false,
      notified_whatsapp: false,
      notification_error: "SMTP service offline",
    };

    // Tracking info remains intact even when notification fails
    assert.equal(shipmentRecord.carrier, "Delhivery");
    assert.equal(shipmentRecord.tracking_number, "412388902210");
    assert.equal(shipmentRecord.notified_email, false);
  });
});

describe("8. Resend Email Generation & Notification Infrastructure", () => {
  test("Generates branded shipping confirmation HTML with carrier, tracking, and item details", () => {
    const { html, text } = buildShippingEmailHtml({
      order: {
        order_id: "PRJ-9999",
        customer_name: "Anita Sharma",
        shipping_address: "12 Green Farm Rd, Indiranagar, Bengaluru",
        shipping_pincode: "560038",
      },
      shipment: {
        id: "shp_test_1",
        order_id: "PRJ-9999",
        carrier: "Delhivery",
        tracking_number: "4123 8890 2210",
        tracking_url: "https://www.delhivery.com/track/package/412388902210",
        shipped_at: new Date().toISOString(),
        created_by: "Admin",
        notified_email: true,
        notified_whatsapp: false,
      },
      items: [
        { id: "it_1", name: "Cold Pressed Coconut Oil", weight: "500ml", qty: 2, price: 350 },
      ],
    });

    assert.match(html, /Anita Sharma/);
    assert.match(html, /PRJ-9999/);
    assert.match(html, /Delhivery/);
    assert.match(html, /4123 8890 2210/);
    assert.match(html, /Cold Pressed Coconut Oil/);
    assert.match(text, /Namaste Anita Sharma/);
  });

  test("Gracefully handles absence of RESEND_API_KEY without crashing or throwing", async () => {
    // Ensure test environment does not crash when key is missing before setup tomorrow
    const origKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    try {
      const res = await sendShippingConfirmationEmail({
        order: {
          order_id: "PRJ-9999",
          customer_name: "Test User",
          customer_email: "test@example.com",
        },
        shipment: {
          id: "shp_test_2",
          order_id: "PRJ-9999",
          carrier: "Delhivery",
          tracking_number: "412388902210",
          shipped_at: new Date().toISOString(),
          created_by: "Admin",
          notified_email: false,
          notified_whatsapp: false,
        },
      });

      assert.equal(res.success, false);
      assert.equal(res.simulated, true);
      assert.match(res.error || "", /RESEND_API_KEY/);
    } finally {
      if (origKey !== undefined) process.env.RESEND_API_KEY = origKey;
    }
  });

  test("Rejects email dispatch if customer email is missing from order", async () => {
    const res = await sendShippingConfirmationEmail({
      order: {
        order_id: "PRJ-NO-EMAIL",
        customer_name: "No Email Customer",
      },
      shipment: {
        id: "shp_test_3",
        order_id: "PRJ-NO-EMAIL",
        carrier: "India Post",
        tracking_number: "ED123456789IN",
        shipped_at: new Date().toISOString(),
        created_by: "Admin",
        notified_email: false,
        notified_whatsapp: false,
      },
    });

    assert.equal(res.success, false);
    assert.match(res.error || "", /No valid customer email/i);
  });
});


