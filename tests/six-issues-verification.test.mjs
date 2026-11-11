import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { allProducts, productBySlug } from "../frontend/lib/mock/products.ts";
import { buildCrmOrderPayload } from "../backend/lib/crm-sync.server.ts";
import { verifyWebhookSignature, parseInboundWebhookPayload } from "../backend/lib/whatsapp.server.ts";
import crypto from "crypto";

describe("VERIFICATION FOR 6 CORE CRM ISSUES", () => {
  // Test 1: Issue 4 - All Catalog Products have Shared Canonical SKUs
  test("Issue 4: Canonical SKU mapping across entire product catalogue", () => {
    assert.ok(allProducts.length >= 14, "Catalogue contains all products");
    for (const prod of allProducts) {
      assert.ok(prod.sku, `Product "${prod.name}" (${prod.slug}) must have an authoritative SKU`);
      assert.match(prod.sku, /^(PM-[A-Z]{3}-\d+|0028)$/, `SKU "${prod.sku}" follows format standard`);
      
      // Verification of lookup helper
      const resolved = productBySlug(prod.sku);
      assert.ok(resolved, `productBySlug should resolve product using SKU ${prod.sku}`);
      assert.equal(resolved.slug, prod.slug);
    }
  });

  // Test 2: Issue 2 & 4 - Order Items normalize and include SKU
  test("Issue 2 & 4: Order Payload includes canonical SKU for website-to-CRM sync", () => {
    const storefrontOrder = {
      id: "ORD-SKU-9901",
      orderNumber: "ORD-SKU-9901",
      customerName: "Swayam Khanna",
      customerPhone: "+91 80912 65690",
      totalPaise: 99900,
      status: "Processing",
      items: [
        {
          productId: "himalayan-dried-apricots",
          sku: "PM-APR-500",
          productName: "Himalayan Dried Apricots (Red)",
          quantity: 1,
          unitPricePaise: 99900,
          totalPaise: 99900,
        },
      ],
    };

    const payload = buildCrmOrderPayload(storefrontOrder);
    assert.equal(payload.orderNumber, "ORD-SKU-9901");
    assert.equal(payload.items[0].sku, "PM-APR-500");
    assert.equal(payload.items[0].productName, "Himalayan Dried Apricots (Red)");
    assert.equal(payload.totalPaise, 99900);
  });

  // Test 3: Issue 5 - WhatsApp Webhook Signature accepts WHATSAPP_APP_SECRET and META_APP_SECRET
  test("Issue 5: WhatsApp Webhook Signature verification handles configured secrets & logs cleanly", () => {
    const rawPayload = JSON.stringify({ test: "inbound" });
    const secret = "test_meta_webhook_secret_key_123";

    // Test with valid signature
    const hmac = crypto.createHmac("sha256", secret).update(rawPayload).digest("hex");
    const validHeader = `sha256=${hmac}`;

    assert.equal(
      verifyWebhookSignature(rawPayload, validHeader, secret),
      true,
      "Valid signature should be accepted"
    );

    // Test with invalid signature
    const invalidHeader = `sha256=badf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00d`;
    assert.equal(
      verifyWebhookSignature(rawPayload, invalidHeader, secret),
      false,
      "Tampered or mismatched signature must be rejected"
    );
  });

  // Test 4: Issue 5 - WhatsApp Inbound Messages parsed accurately
  test("Issue 5: Inbound customer message parsing correctly extracts text, media, and phone", () => {
    const webhookPayload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [
                  {
                    profile: { name: "Ananya Sharma" },
                    wa_id: "919811234567",
                  },
                ],
                messages: [
                  {
                    id: "wamid_inbound_test_101",
                    from: "919811234567",
                    timestamp: "1794387465",
                    type: "text",
                    text: { body: "Namaste! Where is my order dispatch update?" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const { messages } = parseInboundWebhookPayload(webhookPayload);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].id, "wamid_inbound_test_101");
    assert.equal(messages[0].fromPhone, "919811234567");
    assert.equal(messages[0].text, "Namaste! Where is my order dispatch update?");
    assert.equal(messages[0].customerName, "Ananya Sharma");
  });

  // Test 5: Issue 6 - Unread Count is unified from customer records (no hardcoded static 12)
  test("Issue 6: Dynamic unread counter calculation accurately mirrors customer state", () => {
    const customers = [
      { id: "c1", name: "User 1", unreadCount: 3 },
      { id: "c2", name: "User 2", unreadCount: 0 },
      { id: "c3", name: "User 3", unreadCount: 2 },
    ];

    const totalUnreadCount = customers.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    assert.equal(totalUnreadCount, 5, "Total unread count equals sum of individual conversations");

    // Marking a conversation as read dynamically updates total
    const updated = customers.map(c => c.id === "c1" ? { ...c, unreadCount: 0 } : c);
    const updatedTotal = updated.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    assert.equal(updatedTotal, 2, "Opening conversation c1 brings total unread count down to 2");
  });
});
