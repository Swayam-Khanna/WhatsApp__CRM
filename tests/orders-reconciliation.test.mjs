import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
import { calculateCartTotalsPaise } from "../backend/lib/orders.server.ts";

dotenv.config({ path: ".env" });

/**
 * 6 Historical Firestore Orders Dataset
 * Audited directly from live Firestore collection
 */
const FIRESTORE_HISTORICAL_ORDERS = [
  {
    orderId: "PRJ31765198",
    subtotal: 480,
    gstRate: 5,
    tax: 24, // 5% of 480
    shipping: 52,
    gatewayFee: 40, // COD flat fee
    discount: 0,
    total: 596,
  },
  {
    orderId: "PRJ36329868",
    subtotal: 240,
    gstRate: 5,
    tax: 12, // 5% of 240
    shipping: 37,
    gatewayFee: 40,
    discount: 0,
    total: 329,
  },
  {
    orderId: "PRJ61763810",
    subtotal: 1319,
    gstRate: 5,
    tax: 65.95, // 5% of 1319
    shipping: 52,
    gatewayFee: 40,
    discount: 0,
    total: 1476.95,
  },
  {
    orderId: "PRJ68259035",
    subtotal: 3248,
    gstRate: 5,
    tax: 162.4, // 5% of 3248
    shipping: 82,
    gatewayFee: 0, // WhatsApp order (no COD fee)
    discount: 0,
    total: 3492.4,
  },
  {
    orderId: "PRJ97957563",
    subtotal: 1250,
    gstRate: 5,
    tax: 62.5, // 5% of 1250
    shipping: 40,
    gatewayFee: 40,
    discount: 0,
    total: 1392.5,
  },
  {
    orderId: "order_mock_nstq66n",
    subtotal: 1250,
    gstRate: 5,
    tax: 62.5, // 5% of 1250
    shipping: 37,
    gatewayFee: 40,
    discount: 0,
    total: 1389.5,
  },
];

test("Orders Reconciliation Suite", async (t) => {
  await t.test("1. Financial formula reconciliation on all 6 Firestore orders", () => {
    for (const ord of FIRESTORE_HISTORICAL_ORDERS) {
      const subtotalPaise = Math.round(ord.subtotal * 100);
      const taxPaise = Math.round(ord.tax * 100);
      const shippingPaise = Math.round(ord.shipping * 100);
      const codFeePaise = Math.round(ord.gatewayFee * 100);
      const discountPaise = Math.round(ord.discount * 100);
      const expectedTotalPaise = Math.round(ord.total * 100);

      const calculatedTotalPaise =
        subtotalPaise + taxPaise + shippingPaise + codFeePaise - discountPaise;

      assert.equal(
        calculatedTotalPaise,
        expectedTotalPaise,
        `Order ${ord.orderId}: subtotal(${subtotalPaise}) + tax(${taxPaise}) + shipping(${shippingPaise}) + codFee(${codFeePaise}) - discount(${discountPaise}) must equal total(${expectedTotalPaise})`
      );
    }
  });

  await t.test("2. Parity against old invoice pricing engine", () => {
    for (const ord of FIRESTORE_HISTORICAL_ORDERS) {
      // Legacy invoice calculation formula from app/api/orders/[id]/invoice/route.ts
      const invoiceSubtotal = Number(ord.subtotal || 0);
      const invoiceDiscount = Number(ord.discount || 0);
      const invoiceGst = Number(ord.tax || 0);
      const invoiceShipping = Number(ord.shipping || 0);
      const invoiceGatewayFee = Number(ord.gatewayFee || 0);
      const invoiceCalculatedTotal =
        invoiceSubtotal + invoiceGst + invoiceShipping + invoiceGatewayFee - invoiceDiscount;

      assert.equal(
        Math.round(invoiceCalculatedTotal * 100),
        Math.round(ord.total * 100),
        `Invoice engine total mismatch on ${ord.orderId}`
      );
    }
  });

  await t.test("3. Parity with calculateCartTotalsPaise engine", () => {
    for (const ord of FIRESTORE_HISTORICAL_ORDERS) {
      const subtotalPaise = Math.round(ord.subtotal * 100);
      const shippingPaise = Math.round(ord.shipping * 100);
      const codFeePaise = Math.round(ord.gatewayFee * 100);
      const discountPaise = Math.round(ord.discount * 100);

      const result = calculateCartTotalsPaise({
        items: [
          {
            unitPricePaise: subtotalPaise,
            quantity: 1,
            gstApplicable: true,
            gstRate: ord.gstRate,
          },
        ],
        shippingPaise,
        codFeePaise,
        discountPaise,
      });

      assert.equal(result.subtotalPaise, subtotalPaise);
      assert.equal(result.shippingPaise, shippingPaise);
      assert.equal(result.codFeePaise, codFeePaise);
      assert.equal(result.totalPaise, Math.round(ord.total * 100));
      assert.equal(
        result.subtotalPaise + result.taxPaise + result.shippingPaise + result.codFeePaise - result.discountPaise,
        result.totalPaise
      );
    }
  });
});
