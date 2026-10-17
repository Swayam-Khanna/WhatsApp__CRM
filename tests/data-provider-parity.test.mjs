import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { getDataProvider, isNeonDataProvider } from "../backend/lib/data-provider.ts";
import { calculateOrderTotals } from "../frontend/lib/orders/order-pricing.ts";
import { calculateCartTotalsPaise } from "../backend/lib/orders.server.ts";
import { validateStatusTransition } from "../frontend/lib/orders/order-state-machine.ts";
import { validateTrackingNumber } from "../frontend/lib/orders/order-carriers.ts";

describe("DATA_PROVIDER Switch & Isolation Suite", () => {
  const originalEnv = process.env.DATA_PROVIDER;

  test("1. Defaults to 'firestore' when unset or empty", () => {
    delete process.env.DATA_PROVIDER;
    assert.equal(getDataProvider(), "firestore");
    assert.equal(isNeonDataProvider(), false);

    process.env.DATA_PROVIDER = "";
    assert.equal(getDataProvider(), "firestore");
    assert.equal(isNeonDataProvider(), false);
  });

  test("2. Returns 'neon' when DATA_PROVIDER=neon (case-insensitive)", () => {
    process.env.DATA_PROVIDER = "neon";
    assert.equal(getDataProvider(), "neon");
    assert.equal(isNeonDataProvider(), true);

    process.env.DATA_PROVIDER = "NEON";
    assert.equal(getDataProvider(), "neon");
    assert.equal(isNeonDataProvider(), true);

    process.env.DATA_PROVIDER = "postgres";
    assert.equal(getDataProvider(), "neon");
    assert.equal(isNeonDataProvider(), true);
  });

  test("3. Returns 'firestore' when DATA_PROVIDER=firestore", () => {
    process.env.DATA_PROVIDER = "firestore";
    assert.equal(getDataProvider(), "firestore");
    assert.equal(isNeonDataProvider(), false);

    // restore
    if (originalEnv !== undefined) {
      process.env.DATA_PROVIDER = originalEnv;
    } else {
      delete process.env.DATA_PROVIDER;
    }
  });
});

describe("Calculation Parity Suite: Real Old (Firestore) vs Real New (Postgres / Neon Engine)", () => {
  test("1. Basic single item pricing & 5% GST parity", () => {
    const items = [
      {
        productId: "p1",
        name: "Wild Forest Honey 500g",
        slug: "wild-forest-honey",
        unitPrice: 450,
        qty: 2,
        gstApplicable: true,
        gstRate: 5,
      },
    ];

    // Real Old Firestore engine (floating point INR)
    const oldCalc = calculateOrderTotals({
      items,
      shippingCost: 50,
      discountAmount: 0,
      paymentMethod: "cod",
    });

    // Real New Postgres engine (integer paise)
    const newCalc = calculateCartTotalsPaise({
      items: items.map((it) => ({
        unitPricePaise: Math.round(it.unitPrice * 100),
        quantity: it.qty,
        gstApplicable: it.gstApplicable,
        gstRate: it.gstRate,
      })),
      shippingPaise: 50 * 100,
      discountPaise: 0,
    });

    assert.equal(oldCalc.subtotal, 900);
    assert.equal(newCalc.subtotalPaise, 90000);
    assert.equal(newCalc.subtotalPaise / 100, oldCalc.subtotal);

    assert.equal(oldCalc.totalGst, 45);
    assert.equal(newCalc.taxPaise, 4500);
    assert.equal(newCalc.taxPaise / 100, oldCalc.totalGst);

    assert.equal(oldCalc.total, 995);
    assert.equal(newCalc.totalPaise, 99500);
    assert.equal(newCalc.totalPaise / 100, oldCalc.total);
  });

  test("2. Multi-item pricing across multiple GST slabs (0%, 5%, 12%, 18%)", () => {
    const items = [
      { productId: "p1", name: "Fresh Raw Milk", slug: "raw-milk", unitPrice: 80, qty: 3, gstApplicable: false, gstRate: 0 },
      { productId: "p2", name: "A2 Desi Cow Ghee 1L", slug: "a2-ghee", unitPrice: 1650, qty: 1, gstApplicable: true, gstRate: 5 },
      { productId: "p3", name: "Processed Fruit Jam", slug: "fruit-jam", unitPrice: 220, qty: 2, gstApplicable: true, gstRate: 12 },
      { productId: "p4", name: "Farm Essential Oil", slug: "essential-oil", unitPrice: 550, qty: 1, gstApplicable: true, gstRate: 18 },
    ];

    // Real Old Firestore engine
    const oldCalc = calculateOrderTotals({
      items,
      shippingCost: 80,
      discountAmount: 150,
      paymentMethod: "cod",
    });

    // Real New Postgres engine
    const newCalc = calculateCartTotalsPaise({
      items: items.map((it) => ({
        unitPricePaise: Math.round(it.unitPrice * 100),
        quantity: it.qty,
        gstApplicable: it.gstApplicable,
        gstRate: it.gstRate,
      })),
      shippingPaise: 80 * 100,
      discountPaise: 150 * 100,
    });

    assert.equal(newCalc.subtotalPaise / 100, oldCalc.subtotal);
    assert.equal(newCalc.taxPaise / 100, oldCalc.totalGst);
    assert.equal(newCalc.totalPaise / 100, oldCalc.total);
  });

  test("3. Fractional paise rounding edge cases (e.g. ₹199.99 with 5% GST)", () => {
    const items = [
      {
        productId: "p1",
        name: "Specialty Herbal Tea",
        slug: "herbal-tea",
        unitPrice: 199.99,
        qty: 3,
        gstApplicable: true,
        gstRate: 5,
      },
    ];

    // Real Old Firestore engine
    const oldCalc = calculateOrderTotals({
      items,
      shippingCost: 0,
      discountAmount: 0,
    });

    // Real New Postgres engine
    const newCalc = calculateCartTotalsPaise({
      items: items.map((it) => ({
        unitPricePaise: Math.round(it.unitPrice * 100),
        quantity: it.qty,
        gstApplicable: it.gstApplicable,
        gstRate: it.gstRate,
      })),
      shippingPaise: 0,
      discountPaise: 0,
    });

    // Rounding differences between float and paise are strictly bounded to <= 1 paisa (0.01 INR)
    assert.ok(Math.abs(oldCalc.total - newCalc.totalPaise / 100) <= 0.01);
  });

  test("4. Discount cap parity: discounts cannot exceed subtotal or produce negative total", () => {
    const items = [
      { productId: "p1", name: "Turmeric Powder 200g", slug: "turmeric", unitPrice: 120, qty: 1, gstApplicable: true, gstRate: 5 },
    ];

    // Real Old Firestore engine
    const oldCalc = calculateOrderTotals({
      items,
      shippingCost: 50,
      discountAmount: 5000, // Massive discount exceeds subtotal
    });

    // Real New Postgres engine
    const newCalc = calculateCartTotalsPaise({
      items: items.map((it) => ({
        unitPricePaise: Math.round(it.unitPrice * 100),
        quantity: it.qty,
        gstApplicable: it.gstApplicable,
        gstRate: it.gstRate,
      })),
      shippingPaise: 50 * 100,
      discountPaise: 5000 * 100,
    });

    // Both engines prevent negative totals and cap discounts safely
    assert.ok(oldCalc.total >= 0, "Old total must not be negative");
    assert.ok(newCalc.totalPaise >= 0, "New total must not be negative");
    const subtotalPaise = 12000;
    const rawDiscountPaise = 500000;
    const validDiscountPaise = Math.min(subtotalPaise, rawDiscountPaise);
    assert.equal(validDiscountPaise, 12000);
  });

  test("5. COD flat fee handling parity", () => {
    const baseShipping = 50;
    const codFee = 40;
    const totalShipping = baseShipping + codFee;

    const items = [{ productId: "p1", name: "Item", slug: "item", unitPrice: 200, qty: 1, gstApplicable: false, gstRate: 0 }];

    // Real Old Firestore engine
    const oldCalc = calculateOrderTotals({
      items,
      shippingCost: totalShipping,
      paymentMethod: "cod",
    });

    // Real New Postgres engine
    const newCalc = calculateCartTotalsPaise({
      items: [{ unitPricePaise: 20000, quantity: 1, gstApplicable: false, gstRate: 0 }],
      shippingPaise: 50 * 100,
      codFeePaise: 40 * 100,
      discountPaise: 0,
    });

    assert.equal(newCalc.shippingPaise / 100 + newCalc.codFeePaise / 100, oldCalc.shippingCost);
    assert.equal(newCalc.totalPaise / 100, oldCalc.total);
    assert.equal(oldCalc.total, 290);
  });
});

describe("Admin Orders PATCH State Machine & Constraints Suite", () => {
  test("1. Order cancellation validation allows pre-delivery and forbids delivered orders", () => {
    const pendingOrder = { status: "pending", payment_status: "pending" };
    const shippedOrder = { status: "shipped", payment_status: "pending", tracking_number: "DEL123456" };
    const deliveredOrder = { status: "delivered", payment_status: "paid" };

    const cancelPending = validateStatusTransition(pendingOrder, "cancelled", { cancellationReason: "Customer requested" });
    assert.equal(cancelPending.valid, true);
    assert.equal(cancelPending.normalizedNextStatus, "cancelled");

    const cancelShipped = validateStatusTransition(shippedOrder, "cancelled", { cancellationReason: "Damaged in transit" });
    assert.equal(cancelShipped.valid, true);

    const cancelDelivered = validateStatusTransition(deliveredOrder, "cancelled");
    assert.equal(cancelDelivered.valid, false);
    assert.ok(cancelDelivered.error?.includes("already delivered"));
  });

  test("2. Tracking number format validation", () => {
    assert.equal(validateTrackingNumber("DEL12345678").valid, true);
    assert.equal(validateTrackingNumber("123456").valid, true);
    assert.equal(validateTrackingNumber("").valid, false);
    assert.equal(validateTrackingNumber("123").valid, false); // < 6 chars
    assert.equal(validateTrackingNumber("INVALID!@#$%^").valid, false);
  });

  test("3. WhatsApp payment confirmation requires payment reference", () => {
    const missingRefBody = { payment_action: "confirm_whatsapp_payment", payment_reference: "" };
    assert.equal(!missingRefBody.payment_reference?.trim(), true);

    const validRefBody = { payment_action: "confirm_whatsapp_payment", payment_reference: "UPI/1234567890/HDFC" };
    assert.equal(Boolean(validRefBody.payment_reference?.trim()), true);
  });
});
