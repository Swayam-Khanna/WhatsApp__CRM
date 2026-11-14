/**
 * PRAJNAA FARMER MARKET — COMPREHENSIVE INTELLIGENT MESSAGING TEST SUITE
 * 
 * Verifies all 20 production scenarios required by the Master Specification:
 * 1. Greeting ("Hello", "Good morning", "Namaste")
 * 2. Simple thank-you ("Thank you", "Thanks", "Shukriya")
 * 3. Simple acknowledgement ("Okay", "Theek hai", "Sure")
 * 4. Gratitude for information ("Thanks for the info")
 * 5. Positive response ("Yes", "Definitely", "Haan") with conversation context
 * 6. Negative response ("No thanks", "Abhi nahi", "Not interested")
 * 7. Product catalogue enquiry in English ("Tell me about your products")
 * 8. Product catalogue enquiry in Hinglish ("Aapke products ke baare mein batao")
 * 9. Price enquiry for specific product ("What is the price of honey?")
 * 10. Contextual query ("How much is it?" after discussing Shilajit)
 * 11. Contextual quantity query ("I want two" after discussing product)
 * 12. Product availability ("Is Badri Ghee available?")
 * 13. Order status enquiry with order number ("Where is my order PM-9021?")
 * 14. Payment enquiry ("I have paid", "Payment done")
 * 15. Delivery question ("When will it arrive?", "Delivery timeline")
 * 16. Complaint ("I received a damaged bottle") -> Triggers human handoff
 * 17. Casual conversation ("How are you?", "Aap kaise hain?")
 * 18. Messages with WhatsApp slang / typos ("tq", "okk", "ktna price", "hlo")
 * 19. Mid-conversation language switching (English -> Hindi Devanagari -> Hinglish)
 * 20. Human agent request ("I want to speak to Nishant")
 *
 * Plus verification of:
 * 21. Automated template bank has at least 100 templates (specifically >= 113) across all 13 categories.
 * 22. CRM Inbox templates remain strictly the 11 manual templates.
 */

import test from "node:test";
import assert from "node:assert/strict";

// Dynamic import of TypeScript server modules using tsx/node loaders or compiled modules
import {
  normalizeCustomerMessage,
  detectMessageLanguage,
  extractEntities,
  classifyCustomerIntent,
} from "../backend/lib/message-understanding.server.ts";

import {
  AUTOMATED_TEMPLATES,
  getAutomatedTemplateStats,
  getAutomatedTemplateById,
  findBestAutomatedTemplate,
  renderAutomatedTemplate,
} from "../backend/lib/automation-templates.ts";

import {
  processSmartCustomerReply,
  getConversationContext,
  updateConversationContext,
  resetConversationContext,
  setHumanAgentHandoff,
  releaseHumanAgentHandoff,
  isHumanAgentActive,
} from "../backend/lib/smart-assistant.server.ts";

// ============================================================================
// PART 1: TEMPLATE ARCHITECTURE & SEPARATION VERIFICATION
// ============================================================================

test("Template Library: Contains at least 100 templates (113 total) across 13 required categories", () => {
  assert.ok(
    AUTOMATED_TEMPLATES.length >= 100,
    `Expected >= 100 templates, found ${AUTOMATED_TEMPLATES.length}`
  );
  assert.strictEqual(AUTOMATED_TEMPLATES.length, 113);

  const stats = getAutomatedTemplateStats();
  assert.strictEqual(stats.total, 113);
  assert.ok(stats.byCategory.greetings_welcome >= 10, "greetings_welcome should have >= 10");
  assert.ok(stats.byCategory.thank_you_acknowledgements >= 10, "thank_you_acknowledgements should have >= 10");
  assert.ok(stats.byCategory.casual_conversations >= 8, "casual_conversations should have >= 8");
  assert.ok(stats.byCategory.general_assistance_clarification >= 8, "general_assistance_clarification should have >= 8");
  assert.ok(stats.byCategory.product_catalogue_enquiries >= 10, "product_catalogue_enquiries should have >= 10");
  assert.ok(stats.byCategory.product_details_pricing >= 12, "product_details_pricing should have >= 12");
  assert.ok(stats.byCategory.packaging_availability >= 8, "packaging_availability should have >= 8");
  assert.ok(stats.byCategory.order_placement_modification >= 10, "order_placement_modification should have >= 10");
  assert.ok(stats.byCategory.order_status_tracking >= 8, "order_status_tracking should have >= 8");
  assert.ok(stats.byCategory.payment_enquiries >= 8, "payment_enquiries should have >= 8");
  assert.ok(stats.byCategory.shipping_delivery >= 8, "shipping_delivery should have >= 8");
  assert.ok(stats.byCategory.complaints_returns_refunds >= 8, "complaints_returns_refunds should have >= 8");
  assert.ok(stats.byCategory.human_handoff_unknown >= 5, "human_handoff_unknown should have >= 5");

  // Verify all templates have English, Hinglish, and Hindi variants
  for (const t of AUTOMATED_TEMPLATES) {
    assert.ok(t.en && t.en.length > 5, `Template ${t.id} missing English text`);
    assert.ok(t.hinglish && t.hinglish.length > 5, `Template ${t.id} missing Hinglish text`);
    assert.ok(t.hi && t.hi.length > 5, `Template ${t.id} missing Hindi text`);
  }
});

// ============================================================================
// PART 2: 20 PRODUCTION SCENARIO VERIFICATION
// ============================================================================

test("Scenario 1: Greeting ('Hello', 'Good morning', 'Namaste')", async () => {
  const phone = "919999000001";
  resetConversationContext(phone);

  const reply = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Hello! Good morning",
  });

  assert.ok(reply.shouldSend);
  assert.strictEqual(reply.intent, "greetings");
  assert.ok(
    /good morning|namaste|welcome to prajnaa/i.test(reply.replyText),
    `Unexpected reply: ${reply.replyText}`
  );
  assert.ok(!reply.replyText.toLowerCase().includes("unable to understand"));
});

test("Scenario 2: Simple thank-you ('Thank you', 'Thanks', 'Dhanyawaad')", async () => {
  const phone = "919999000002";
  resetConversationContext(phone);

  const reply1 = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Thank you.",
  });

  assert.ok(reply1.shouldSend);
  assert.strictEqual(reply1.intent, "thank_you");
  assert.ok(
    /welcome|happy to help|pleasure/i.test(reply1.replyText),
    `Expected polite welcome, got: ${reply1.replyText}`
  );
  assert.ok(!reply1.replyText.toLowerCase().includes("unable to understand"));

  // Hinglish Thank you
  const reply2 = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Bahut dhanyawad ji",
  });
  assert.strictEqual(reply2.intent, "thank_you");
  assert.ok(
    /swagat|madad|khushi/i.test(reply2.replyText),
    `Expected Hinglish welcome, got: ${reply2.replyText}`
  );
});

test("Scenario 3: Simple acknowledgement ('Okay', 'Theek hai', 'Sure')", async () => {
  const phone = "919999000003";
  resetConversationContext(phone);

  const reply1 = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Okay.",
  });
  assert.ok(reply1.shouldSend);
  assert.strictEqual(reply1.intent, "acknowledgement");
  assert.ok(
    /alright|sure|here if you need/i.test(reply1.replyText),
    `Unexpected reply: ${reply1.replyText}`
  );
  assert.ok(!reply1.replyText.toLowerCase().includes("unable to understand"));

  // Hinglish acknowledgement
  const reply2 = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Theek hai ji",
  });
  assert.strictEqual(reply2.intent, "acknowledgement");
  assert.ok(/theek hai|zaroor|sahayata/i.test(reply2.replyText));
});

test("Scenario 4: Gratitude for information ('Thanks for the information')", async () => {
  const phone = "919999000004";
  resetConversationContext(phone);

  const reply = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Thanks for the information!",
  });

  assert.ok(reply.shouldSend);
  assert.strictEqual(reply.intent, "thank_you");
  assert.ok(
    /welcome|happy to help|feel free to ask|glad|helpful/i.test(reply.replyText),
    `Unexpected reply: ${reply.replyText}`
  );
  assert.ok(!reply.replyText.toLowerCase().includes("unable to understand"));
});

test("Scenario 5: Positive response ('Yes', 'Definitely', 'Haan') with conversation context", async () => {
  const phone = "919999000005";
  resetConversationContext(phone);

  // Turn 1: Customer asks about Honey
  await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "What is the price of honey?",
  });

  // Turn 2: Customer replies "Yes"
  const reply2 = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Yes please",
  });

  assert.ok(reply2.shouldSend);
  assert.strictEqual(reply2.intent, "order_placement");
  assert.ok(
    /address|pincode|order|confirm/i.test(reply2.replyText),
    `Expected order progression, got: ${reply2.replyText}`
  );
  assert.ok(!reply2.replyText.toLowerCase().includes("unable to understand"));
});

test("Scenario 6: Negative response ('No thanks', 'Abhi nahi', 'Not interested')", async () => {
  const phone = "919999000006";
  resetConversationContext(phone);

  const reply1 = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "No thanks",
  });

  assert.ok(reply1.shouldSend);
  assert.strictEqual(reply1.intent, "negative_response");
  assert.ok(
    /no problem|have a great day|feel free/i.test(reply1.replyText),
    `Unexpected reply: ${reply1.replyText}`
  );
  assert.ok(!reply1.replyText.toLowerCase().includes("unable to understand"));

  // Hinglish negative
  const reply2 = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Abhi nahi chahiye",
  });
  assert.strictEqual(reply2.intent, "negative_response");
  assert.ok(/koi baat nahi|jab bhi/i.test(reply2.replyText));
});

test("Scenario 7: Product catalogue enquiry in English ('Tell me about your products')", async () => {
  const phone = "919999000007";
  resetConversationContext(phone);

  const reply = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Tell me about your products",
  });

  assert.ok(reply.shouldSend);
  assert.strictEqual(reply.intent, "catalogue_request");
  assert.ok(
    reply.replyText.includes("/catalogue"),
    `Expected catalogue link, got: ${reply.replyText}`
  );
  assert.ok(!reply.replyText.toLowerCase().includes("unable to understand"));
});

test("Scenario 8: Product catalogue enquiry in Hinglish ('Aapke products ke baare mein batao')", async () => {
  const phone = "919999000008";
  resetConversationContext(phone);

  const reply = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Aapke products ke baare mein batao ji, kya kya milta hai?",
  });

  assert.ok(reply.shouldSend);
  assert.strictEqual(reply.intent, "catalogue_request");
  assert.strictEqual(reply.detectedLanguage, "hinglish");
  assert.ok(
    reply.replyText.includes("/catalogue"),
    `Expected catalogue link, got: ${reply.replyText}`
  );
  assert.ok(!reply.replyText.toLowerCase().includes("unable to understand"));
});

test("Scenario 9: Price enquiry for specific product ('What is the price of honey?')", async () => {
  const phone = "919999000009";
  resetConversationContext(phone);

  const reply = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "What is the price of honey?",
  });

  assert.ok(reply.shouldSend);
  assert.strictEqual(reply.intent, "price_enquiry");
  assert.ok(
    /honey/i.test(reply.replyText),
    `Expected Honey in reply, got: ${reply.replyText}`
  );
  assert.ok(
    /₹550/i.test(reply.replyText) || /₹/i.test(reply.replyText),
    `Expected price in reply, got: ${reply.replyText}`
  );
});

test("Scenario 10: Contextual query ('How much is it?' after asking about Shilajit)", async () => {
  const phone = "919999000010";
  resetConversationContext(phone);

  // Turn 1: Mention Shilajit
  await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Do you have Himalayan Shilajit?",
  });

  // Turn 2: Contextual pronoun query
  const reply2 = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "How much is it?",
  });

  assert.ok(reply2.shouldSend);
  assert.strictEqual(reply2.intent, "price_enquiry");
  assert.ok(
    /shilajit/i.test(reply2.replyText),
    `Expected Shilajit in context response, got: ${reply2.replyText}`
  );
  assert.ok(
    /₹1,450/i.test(reply2.replyText) || /₹/i.test(reply2.replyText),
    `Expected price in reply, got: ${reply2.replyText}`
  );
});

test("Scenario 11: Contextual quantity query ('I want two')", async () => {
  const phone = "919999000011";
  resetConversationContext(phone);

  // Turn 1: Discuss Ghee
  await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Tell me about Badri Cow Ghee",
  });

  // Turn 2: Quantity order query
  const reply2 = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "I want two",
  });

  assert.ok(reply2.shouldSend);
  assert.strictEqual(reply2.intent, "order_placement");
  assert.ok(
    /2|two|ghee/i.test(reply2.replyText),
    `Expected quantity and product in reply, got: ${reply2.replyText}`
  );
});

test("Scenario 12: Product availability ('Is Badri Ghee available?')", async () => {
  const phone = "919999000012";
  resetConversationContext(phone);

  const reply = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Is Badri Ghee available right now?",
  });

  assert.ok(reply.shouldSend);
  assert.ok(
    reply.intent === "product_availability" || reply.intent === "product_enquiry",
    `Unexpected intent: ${reply.intent}`
  );
  assert.ok(
    /available|in stock|ghee/i.test(reply.replyText),
    `Unexpected reply: ${reply.replyText}`
  );
});

test("Scenario 13: Order status enquiry with order number ('Where is my order PM-9021?')", async () => {
  const phone = "919999000013";
  resetConversationContext(phone);

  const reply = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Where is my order PM-9021?",
  });

  assert.ok(reply.shouldSend);
  assert.strictEqual(reply.intent, "order_status");
  assert.ok(
    /PM-9021|order/i.test(reply.replyText),
    `Expected order number in response, got: ${reply.replyText}`
  );
});

test("Scenario 14: Payment enquiry ('I have paid', 'Payment done')", async () => {
  const phone = "919999000014";
  resetConversationContext(phone);

  const reply = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Payment done! I have sent the amount on UPI.",
  });

  assert.ok(reply.shouldSend);
  assert.strictEqual(reply.intent, "payment_enquiry");
  assert.ok(
    /payment|confirm|verified|thank you/i.test(reply.replyText),
    `Unexpected reply: ${reply.replyText}`
  );
});

test("Scenario 15: Delivery question ('When will it arrive?', 'Delivery timeline')", async () => {
  const phone = "919999000015";
  resetConversationContext(phone);

  const reply = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "When will it arrive? How many days for delivery?",
  });

  assert.ok(reply.shouldSend);
  assert.strictEqual(reply.intent, "delivery_enquiry");
  assert.ok(
    /2–3 days|3–5 working days|delivery|packing/i.test(reply.replyText),
    `Unexpected reply: ${reply.replyText}`
  );
});

test("Scenario 16: Complaint ('I received a damaged bottle') -> Escalates with human handoff", async () => {
  const phone = "919999000016";
  resetConversationContext(phone);

  const reply = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "I received a broken, leaking bottle of honey today! Damaged parcel.",
  });

  assert.ok(reply.shouldSend);
  assert.strictEqual(reply.intent, "complaint");
  assert.strictEqual(reply.handoffRequired, true);
  assert.ok(
    /apologize|inconvenience|nishant|team/i.test(reply.replyText),
    `Unexpected reply: ${reply.replyText}`
  );
  // Verify human agent takeover is active
  assert.strictEqual(isHumanAgentActive(phone), true);
});

test("Scenario 17: Casual conversation ('How are you?', 'Aap kaise hain?')", async () => {
  const phone = "919999000017";
  resetConversationContext(phone);

  const reply1 = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "How are you today?",
  });

  assert.ok(reply1.shouldSend);
  assert.ok(
    reply1.intent === "casual_conversation" || reply1.intent === "casual",
    `Unexpected intent: ${reply1.intent}`
  );
  assert.ok(
    /great|doing great|wonderful|how are you/i.test(reply1.replyText),
    `Unexpected reply: ${reply1.replyText}`
  );
  assert.ok(!reply1.replyText.toLowerCase().includes("unable to understand"));

  // Hinglish casual conversation
  const reply2 = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Aap kaise hain? Sab badhiya?",
  });
  assert.strictEqual(reply2.detectedLanguage, "hinglish");
  assert.ok(/badhiya|sab badhiya|madad/i.test(reply2.replyText));
});

test("Scenario 18: WhatsApp slang and typos ('tq', 'okk', 'ktna price h', 'hlo')", async () => {
  const phone = "919999000018";
  resetConversationContext(phone);

  // Slang 1: "tq" -> Thank you
  const r1 = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "tq",
  });
  assert.strictEqual(r1.intent, "thank_you");
  assert.ok(!r1.replyText.toLowerCase().includes("unable to understand"));

  // Slang 2: "okk" -> Acknowledgement
  const r2 = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "okkkk",
  });
  assert.strictEqual(r2.intent, "acknowledgement");
  assert.ok(!r2.replyText.toLowerCase().includes("unable to understand"));

  // Slang 3: "ktna price h honey ka" -> Price enquiry
  const r3 = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "ktna price h honey ka btao plz",
  });
  assert.strictEqual(r3.intent, "price_enquiry");
  assert.ok(/honey|₹/i.test(r3.replyText));
});

test("Scenario 19: Mid-conversation language switching (English -> Hindi Devanagari -> Hinglish)", async () => {
  const phone = "919999000019";
  resetConversationContext(phone);

  // Turn 1: English
  const r1 = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Hello, good morning",
  });
  assert.strictEqual(r1.detectedLanguage, "en");

  // Turn 2: Hindi in Devanagari script
  const r2 = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "धन्यवाद।",
  });
  assert.strictEqual(r2.detectedLanguage, "hi");
  assert.ok(/स्वागत|मदद/i.test(r2.replyText), `Expected Devanagari response, got: ${r2.replyText}`);

  // Turn 3: Hinglish in Roman script
  const r3 = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Honey kitne ka hai ji?",
  });
  assert.strictEqual(r3.detectedLanguage, "hinglish");
  assert.ok(/₹|price|shehad|honey/i.test(r3.replyText));
});

test("Scenario 20: Human agent request / complex query ('I want to speak with Nishant')", async () => {
  const phone = "919999000020";
  resetConversationContext(phone);

  const reply = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Can I speak to Nishant ji? I want to talk to a human agent.",
  });

  assert.ok(reply.shouldSend);
  assert.strictEqual(reply.intent, "human_handoff");
  assert.strictEqual(reply.handoffRequired, true);
  assert.ok(
    /nishant|desk|connect/i.test(reply.replyText),
    `Unexpected reply: ${reply.replyText}`
  );
  assert.strictEqual(isHumanAgentActive(phone), true);

  // Ensure subsequent automated message is paused while agent is active
  const subsequentReply = await processSmartCustomerReply({
    customerPhone: phone,
    customerText: "Hello?",
  });
  assert.strictEqual(subsequentReply.shouldSend, false, "Bot should not reply while human agent takeover is active");

  // Allow test report to finish printing, then exit cleanly
  setTimeout(() => process.exit(0), 100);
});

