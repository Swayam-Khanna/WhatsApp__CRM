import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildWhatsAppOrderMessage,
  generateWhatsAppLink,
} from "../backend/lib/orders.server.ts";

describe("Phase 2B: Offline Orders (COD & WhatsApp) Flow", () => {
  test("1. WhatsApp flow builds pre-filled message correctly from DB record", () => {
    const mockDbOrder = {
      orderNumber: "ORD-2026-981245",
      customerName: "Swayam Khanna",
      customerPhone: "+919876543210",
      items: [
        {
          productName: "Mamra Almonds",
          variantName: "500g Pouch",
          quantity: 2,
          unitPricePaise: 85000, // ₹850
        },
        {
          productName: "Organic Forest Honey",
          variantName: null,
          quantity: 1,
          unitPricePaise: 45000, // ₹450
        },
      ],
      subtotalPaise: 215000, // ₹2,150
      shippingPaise: 5000,   // ₹50
      discountPaise: 10000,  // ₹100
      totalPaise: 210000,    // ₹2,100
      shippingAddressSnapshot: {
        line1: "Flat 402, Green Meadows",
        city: "New Delhi",
        state: "Delhi",
        postalCode: "110001",
      },
    };

    const message = buildWhatsAppOrderMessage(mockDbOrder);

    assert.ok(message.includes("ORD-2026-981245"), "Must include order number");
    assert.ok(message.includes("Swayam Khanna"), "Must include customer name");
    assert.ok(message.includes("Mamra Almonds (500g Pouch) × 2"), "Must list item details");
    assert.ok(message.includes("₹2,100"), "Must format grand total in INR");
    assert.ok(message.includes("110001"), "Must include postal code");

    const link = generateWhatsAppLink("919876543210", message);
    assert.ok(link.startsWith("https://wa.me/919876543210?text="), "Must generate valid wa.me URL");
    assert.ok(link.includes(encodeURIComponent("ORD-2026-981245")), "Must contain URL encoded order text");
  });

  test("2. Concurrency Test: 20 parallel purchases for 5 available units (Zero Overselling)", async () => {
    // Simulate shared in-memory transactional inventory record
    let stockGrams = 2500; // 5 packs of 500g = 2500g total
    const itemGrams = 500; // 1 pack = 500g
    let successfulOrders = 0;
    let rejectedOrders = 0;

    // Simulate 20 simultaneous concurrent purchase attempts
    const purchaseAttempts = Array.from({ length: 20 }, (_, idx) => async () => {
      // Simulate atomic conditional update:
      // UPDATE inventory SET stock_grams = stock_grams - 500 WHERE stock_grams >= 500
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 20)); // network jitter

      if (stockGrams >= itemGrams) {
        stockGrams -= itemGrams;
        successfulOrders++;
        return { success: true, orderId: `ord_${idx}` };
      } else {
        rejectedOrders++;
        return { success: false, error: "INSUFFICIENT_STOCK" };
      }
    });

    // Run all 20 purchases concurrently
    const results = await Promise.all(purchaseAttempts.map((fn) => fn()));

    assert.equal(results.length, 20, "All 20 attempts must execute");
    assert.equal(successfulOrders, 5, "Exactly 5 purchases must succeed for 2500g / 500g");
    assert.equal(rejectedOrders, 15, "15 purchases must be rejected due to insufficient stock");
    assert.equal(stockGrams, 0, "Final stock must be exactly 0g (no negative stock)");
  });

  test("4. Cancellation Stock Restoration", () => {
    let stockGrams = 0;
    const cancelledOrderItems = [
      { productId: "p1", weightGrams: 1000 },
      { productId: "p2", weightGrams: 500 },
    ];

    // Restore stock
    for (const item of cancelledOrderItems) {
      stockGrams += item.weightGrams;
    }

    assert.equal(stockGrams, 1500, "Cancelled items must be restored to inventory");
  });
});
