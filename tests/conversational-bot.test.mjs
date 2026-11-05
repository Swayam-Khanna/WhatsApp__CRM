import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  extractCustomerNameFromText,
  processConversationalBotReply,
  generateAutomatedCustomerReply,
} from "../backend/lib/whatsapp.server.ts";

describe("PRAJNAA MARKET & CRM — CONVERSATIONAL BOT & CONTACT DISCOVERY", () => {
  test("1. Extract Customer Name from Natural Introductions", () => {
    assert.equal(extractCustomerNameFromText("Mera naam Rajat Sharma hai"), "Rajat Sharma");
    assert.equal(extractCustomerNameFromText("my name is Suresh"), "Suresh");
    assert.equal(extractCustomerNameFromText("I am Amit Kumar"), "Amit Kumar");
    assert.equal(extractCustomerNameFromText("Rajat"), "Rajat");
    assert.equal(extractCustomerNameFromText("Kavita Bisht"), "Kavita Bisht");

    // Must not misclassify product queries as names
    assert.equal(extractCustomerNameFromText("Almonds"), null);
    assert.equal(extractCustomerNameFromText("Badam chahiye"), null);
    assert.equal(extractCustomerNameFromText("honey price"), null);
    assert.equal(extractCustomerNameFromText("Hi"), null);
    assert.equal(extractCustomerNameFromText("Cancel order"), null);
  });

  test("2. Unknown Sender Stage 1: Greeting & Name Prompt", () => {
    const unknownPhone = "919999900001";
    // First message from unknown sender
    const step1 = processConversationalBotReply({
      senderPhone: unknownPhone,
      senderText: "Hi, Prajnaa Market?",
    });

    assert.equal(step1.updatedCustomerName, undefined);
    assert.ok(step1.replyText.includes("Namaste ji! 🙏"), "Must greet warmly");
    assert.ok(step1.replyText.includes("shubh naam bata dijiye"), "Must ask for the customer's name");
  });

  test("3. Unknown Sender Stage 2: Name Captured & Auto-Saved to CRM Inbox", () => {
    const unknownPhone = "919999900002";
    // 1st msg
    processConversationalBotReply({
      senderPhone: unknownPhone,
      senderText: "Hello",
    });

    // 2nd msg providing name
    const step2 = processConversationalBotReply({
      senderPhone: unknownPhone,
      senderText: "Rajat",
    });

    assert.equal(step2.updatedCustomerName, "Rajat", "Must return updated customer name for CRM inbox contact saving");
    assert.ok(step2.replyText.includes("Bahut-bahut dhanyawad, Rajat ji!"), "Must thank customer by name");
    assert.ok(step2.replyText.includes("Aapka contact Prajnaa CRM inbox mein save kar liya gaya hai"), "Must confirm contact saving");
    assert.ok(step2.replyText.includes("Almonds (Badam)"), "Must ask how we can help and suggest dry fruits/honey/walnuts");
  });

  test("4. Customer Product Inquiry: Almonds / Badam Ordering Guidance", () => {
    const phone = "919999900003";
    // Known customer asks for almonds
    const almondInquiry = processConversationalBotReply({
      senderPhone: phone,
      existingCustomerName: "Rajat",
      senderText: "I want to order almonds",
    });

    assert.ok(almondInquiry.replyText.includes("Namaste Rajat ji! 🌿"), "Must address customer by name");
    assert.ok(almondInquiry.replyText.includes("Himalayan Mamra Giri Almonds"), "Must list Mamra Giri");
    assert.ok(almondInquiry.replyText.includes("₹1,250"), "Must state 500g price");
    assert.ok(almondInquiry.replyText.includes("₹2,400"), "Must state 1kg best value price");
    assert.ok(almondInquiry.replyText.includes("Kashmir Sweet Organic Almonds"), "Must list Kashmir Sweet option");
    assert.ok(almondInquiry.replyText.includes("Speed Post"), "Must explain Speed Post dispatch from Solan hub");
    assert.ok(almondInquiry.replyText.includes("prajnaa@upi"), "Must include official UPI");
  });

  test("5. Customer Provides Delivery Address & Pincode", () => {
    const phone = "919999900004";
    const addressInquiry = processConversationalBotReply({
      senderPhone: phone,
      existingCustomerName: "Rajat",
      senderText: "Outer Solan Road, Solan, Himachal Pradesh 173212",
    });

    assert.ok(addressInquiry.replyText.includes("delivery address note kar liya gaya hai"));
    assert.ok(addressInquiry.replyText.includes("prajnaa@upi"));
    assert.ok(addressInquiry.replyText.includes("Solan"));
  });

  test("6. Full Backward Compatibility with generateAutomatedCustomerReply", () => {
    const reply = generateAutomatedCustomerReply({
      customerName: "Rajat",
      customerQuery: "mera parcel kab dispatch hoga?",
    });

    assert.ok(reply.includes("Rajat ji"));
    assert.ok(reply.includes("Speed Post"));
  });

  test("7. Patron repeatedly sends messages without name - Must answer product inquiries without infinite name loop", () => {
    const patronPhone = "919805270369";
    // 1st message: Greeting
    const msg1 = processConversationalBotReply({
      senderPhone: patronPhone,
      existingCustomerName: "Patron (+91 98052 70369)",
      senderText: "Hi",
    });
    assert.ok(msg1.replyText.includes("shubh naam"), "First greeting asks for name");

    // 2nd message: Customer sends greeting again -> Must NOT repeat name request in a loop
    const msg2 = processConversationalBotReply({
      senderPhone: patronPhone,
      existingCustomerName: "Patron (+91 98052 70369)",
      senderText: "Hello",
    });
    assert.ok(!msg2.replyText.includes("shubh naam bata dijiye"), "Must not repeat name prompt repeatedly");
    assert.ok(msg2.replyText.includes("Prajnaa Market"), "Must give concierge welcome");

    // 3rd message: Customer asks for almonds directly
    const msg3 = processConversationalBotReply({
      senderPhone: patronPhone,
      existingCustomerName: "Patron (+91 98052 70369)",
      senderText: "I want to order almonds",
    });
    assert.ok(msg3.replyText.includes("Mamra Giri Almonds"), "Must answer almond inquiry immediately");
    assert.ok(msg3.replyText.includes("₹1,250"), "Must provide 500g pricing");
    assert.ok(msg3.replyText.includes("₹2,400"), "Must provide 1kg pricing");

    // 4th message: Customer provides name
    const msg4 = processConversationalBotReply({
      senderPhone: patronPhone,
      existingCustomerName: "Patron (+91 98052 70369)",
      senderText: "Mera naam Vikram Singh hai",
    });
    assert.equal(msg4.updatedCustomerName, "Vikram Singh", "Captures Vikram Singh");
    assert.ok(msg4.replyText.includes("Vikram Singh ji"), "Greets Vikram Singh");

    // 5th message: Subsequent inquiry addresses by name
    const msg5 = processConversationalBotReply({
      senderPhone: patronPhone,
      senderText: "walnuts price?",
    });
    assert.ok(msg5.replyText.includes("Vikram Singh ji"), "Addresses with captured name");
    assert.ok(msg5.replyText.includes("Walnuts"), "Provides walnut details");
  });
});
