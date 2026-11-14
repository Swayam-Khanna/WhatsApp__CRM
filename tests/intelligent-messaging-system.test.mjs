import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  processSmartCustomerReply,
  detectLanguage,
  detectCustomerIntent,
  resetConversationContext,
  setHumanAgentHandoff,
  releaseHumanAgentHandoff,
  getConversationContext,
} from "../backend/lib/smart-assistant.server.ts";

describe("WHATSAPP CRM — INTELLIGENT AUTOMATED MESSAGING & TEMPLATE SYSTEM", () => {
  const TEST_PHONE = "7018490629";

  test("1. English Product Enquiry: 'Tell me about your products.' must return catalogue, never generic welcome greeting", async () => {
    resetConversationContext(TEST_PHONE);

    const result = await processSmartCustomerReply({
      customerPhone: TEST_PHONE,
      customerText: "Tell me about your products.",
    });

    assert.equal(result.detectedLanguage, "en", "Language must be detected as English");
    assert.equal(result.intent, "catalogue_request", "Intent must be catalogue_request");
    assert.equal(result.shouldSend, true, "shouldSend must be true");
    assert.ok(result.replyText.includes("/catalogue"), "Must contain catalogue link");
    assert.ok(
      result.replyText.includes("catalogue") || result.replyText.includes("product"),
      "Must offer product catalogue"
    );
    assert.ok(!result.replyText.includes("kaise sahayata"), "Must NEVER send generic Hindi/Hinglish greeting");
    assert.ok(!result.replyText.includes("Aapki kya sahayata"), "Must NEVER send generic greeting");
  });

  test("2. Hinglish Product Enquiry: 'Aapke products ke baare mein batao.' must return Hinglish catalogue", async () => {
    resetConversationContext(TEST_PHONE);

    const result = await processSmartCustomerReply({
      customerPhone: TEST_PHONE,
      customerText: "Aapke products ke baare mein batao.",
    });

    assert.equal(result.detectedLanguage, "hinglish", "Language must be detected as Hinglish");
    assert.equal(result.intent, "catalogue_request", "Intent must be catalogue_request");
    assert.ok(result.replyText.includes("Hamara latest product catalogue yahan dekhein:"));
    assert.ok(result.replyText.includes("/catalogue"));
  });

  test("3. English Price Enquiry: 'What is the price of honey?' must share actual honey price in English", async () => {
    resetConversationContext(TEST_PHONE);

    const result = await processSmartCustomerReply({
      customerPhone: TEST_PHONE,
      customerText: "What is the price of honey?",
    });

    assert.equal(result.detectedLanguage, "en", "Language must be detected as English");
    assert.equal(result.intent, "price_enquiry", "Intent must be price_enquiry");
    assert.ok(result.replyText.includes("Himalayan Raw Flora Honey"), "Must specify exact honey name");
    assert.ok(result.replyText.includes("₹550"), "Must state live price ₹550");
    assert.ok(result.replyText.includes("500g Glass Jar"), "Must specify packaging variant");
    assert.ok(result.replyText.includes("#himalayan-multiflora-honey"), "Must provide direct product link");
  });

  test("4. Hinglish Price Enquiry: 'Honey kitne ka hai?' must share actual honey price in Hinglish", async () => {
    resetConversationContext(TEST_PHONE);

    const result = await processSmartCustomerReply({
      customerPhone: TEST_PHONE,
      customerText: "Honey kitne ka hai?",
    });

    assert.equal(result.detectedLanguage, "hinglish", "Language must be detected as Hinglish");
    assert.equal(result.intent, "price_enquiry", "Intent must be price_enquiry");
    assert.ok(result.replyText.includes("Himalayan Raw Flora Honey"));
    assert.ok(result.replyText.includes("ki price ₹550 hai"));
    assert.ok(result.replyText.includes("500g Glass Jar"));
    assert.ok(result.replyText.includes("#himalayan-multiflora-honey"));
  });

  test("5. English Order Request: 'I want to place an order.' must request product & quantity in English", async () => {
    resetConversationContext("9999900010");

    const result = await processSmartCustomerReply({
      customerPhone: "9999900010",
      customerText: "I want to place an order.",
    });

    assert.equal(result.detectedLanguage, "en");
    assert.equal(result.intent, "order_placement");
    assert.ok(result.replyText.includes("Please share the product and quantity you'd like to order."));
  });

  test("6. Hinglish Order Request: 'Mujhe order karna hai.' must request product & quantity in Hinglish", async () => {
    resetConversationContext("9999900011");

    const result = await processSmartCustomerReply({
      customerPhone: "9999900011",
      customerText: "Mujhe order karna hai.",
    });

    assert.equal(result.detectedLanguage, "hinglish");
    assert.equal(result.intent, "order_placement");
    assert.ok(result.replyText.includes("Product aur quantity bata dijiye ji, hum turant book kar denge."));
  });

  test("7. Existing Order Enquiry: 'Where is my order?' must check order status", async () => {
    resetConversationContext(TEST_PHONE);

    const result = await processSmartCustomerReply({
      customerPhone: TEST_PHONE,
      customerText: "Where is my order?",
    });

    assert.equal(result.detectedLanguage, "en");
    assert.equal(result.intent, "order_status");
    assert.ok(
      result.replyText.includes("order number") || result.replyText.includes("order #"),
      "Must ask for order number or return order status"
    );
  });

  test("8. Unclear Question: 'Can you help me with something unusual?' triggers human handoff fallback", async () => {
    resetConversationContext("9999900012");

    const result = await processSmartCustomerReply({
      customerPhone: "9999900012",
      customerText: "Can you help me with something unusual?",
    });

    assert.equal(result.detectedLanguage, "en");
    assert.equal(result.intent, "unclear_intent");
    assert.equal(result.handoffRequired, true, "Must require handoff");
    assert.ok(result.replyText.includes("Sorry, I couldn't understand your query. Our store admin will connect with you shortly."));
  });

  test("9. Language Switching: English product enquiry followed by Hinglish variant enquiry", async () => {
    resetConversationContext(TEST_PHONE);

    // Turn 1 in English
    const turn1 = await processSmartCustomerReply({
      customerPhone: TEST_PHONE,
      customerText: "Tell me about honey.",
    });
    assert.equal(turn1.detectedLanguage, "en", "Turn 1 must be English");
    assert.equal(turn1.intent, "product_enquiry");
    assert.ok(turn1.replyText.includes("Himalayan Raw Flora Honey"));

    // Turn 2 in Hinglish
    const turn2 = await processSmartCustomerReply({
      customerPhone: TEST_PHONE,
      customerText: "Achha, 500g kitne ka hai?",
    });
    assert.equal(turn2.detectedLanguage, "hinglish", "Turn 2 must switch to Hinglish");
    assert.equal(turn2.intent, "price_enquiry");
    assert.ok(turn2.replyText.includes("ki price ₹550 hai"), "Must reply in Hinglish with Honey price");
  });

  test("10. Multi-Message Conversation: Remembers product context and resolves follow-up quantity order", async () => {
    resetConversationContext(TEST_PHONE);

    // Step A: Customer explores Honey
    const stepA = await processSmartCustomerReply({
      customerPhone: TEST_PHONE,
      customerText: "Tell me about honey.",
    });
    assert.ok(stepA.replyText.includes("Himalayan Raw Flora Honey"));

    // Step B: Customer asks price of 500g
    const stepB = await processSmartCustomerReply({
      customerPhone: TEST_PHONE,
      customerText: "What is the price of 500g?",
    });
    assert.ok(stepB.replyText.includes("₹550"));

    // Step C: Customer says "I want two."
    const stepC = await processSmartCustomerReply({
      customerPhone: TEST_PHONE,
      customerText: "I want two.",
    });
    assert.equal(stepC.intent, "order_placement");
    assert.ok(stepC.replyText.includes("2 packs of Himalayan Raw Flora Honey (500g Glass Jar)"));
    assert.ok(stepC.replyText.includes("delivery name, full address, and pincode"));
  });

  test("11. Human Takeover: When Nishant ji takes over, automated replies pause immediately", async () => {
    const takeoverPhone = "9999900015";
    resetConversationContext(takeoverPhone);

    // Initial message handled by bot
    const msg1 = await processSmartCustomerReply({
      customerPhone: takeoverPhone,
      customerText: "Hi, what products do you have?",
    });
    assert.equal(msg1.shouldSend, true);

    // Nishant ji takes over the conversation
    setHumanAgentHandoff(takeoverPhone, "Nishant (Store Desk)");

    // Customer sends follow-up while human agent is active
    const msg2 = await processSmartCustomerReply({
      customerPhone: takeoverPhone,
      customerText: "Can you give me a discount on 5kg?",
    });
    assert.equal(msg2.shouldSend, false, "Automated replies must STOP while human agent is active");
    assert.equal(msg2.intent, "human_handoff");
    assert.equal(msg2.replyText, "");

    // When Nishant ji releases handoff
    releaseHumanAgentHandoff(takeoverPhone);

    const msg3 = await processSmartCustomerReply({
      customerPhone: takeoverPhone,
      customerText: "What is the price of honey?",
    });
    assert.equal(msg3.shouldSend, true, "Automated replies must resume after handoff is released");
    assert.equal(msg3.intent, "price_enquiry");
  });

  test("12. Webhook Idempotency: Duplicate incoming webhook does not produce duplicate replies", async () => {
    const { POST } = await import("../app/api/webhooks/whatsapp/route.ts");

    const duplicateWamid = `wamid.test_idempotency_${Date.now()}`;
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
                metadata: {
                  display_phone_number: "918091265690",
                  phone_number_id: "1370000716197872",
                },
                contacts: [{ profile: { name: "Rajat" }, wa_id: "917018490629" }],
                messages: [
                  {
                    from: "917018490629",
                    id: duplicateWamid,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: "text",
                    text: { body: "Tell me about your products." },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    // First POST
    const req1 = new Request("http://localhost:3000/api/webhooks/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-crm-source": "internal-test" },
      body: JSON.stringify(payload),
    });
    const res1 = await POST(req1);
    assert.equal(res1.status, 200);

    const feedBefore = [...(globalThis.__globalWhatsAppFeed || [])];
    const matchingBefore = feedBefore.filter((m) => m.id === duplicateWamid);
    assert.equal(matchingBefore.length, 1, "Exactly one inbound record created");

    // Second POST with identical wamid
    const req2 = new Request("http://localhost:3000/api/webhooks/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-crm-source": "internal-test" },
      body: JSON.stringify(payload),
    });
    const res2 = await POST(req2);
    assert.equal(res2.status, 200);

    const feedAfter = [...(globalThis.__globalWhatsAppFeed || [])];
    const matchingAfter = feedAfter.filter((m) => m.id === duplicateWamid);
    assert.equal(matchingAfter.length, 1, "Must NOT duplicate inbound message");
  });

  test("13. Hindi Devanagari End-to-End: Catalogue, Price, and Multi-turn Order in Hindi", async () => {
    const hindiPhone = "9999900016";
    resetConversationContext(hindiPhone);

    const h1 = await processSmartCustomerReply({
      customerPhone: hindiPhone,
      customerText: "मुझे आपके उत्पादों की जानकारी चाहिए।",
    });
    assert.equal(h1.detectedLanguage, "hi");
    assert.equal(h1.intent, "catalogue_request");
    assert.ok(h1.replyText.includes("जी बिल्कुल! हमारा पूरा प्रोडक्ट कैटलॉग यहाँ देखें:"));

    const h2 = await processSmartCustomerReply({
      customerPhone: hindiPhone,
      customerText: "शहद की कीमत क्या है?",
    });
    assert.equal(h2.detectedLanguage, "hi");
    assert.equal(h2.intent, "price_enquiry");
    assert.ok(h2.replyText.includes("की कीमत ₹550 है"));

    const h3 = await processSmartCustomerReply({
      customerPhone: hindiPhone,
      customerText: "मुझे दो पैक चाहिए।",
    });
    assert.equal(h3.detectedLanguage, "hi");
    assert.equal(h3.intent, "order_placement");
    assert.ok(h3.replyText.includes("बिल्कुल जी!"));
    assert.ok(h3.replyText.includes("2 पैक"));
  });

  test("14. Automated Dispatch & Shipping: No India Post link/id; Shipped, Location Reached, and Delivering Tomorrow", async () => {
    const {
      buildOrderShippedMessage,
      buildOrderTransitLocationMessage,
      buildOrderDeliveringTomorrowMessage,
    } = await import("../backend/lib/whatsapp.server.ts");

    // 1. Shipped Notification
    const shippedMsg = buildOrderShippedMessage({
      customerName: "Rajat",
      orderNumber: "PRJ-9021",
    });
    assert.ok(shippedMsg.includes("order #PRJ-9021 ship ho gaya hai"));
    assert.ok(!shippedMsg.includes("indiapost.gov.in"), "Must NOT contain indiapost link");
    assert.ok(!shippedMsg.includes("Consignment ID"), "Must NOT contain consignment ID");

    // 2. Location Reached Notification
    const locationMsg = buildOrderTransitLocationMessage({
      customerName: "Rajat",
      orderNumber: "PRJ-9021",
      location: "Delhi Sorting Hub",
    });
    assert.ok(locationMsg.includes("order #PRJ-9021 abhi *Delhi Sorting Hub* pahunch chuka hai"));
    assert.ok(!locationMsg.includes("indiapost.gov.in"));

    // 3. Delivering Tomorrow Notification
    const tomorrowMsg = buildOrderDeliveringTomorrowMessage({
      customerName: "Rajat",
      orderNumber: "PRJ-9021",
    });
    assert.ok(tomorrowMsg.includes("kal deliver ho jayega"));
    assert.ok(!tomorrowMsg.includes("indiapost.gov.in"));

    // 4. Smart assistant delivery enquiry without tracking link
    const res = await processSmartCustomerReply({
      customerPhone: "917018490629",
      customerText: "Where is my parcel? Has it been dispatched?",
    });
    assert.ok(!res.replyText.includes("indiapost.gov.in"), "Smart assistant reply must NOT include indiapost link");
    assert.ok(!res.replyText.includes("Consignment:"), "Smart assistant reply must NOT include Consignment ID");
  });

  test("15. Dispatch Enquiry: Intelligent automated response without third-party links or IDs", async () => {
    // A. Hinglish Dispatch Enquiry
    const r1 = await processSmartCustomerReply({
      customerPhone: "917018490629",
      customerText: "Namaste, mera parcel kab tak dispatch hoga?",
    });
    assert.ok(!r1.replyText.includes("indiapost.gov.in"), "Must NOT contain indiapost link");
    assert.ok(!r1.replyText.includes("Consignment"), "Must NOT contain consignment ID");
    assert.ok(
      r1.replyText.includes("dispatch") || r1.replyText.includes("ship") || r1.replyText.includes("2–3 din"),
      "Must explain dispatch timeline or shipment state in Hinglish"
    );

    // B. English Dispatch Enquiry
    const r2 = await processSmartCustomerReply({
      customerPhone: "917018490629",
      customerText: "When will you dispatch my order?",
    });
    assert.ok(!r2.replyText.includes("indiapost.gov.in"));
    assert.ok(
      r2.replyText.includes("dispatch") || r2.replyText.includes("ship") || r2.replyText.includes("2–3 days"),
      "Must explain dispatch timeline in English"
    );

    // C. Hindi Dispatch Enquiry
    const r3 = await processSmartCustomerReply({
      customerPhone: "917018490629",
      customerText: "मेरा आर्डर कब डिस्पैच होगा?",
    });
    assert.ok(!r3.replyText.includes("indiapost.gov.in"));
    assert.ok(
      r3.replyText.includes("डिस्पैच") || r3.replyText.includes("2-3 दिन") || r3.replyText.includes("शिप"),
      "Must explain dispatch timeline in Hindi"
    );
  });
});
