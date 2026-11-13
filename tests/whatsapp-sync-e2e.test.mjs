import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { closeDatabase } from "../lib/mongodb.ts";

// Test suite for complete WhatsApp CRM message synchronization
describe("PRAJNAA WHATSAPP CRM — END-TO-END MESSAGE SYNCHRONIZATION", () => {
  const adminPhone = "918091265690";
  const testUnknownCustomerPhone = "919816099999";
  const testCustomerName = "Deepak Rawat";

  after(async () => {
    await closeDatabase();
  });

  it("1. Webhook Signature Verification rejects invalid signatures", async () => {
    const { verifyWebhookSignature } = await import("../backend/lib/whatsapp.server.ts");
    const payload = JSON.stringify({ test: "data" });
    const fakeSecret = "test_app_secret_12345";

    // Invalid signature
    const isValid = verifyWebhookSignature(payload, "sha256=invalidhexsignature", fakeSecret);
    assert.equal(isValid, false, "Must reject tampered or invalid sha256 signature");

    // Valid signature
    const validHmac = crypto.createHmac("sha256", fakeSecret).update(payload).digest("hex");
    const isValidReal = verifyWebhookSignature(payload, `sha256=${validHmac}`, fakeSecret);
    assert.equal(isValidReal, true, "Must accept valid sha256 HMAC signature");
  });

  it("2. Webhook payload parser extracts unknown contact, text, and media placeholders", async () => {
    const { parseInboundWebhookPayload } = await import("../backend/lib/whatsapp.server.ts");

    const mockMetaPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "1370000716197872",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "918091265690",
                  phone_number_id: "1370000716197872",
                },
                contacts: [
                  {
                    profile: { name: testCustomerName },
                    wa_id: testUnknownCustomerPhone,
                  },
                ],
                messages: [
                  {
                    from: testUnknownCustomerPhone,
                    id: "wamid.HBgLMjAyNjExMDUwMDAx",
                    timestamp: "1730800000",
                    type: "text",
                    text: { body: "Namaste, I want to order 1kg organic walnuts" },
                  },
                  {
                    from: testUnknownCustomerPhone,
                    id: "wamid.HBgLMjAyNjExMDUwMDAy",
                    timestamp: "1730800005",
                    type: "image",
                    image: {
                      id: "media_img_9988",
                      mime_type: "image/jpeg",
                      caption: "Payment screenshot for Walnuts",
                    },
                  },
                  {
                    from: testUnknownCustomerPhone,
                    id: "wamid.HBgLMjAyNjExMDUwMDAz",
                    timestamp: "1730800010",
                    type: "video",
                    video: {
                      id: "media_vid_1122",
                      mime_type: "video/mp4",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const { messages } = parseInboundWebhookPayload(mockMetaPayload);
    assert.equal(messages.length, 3, "Parsed all 3 incoming customer messages");

    // Text message
    assert.equal(messages[0].fromPhone, testUnknownCustomerPhone);
    assert.equal(messages[0].customerName, testCustomerName);
    assert.equal(messages[0].text, "Namaste, I want to order 1kg organic walnuts");

    // Image message
    assert.equal(messages[1].mediaId, "media_img_9988");
    assert.equal(messages[1].text, "Payment screenshot for Walnuts");

    // Video message (fallback placeholder)
    assert.equal(messages[2].mediaId, "media_vid_1122");
    assert.equal(messages[2].text, "[Video Attachment]");
  });

  it("3. Webhook handler persists unknown sender message & automated catalog reply to feed and database", async () => {
    const { POST } = await import("../app/api/webhooks/whatsapp/route.ts");

    const wamid = `wamid.test_${Date.now()}_unknown_send`;
    const mockPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "1370000716197872",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "918091265690",
                  phone_number_id: "1370000716197872",
                },
                contacts: [
                  {
                    profile: { name: "Anil Sharma" },
                    wa_id: "919816055555",
                  },
                ],
                messages: [
                  {
                    from: "919816055555",
                    id: wamid,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: "text",
                    text: { body: "Kya aapke paas organic Badam available hai?" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const req = new Request("http://localhost:3000/api/webhooks/whatsapp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-crm-source": "internal-test",
      },
      body: JSON.stringify(mockPayload),
    });

    const res = await POST(req);
    assert.equal(res.status, 200, "Webhook returns 200 OK");

    // Check in-memory feed
    const feed = globalThis.__globalWhatsAppFeed || [];
    const inbound = feed.find((m) => m.id === wamid);
    assert.ok(inbound, "Inbound message from unknown number must be present in WhatsApp feed");
    assert.equal(inbound.customerName, "Anil Sharma");
    assert.equal(inbound.direction, "inbound");
    assert.equal(inbound.sender, "customer");

    // Check automated reply
    const reply = feed.find((m) => (m.to || "").includes("9816055555") && m.direction === "outbound");
    assert.ok(reply, "Automated reply to customer must be generated");
    assert.ok(reply.text.includes("Almonds") || reply.text.includes("Badam") || reply.text.includes("sahayata"), "Reply provides Almonds availability info");
  });

  it("4. Webhook Idempotency: Duplicate incoming webhook does not duplicate message in feed", async () => {
    const { POST } = await import("../app/api/webhooks/whatsapp/route.ts");

    const wamid = `wamid.idempotent_${Date.now()}`;
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "1370000716197872",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                messages: [
                  {
                    from: "919816055555",
                    id: wamid,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: "text",
                    text: { body: "Idempotency test message" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    // Send 1st time
    await POST(new Request("http://localhost:3000/api/webhooks/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-crm-source": "internal-test" },
      body: JSON.stringify(payload),
    }));

    // Send 2nd time (duplicate)
    await POST(new Request("http://localhost:3000/api/webhooks/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-crm-source": "internal-test" },
      body: JSON.stringify(payload),
    }));

    const feed = globalThis.__globalWhatsAppFeed || [];
    const count = feed.filter((m) => m.id === wamid).length;
    assert.equal(count, 1, "Duplicate message ID must not be inserted twice into feed");
  });

  it("5. Delivery Status updates: sent -> delivered -> read (without downgrading)", async () => {
    const { POST } = await import("../app/api/webhooks/whatsapp/route.ts");

    const testMsgId = `wamid.status_test_${Date.now()}`;
    globalThis.__globalWhatsAppFeed = globalThis.__globalWhatsAppFeed || [];
    globalThis.__globalWhatsAppFeed.unshift({
      id: testMsgId,
      direction: "outbound",
      sender: "business",
      from: adminPhone,
      to: "919816055555",
      text: "Testing status lifecycle",
      timestamp: new Date().toISOString(),
      status: "sent",
    });

    // Step A: Status update to delivered
    const deliveredPayload = {
      object: "whatsapp_business_account",
      entry: [{
        id: "1370000716197872",
        changes: [{
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            statuses: [{ id: testMsgId, status: "delivered", timestamp: String(Math.floor(Date.now() / 1000)), recipient_id: "919816055555" }],
          },
        }],
      }],
    };
    await POST(new Request("http://localhost:3000/api/webhooks/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-crm-source": "internal-test" },
      body: JSON.stringify(deliveredPayload),
    }));

    let msg = globalThis.__globalWhatsAppFeed.find((m) => m.id === testMsgId);
    assert.equal(msg.status, "delivered", "Status updated to delivered");

    // Step B: Status update to read
    const readPayload = {
      object: "whatsapp_business_account",
      entry: [{
        id: "1370000716197872",
        changes: [{
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            statuses: [{ id: testMsgId, status: "read", timestamp: String(Math.floor(Date.now() / 1000)), recipient_id: "919816055555" }],
          },
        }],
      }],
    };
    await POST(new Request("http://localhost:3000/api/webhooks/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-crm-source": "internal-test" },
      body: JSON.stringify(readPayload),
    }));

    msg = globalThis.__globalWhatsAppFeed.find((m) => m.id === testMsgId);
    assert.equal(msg.status, "read", "Status updated to read");

    // Step C: Delayed 'delivered' event arrives after 'read' -> must NOT downgrade to delivered
    await POST(new Request("http://localhost:3000/api/webhooks/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-crm-source": "internal-test" },
      body: JSON.stringify(deliveredPayload),
    }));

    msg = globalThis.__globalWhatsAppFeed.find((m) => m.id === testMsgId);
    assert.equal(msg.status, "read", "Status must not be downgraded from read to delivered");
  });

  it("6. Both Inbound Customer message and Outbound CRM reply appear in the SAME conversation", async () => {
    const { POST: sendCrmMsg, GET: getCrmMsgs } = await import("../app/api/crm/messages/route.ts");

    const custPhone = "9816077777";
    const fullPhone = `+91 ${custPhone}`;

    // A. Inbound message from customer
    globalThis.__globalWhatsAppFeed = globalThis.__globalWhatsAppFeed || [];
    globalThis.__globalWhatsAppFeed.unshift({
      id: `msg_in_${Date.now()}`,
      direction: "inbound",
      sender: "customer",
      from: `91${custPhone}`,
      to: adminPhone,
      customerName: "Kunal Chauhan",
      text: "Can I get 2 packs of Flora Honey?",
      timestamp: new Date().toISOString(),
      status: "delivered",
    });

    // B. Outbound message sent by business via CRM
    const postReq = new Request("http://localhost:3000/api/crm/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: fullPhone,
        text: "Namaste Kunal ji! Yes, Flora honey is fresh from our mountain hives. Ready for dispatch!",
        customerId: `cust_wa_${custPhone}`,
      }),
    });
    const postRes = await sendCrmMsg(postReq);
    const postData = await postRes.json();
    assert.equal(postData.success, true, "Outbound message sent successfully");

    // C. Fetch all messages for this customer
    const getReq = new Request(`http://localhost:3000/api/crm/messages?phone=${custPhone}`);
    const getRes = await getCrmMsgs(getReq);
    const getData = await getRes.json();
    assert.equal(getData.success, true);

    const convMessages = getData.messages.filter(
      (m) => (m.from || "").includes(custPhone) || (m.to || "").includes(custPhone)
    );

    assert.ok(convMessages.length >= 2, "Conversation contains both inbound and outbound messages");

    const hasInbound = convMessages.some((m) => m.direction === "inbound" && m.text.includes("Flora Honey"));
    const hasOutbound = convMessages.some((m) => m.direction === "outbound" && m.text.includes("mountain hives"));

    assert.ok(hasInbound, "Customer's inbound message is in the conversation");
    assert.ok(hasOutbound, "Store's outbound reply is in the conversation");
  });
});
