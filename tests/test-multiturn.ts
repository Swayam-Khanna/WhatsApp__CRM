import { processSmartCustomerReply } from "../backend/lib/smart-assistant.server";

async function run() {
  const testPhone = "919876543210";
  console.log("=== Multi-Turn Conversational Test ===");

  // Step 1: Customer asks about honey
  console.log("\n[User]: Aapke paas honey hai?");
  const res1 = await processSmartCustomerReply({
    customerPhone: testPhone,
    customerText: "Aapke paas honey hai?",
  });
  console.log(`[CRM Intent: ${res1.intent}, Template: ${res1.templateId}, Lang: ${res1.detectedLanguage}]`);
  console.log(`[CRM Reply]: ${res1.replyText}`);

  // Step 2: Customer asks short price query: "Kitne ka?"
  console.log("\n[User]: Kitne ka?");
  const res2 = await processSmartCustomerReply({
    customerPhone: testPhone,
    customerText: "Kitne ka?",
  });
  console.log(`[CRM Intent: ${res2.intent}, Template: ${res2.templateId}, Lang: ${res2.detectedLanguage}]`);
  console.log(`[CRM Reply]: ${res2.replyText}`);

  // Step 3: Customer says: "2 chahiye"
  console.log("\n[User]: 2 chahiye");
  const res3 = await processSmartCustomerReply({
    customerPhone: testPhone,
    customerText: "2 chahiye",
  });
  console.log(`[CRM Intent: ${res3.intent}, Template: ${res3.templateId}, Lang: ${res3.detectedLanguage}]`);
  console.log(`[CRM Reply]: ${res3.replyText}`);

  // Step 4: Customer says: "Bhej do"
  console.log("\n[User]: Bhej do");
  const res4 = await processSmartCustomerReply({
    customerPhone: testPhone,
    customerText: "Bhej do",
  });
  console.log(`[CRM Intent: ${res4.intent}, Template: ${res4.templateId}, Lang: ${res4.detectedLanguage}]`);
  console.log(`[CRM Reply]: ${res4.replyText}`);

  // Step 5: Customer sends expression: "Achha ji"
  console.log("\n[User]: Achha ji");
  const res5 = await processSmartCustomerReply({
    customerPhone: testPhone,
    customerText: "Achha ji",
  });
  console.log(`[CRM Intent: ${res5.intent}, Template: ${res5.templateId}, Lang: ${res5.detectedLanguage}]`);
  console.log(`[CRM Reply]: ${res5.replyText}`);

  // Step 6: Customer says: "Thank you so much"
  console.log("\n[User]: Thank you so much");
  const res6 = await processSmartCustomerReply({
    customerPhone: testPhone,
    customerText: "Thank you so much",
  });
  console.log(`[CRM Intent: ${res6.intent}, Template: ${res6.templateId}, Lang: ${res6.detectedLanguage}]`);
  console.log(`[CRM Reply]: ${res6.replyText}`);

  // Step 7: Customer asks bargaining: "Thoda kam kar do ji"
  console.log("\n[User]: Thoda kam kar do ji");
  const res7 = await processSmartCustomerReply({
    customerPhone: testPhone,
    customerText: "Thoda kam kar do ji",
  });
  console.log(`[CRM Intent: ${res7.intent}, Template: ${res7.templateId}, Lang: ${res7.detectedLanguage}]`);
  console.log(`[CRM Reply]: ${res7.replyText}`);

  // Step 8: Customer asks trust: "Product original hai?"
  console.log("\n[User]: Product original hai?");
  const res8 = await processSmartCustomerReply({
    customerPhone: testPhone,
    customerText: "Product original hai?",
  });
  console.log(`[CRM Intent: ${res8.intent}, Template: ${res8.templateId}, Lang: ${res8.detectedLanguage}]`);
  console.log(`[CRM Reply]: ${res8.replyText}`);

  // Step 9: Customer asks delivery: "COD available hai?"
  console.log("\n[User]: COD available hai?");
  const res9 = await processSmartCustomerReply({
    customerPhone: testPhone,
    customerText: "COD available hai?",
  });
  console.log(`[CRM Intent: ${res9.intent}, Template: ${res9.templateId}, Lang: ${res9.detectedLanguage}]`);
  console.log(`[CRM Reply]: ${res9.replyText}`);
}

run().catch(console.error);
