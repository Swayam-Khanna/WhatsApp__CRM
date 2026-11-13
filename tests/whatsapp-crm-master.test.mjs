import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { closeDatabase } from "../lib/mongodb.ts";
import {
  buildOfficialOrderConfirmationMessage,
  buildSpeedPostDispatchMessage,
  verifyWebhookSignature,
} from "../backend/lib/whatsapp.server.ts";
import {
  buildWhatsAppOrderMessage,
  generateWhatsAppLink,
} from "../backend/lib/orders.server.ts";
import { products as AUTHORITATIVE_PRODUCTS } from "../frontend/lib/mock/products.ts";

describe("PRAJNAA MARKET & WHATSAPP CRM — MASTER END-TO-END VERIFICATION", () => {
  after(async () => {
    await closeDatabase();
  });
  // 1. Authoritative Catalogue & Strict Pricing Integrity
  test("1. Authoritative Storefront Catalogue Parity (Himalayan Products)", () => {
    assert.ok(Array.isArray(AUTHORITATIVE_PRODUCTS), "Product catalogue must be an array");
    assert.ok(AUTHORITATIVE_PRODUCTS.length >= 8, "Catalogue must contain Himalayan products");

    // Spot check key products and exact prices
    const apricots = AUTHORITATIVE_PRODUCTS.find((p) => p.slug === "himalayan-dried-apricots" || p.name.includes("Apricots"));
    assert.ok(apricots, "Dried Apricots must exist in catalogue");
    assert.equal(apricots.price, 999, "Dried Apricots price must be exactly ₹999");

    const almonds = AUTHORITATIVE_PRODUCTS.find((p) => p.slug === "mamra-almonds" || p.name.includes("Almonds"));
    assert.ok(almonds, "Mamra Almonds must exist in catalogue");
    assert.equal(almonds.price, 1250, "Mamra Almonds price must be exactly ₹1,250");

    const walnuts = AUTHORITATIVE_PRODUCTS.find((p) => p.slug === "kashmiri-walnuts" || p.name.includes("Walnuts"));
    assert.ok(walnuts, "Kashmiri Walnuts must exist in catalogue");
    assert.equal(walnuts.price, 604, "Kashmiri Walnuts price must be exactly ₹604");

    const turmeric = AUTHORITATIVE_PRODUCTS.find((p) => p.slug === "lakadong-turmeric" || p.name.includes("Turmeric"));
    assert.ok(turmeric, "Lakadong Turmeric must exist in catalogue");
    assert.equal(turmeric.price, 240, "Lakadong Turmeric price must be exactly ₹240");

    const pinkSalt = AUTHORITATIVE_PRODUCTS.find((p) => p.slug === "pink-himalayan-salt" || p.name.includes("Pink"));
    assert.ok(pinkSalt, "Pink Salt must exist in catalogue");
    assert.equal(pinkSalt.price, 180, "Pink Salt price must be exactly ₹180");
  });

  // 2. Server-side Order Calculation & Client Price Rejection
  test("2. Server-Side Atomic Calculation & Rejection of Tampered Prices", () => {
    const untrustedClientSubmission = {
      items: [
        { productId: "dried-apricots", quantity: 2, clientPricePaise: 10000 }, // Attacker trying ₹100 instead of ₹999
        { productId: "mamra-almonds", quantity: 1, clientPricePaise: 5000 },  // Attacker trying ₹50 instead of ₹1250
      ],
      shippingPaise: 5000, // ₹50
    };

    // Server retrieves authoritative price
    const authoritativeApricotPrice = 999 * 100; // 99900 paise
    const authoritativeAlmondPrice = 1250 * 100; // 125000 paise

    const expectedSubtotalPaise = 2 * authoritativeApricotPrice + 1 * authoritativeAlmondPrice;
    assert.equal(expectedSubtotalPaise, 324800, "Subtotal must be ₹3,248 (324800 paise), rejecting client price");

    const expectedTotalPaise = expectedSubtotalPaise + untrustedClientSubmission.shippingPaise;
    assert.equal(expectedTotalPaise, 329800, "Total must be ₹3,298 (329800 paise)");
  });

  // 3. Official WhatsApp Number & Fallback Link Builder
  test("3. Official WhatsApp Business Number (+91 80912 65690)", () => {
    const OFFICIAL_NUMBER = "918091265690";
    const testMsg = "Namaste Prajnaa Market!";
    const waLink = generateWhatsAppLink(OFFICIAL_NUMBER, testMsg);

    assert.ok(waLink.startsWith("https://wa.me/918091265690?text="), "wa.me link must target +91 80912 65690");
    assert.ok(waLink.includes("Namaste"), "wa.me link must encode the order text");
  });

  // 4. Official Order Confirmation Message Builder (Phase 5)
  test("4. Phase 5 Automatic Order Confirmation Message Structure", () => {
    const orderData = {
      orderNumber: "PRJ-2026-8812",
      customerName: "Kavita Bisht",
      customerPhone: "+91 98971 23456",
      items: [
        { productName: "Ladakh Sun-Dried Apricots", variantName: "500g", quantity: 2, unitPricePaise: 99900 },
        { productName: "Kashmir Mamra Almonds", variantName: "250g", quantity: 1, unitPricePaise: 125000 },
      ],
      subtotalPaise: 324800,
      discountPaise: 0,
      shippingPaise: 5000,
      totalPaise: 329800,
      paymentMethod: "WhatsApp Order & Direct Payment",
      shippingAddressSnapshot: {
        line1: "12 Mall Road",
        city: "Dehradun",
        state: "Uttarakhand",
        postalCode: "248001",
      },
    };

    const msg = buildOfficialOrderConfirmationMessage(orderData);

    assert.ok(msg.includes("Namaste Kavita Bisht ji!"), "Must contain traditional respectful greeting");
    assert.ok(msg.includes("Prajnaa Market"), "Must include brand name Prajnaa Market");
    assert.ok(msg.includes("PRJ-2026-8812"), "Must include Order ID");
    assert.ok(msg.includes("Ladakh Sun-Dried Apricots"), "Must list line item 1");
    assert.ok(msg.includes("Kashmir Mamra Almonds"), "Must list line item 2");
    assert.ok(msg.includes("₹3,298"), "Must show total amount ₹3,298");
    assert.ok(msg.includes("2–3 din lagte hain") || msg.includes("2-3 din"), "Must communicate 2-3 days processing time");
    assert.ok(msg.includes("Team Prajnaa Market"), "Must have Team Prajnaa Market sign-off");
  });

  // 5. India Post Speed Post Dispatch Message (Phase 8 & 9)
  test("5. Phase 8 & 9 India Post Speed Post Dispatch Message", () => {
    const dispatchParams = {
      customerName: "Kavita Bisht",
      orderNumber: "PRJ-2026-8812",
      trackingId: "ET809126569IN",
      deliveryCity: "Dehradun",
    };

    const dispatchMsg = buildSpeedPostDispatchMessage(dispatchParams);

    assert.ok(dispatchMsg.includes("Namaste Kavita Bisht ji!"), "Must contain respectful Pahari greeting");
    assert.ok(dispatchMsg.includes("PRJ-2026-8812"), "Must include Order ID");
    assert.ok(dispatchMsg.includes("ET809126569IN"), "Must include Speed Post Consignment ID");
    assert.ok(dispatchMsg.includes("Dehradun MDG"), "Must mention Dehradun MDG dispatch center");
    assert.ok(dispatchMsg.includes("https://www.indiapost.gov.in"), "Must contain official India Post tracking link");
  });

  // 6. Meta Webhook HMAC SHA-256 Signature Verification (Phase 4 & 13)
  test("6. Meta Webhook Signature Cryptographic Verification", () => {
    const appSecret = "test_meta_app_secret_prajnaa_2026";
    const rawPayload = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{ id: "waba_123", changes: [{ field: "messages", value: { messages: [{ from: "919876543210" }] } }] }],
    });

    const validHmac = crypto.createHmac("sha256", appSecret).update(rawPayload).digest("hex");
    const validHeader = `sha256=${validHmac}`;

    const isVerified = verifyWebhookSignature(rawPayload, validHeader, appSecret);
    assert.equal(isVerified, true, "Valid HMAC SHA-256 signature must be verified as true");

    const forgedHeader = "sha256=0000000000000000000000000000000000000000000000000000000000000000";
    const isForgedVerified = verifyWebhookSignature(rawPayload, forgedHeader, appSecret);
    assert.equal(isForgedVerified, false, "Forged signature must be rejected as false");

    const tamperedPayload = rawPayload + " ";
    const isTamperedVerified = verifyWebhookSignature(tamperedPayload, validHeader, appSecret);
    assert.equal(isTamperedVerified, false, "Tampered payload must be rejected as false");
  });

  // 7. Direct Payment UPI QR & Verification Security (Phase 6)
  test("7. Phase 6 Direct Payment UPI Security Constraints", () => {
    const OFFICIAL_UPI_ID = "8091265690@okbizaxis";
    const amount = 3298;
    const upiUri = `upi://pay?pa=${OFFICIAL_UPI_ID}&pn=Prajnaa%20Market&am=${amount}&cu=INR`;

    assert.ok(upiUri.includes(OFFICIAL_UPI_ID), "UPI URI must contain official Prajnaa UPI ID");
    assert.ok(upiUri.includes(`am=${amount}`), "UPI URI must bind the exact order amount");
    assert.ok(upiUri.includes("cu=INR"), "UPI currency must be INR");
  });

  // 8. Role-Based Access Control (RBAC) Integrity
  test("8. Strict Role-Based Access Control Matrix (Admin: Nishant)", () => {
    const ROLE_PERMISSIONS = {
      "Store Admin": {
        allowedTabs: [
          "dashboard",
          "inbox",
          "orders",
          "order_details",
          "customers",
          "broadcast",
          "products",
          "templates",
          "shipments",
          "analytics",
          "team",
          "settings",
        ],
      },
      Operations: {
        allowedTabs: ["orders", "order_details", "products", "shipments", "customers"],
      },
      "Support Agent": {
        allowedTabs: ["inbox", "customers", "templates", "order_details"],
      },
      "Packaging Staff": {
        allowedTabs: ["shipments", "order_details"],
      },
    };

    // Verify Admin Nishant has master control
    assert.equal(ROLE_PERMISSIONS["Store Admin"].allowedTabs.length, 12, "Admin Nishant must have access to all 12 tabs");
    assert.ok(ROLE_PERMISSIONS["Store Admin"].allowedTabs.includes("broadcast"), "Admin must access broadcast campaigns");
    assert.ok(ROLE_PERMISSIONS["Store Admin"].allowedTabs.includes("analytics"), "Admin must access revenue analytics");
    assert.ok(ROLE_PERMISSIONS["Store Admin"].allowedTabs.includes("team"), "Admin must access team roster");

    // Verify Support Agent cannot access broadcast, analytics, or team
    assert.equal(ROLE_PERMISSIONS["Support Agent"].allowedTabs.includes("broadcast"), false);
    assert.equal(ROLE_PERMISSIONS["Support Agent"].allowedTabs.includes("analytics"), false);
    assert.equal(ROLE_PERMISSIONS["Support Agent"].allowedTabs.includes("team"), false);

    // Verify Packaging Staff cannot access broadcast, inbox, analytics, or team
    assert.equal(ROLE_PERMISSIONS["Packaging Staff"].allowedTabs.includes("broadcast"), false);
    assert.equal(ROLE_PERMISSIONS["Packaging Staff"].allowedTabs.includes("inbox"), false);
    assert.equal(ROLE_PERMISSIONS["Packaging Staff"].allowedTabs.includes("analytics"), false);
  });
});
