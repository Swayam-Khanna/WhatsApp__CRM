import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

process.env.TEST_MODE = "true";

describe("PRAJNAA WHATSAPP CRM — AUTOMATIC ORDER CREATION & NOTIFICATIONS PIPELINE", () => {
  const testPhone = "917018490629";
  const customerName = "Rahul Sharma";

  beforeEach(async () => {
    // Clear drafts and memory
    const { saveCustomerOrderDraft } = await import("../backend/lib/whatsapp-order-service.server.ts");
    await saveCustomerOrderDraft(testPhone, null);
    if (globalThis.__createdWhatsAppOrderMsgIds) {
      globalThis.__createdWhatsAppOrderMsgIds.clear();
    }
  });

  it("Scenario C: Pure Product Enquiry does NOT create an order or order draft", async () => {
    const { evaluateWhatsAppOrderWorkflow, getCustomerOrderDraft } = await import(
      "../backend/lib/whatsapp-order-service.server.ts"
    );

    // Customer asks about product price
    const result1 = await evaluateWhatsAppOrderWorkflow({
      customerPhone: testPhone,
      customerText: "What is the price of almond?",
      customerName,
    });
    assert.equal(result1.isOrderWorkflow, false, "Price enquiry must not trigger order workflow");

    const draft1 = await getCustomerOrderDraft(testPhone);
    assert.equal(draft1, null, "No draft order should be created for price enquiry");

    // Customer asks about availability
    const result2 = await evaluateWhatsAppOrderWorkflow({
      customerPhone: testPhone,
      customerText: "Is raw flora honey available in stock?",
      customerName,
    });
    assert.equal(result2.isOrderWorkflow, false, "Stock enquiry must not trigger order workflow");

    const draft2 = await getCustomerOrderDraft(testPhone);
    assert.equal(draft2, null, "No draft order should be created for stock enquiry");
  });

  it("Scenario B: Missing Delivery Address prompts customer before confirming", async () => {
    const { evaluateWhatsAppOrderWorkflow, getCustomerOrderDraft } = await import(
      "../backend/lib/whatsapp-order-service.server.ts"
    );

    // Step 1: Customer requests 2 kg badam without address
    const step1 = await evaluateWhatsAppOrderWorkflow({
      customerPhone: testPhone,
      customerText: "Mujhe 2 kg badam chahiye",
      customerName,
      messageId: `wamid.test_${Date.now()}_step1`,
    });

    assert.equal(step1.isOrderWorkflow, true);
    assert.equal(step1.orderCreated, undefined, "Order must NOT be created prematurely");
    assert.ok(step1.replyText.includes("delivery address"), "Must ask for delivery address and pincode");
    assert.ok(step1.replyText.includes("Badam"), "Must mention the requested product");

    const draft = await getCustomerOrderDraft(testPhone);
    assert.ok(draft, "Draft must be preserved");
    assert.equal(draft.items.length, 1);
    assert.equal(draft.items[0].quantity, 2);
    assert.equal(draft.stage, "awaiting_address");

    // Step 2: Customer prematurely says "Haan ji" without giving address
    const step2 = await evaluateWhatsAppOrderWorkflow({
      customerPhone: testPhone,
      customerText: "Haan ji",
      customerName,
      messageId: `wamid.test_${Date.now()}_step2`,
    });

    assert.equal(step2.isOrderWorkflow, true);
    assert.equal(step2.orderCreated, undefined, "Still must NOT create order without address");
    assert.ok(step2.replyText.includes("delivery address"), "Must re-prompt for address");
  });

  it("Scenario D: Customer changes quantity before confirmation", async () => {
    const { evaluateWhatsAppOrderWorkflow, getCustomerOrderDraft } = await import(
      "../backend/lib/whatsapp-order-service.server.ts"
    );

    // Initial order intent: 2 packets
    await evaluateWhatsAppOrderWorkflow({
      customerPhone: testPhone,
      customerText: "Mujhe 2 packet badam chahiye",
      customerName,
      messageId: `wamid.test_${Date.now()}_d1`,
    });

    let draft = await getCustomerOrderDraft(testPhone);
    assert.equal(draft.items[0].quantity, 2);

    // Customer changes quantity: "Actually 3 packet chahiye"
    const updateResult = await evaluateWhatsAppOrderWorkflow({
      customerPhone: testPhone,
      customerText: "Actually 3 packet badam chahiye",
      customerName,
      messageId: `wamid.test_${Date.now()}_d2`,
    });

    assert.equal(updateResult.isOrderWorkflow, true);
    assert.ok(updateResult.replyText.includes("3x"), "Must reflect updated quantity of 3");

    draft = await getCustomerOrderDraft(testPhone);
    assert.equal(draft.items[0].quantity, 3, "Draft quantity must be updated to 3");
  });

  it("Scenario E: Customer cancels pending order", async () => {
    const { evaluateWhatsAppOrderWorkflow, getCustomerOrderDraft } = await import(
      "../backend/lib/whatsapp-order-service.server.ts"
    );

    // Start order
    await evaluateWhatsAppOrderWorkflow({
      customerPhone: testPhone,
      customerText: "Mujhe 2 kg badam chahiye",
      customerName,
      messageId: `wamid.test_${Date.now()}_e1`,
    });

    assert.ok(await getCustomerOrderDraft(testPhone));

    // Customer cancels
    const cancelResult = await evaluateWhatsAppOrderWorkflow({
      customerPhone: testPhone,
      customerText: "Cancel order, mujhe abhi nahi chahiye",
      customerName,
      messageId: `wamid.test_${Date.now()}_e2`,
    });

    assert.equal(cancelResult.isOrderWorkflow, true);
    assert.ok(cancelResult.replyText.includes("cancel"), "Must confirm cancellation politely");

    const draftAfterCancel = await getCustomerOrderDraft(testPhone);
    assert.equal(draftAfterCancel, null, "Draft must be cleared on cancellation");
  });

  it("Scenario A: Complete Order Flow with Confirmation, Atomic Creation & CRM Notification", async () => {
    const { evaluateWhatsAppOrderWorkflow } = await import(
      "../backend/lib/whatsapp-order-service.server.ts"
    );
    const { getStoredOrders, getStoredNotifications } = await import(
      "../backend/lib/crm-store.server.ts"
    );

    // Step 1: Customer provides order request with address
    const step1 = await evaluateWhatsAppOrderWorkflow({
      customerPhone: testPhone,
      customerText: "Mujhe 2 kg badam chahiye. Bhej dena H.No 45, Mall Road, Solan 173212",
      customerName,
      messageId: `wamid.test_${Date.now()}_a1`,
    });

    assert.equal(step1.isOrderWorkflow, true);
    assert.ok(step1.replyText.includes("confirm"), "Must ask for final confirmation");
    assert.ok(step1.replyText.includes("Solan"), "Must confirm captured address");

    // Step 2: Customer confirms with "Haan ji"
    const confirmMsgId = `wamid.test_${Date.now()}_a2_confirm`;
    const step2 = await evaluateWhatsAppOrderWorkflow({
      customerPhone: testPhone,
      customerText: "Haan ji",
      customerName,
      messageId: confirmMsgId,
    });

    assert.equal(step2.isOrderWorkflow, true);
    assert.equal(step2.orderCreated, true, "Order must be created upon confirmation");
    assert.ok(step2.order, "Order object must be returned");
    assert.ok(step2.order.orderNumber.startsWith("ORD-"), "Order must have valid ORD- format");
    assert.equal(step2.order.customerName, customerName);
    assert.equal(step2.order.source, "WhatsApp");
    assert.equal(step2.order.status, "Processing");
    assert.ok(step2.order.totalPaise > 0, "Total paise must be calculated from database prices");
    assert.ok(step2.replyText.includes(step2.order.orderNumber), "Confirmation reply must include order number");

    // Verify order exists in CRM Orders store
    const storedOrders = getStoredOrders();
    const createdOrder = storedOrders.find((o) => o.orderNumber === step2.order.orderNumber);
    assert.ok(createdOrder, "Newly created order must exist in CRM Orders store");
    assert.equal(createdOrder.source, "WhatsApp");

    // Verify notification exists in CRM Notifications store
    const notifications = getStoredNotifications();
    const orderNotif = notifications.find((n) => n.orderNumber === step2.order.orderNumber);
    assert.ok(orderNotif, "A CRM Notification must be generated for the new WhatsApp order");
    assert.equal(orderNotif.title, "New WhatsApp Order Received");
    assert.equal(orderNotif.customerName, customerName);
    assert.equal(orderNotif.read, false, "Notification must be unread initially");
  });

  it("Scenario F: Multiple Products in a Single Message (Rice + Oil)", async () => {
    const { evaluateWhatsAppOrderWorkflow } = await import(
      "../backend/lib/whatsapp-order-service.server.ts"
    );

    // Customer orders multi-products: "1 packet rice aur 2 oil bhej dena"
    const step1 = await evaluateWhatsAppOrderWorkflow({
      customerPhone: testPhone,
      customerText: "1 packet rice aur 2 oil bhej dena. Sector 14, Chandigarh 160014",
      customerName: "Vikas Sharma",
      messageId: `wamid.test_${Date.now()}_f1`,
    });

    assert.equal(step1.isOrderWorkflow, true);
    assert.ok(step1.draft.items.length >= 2, "Must extract both Rice and Mustard Oil");
    assert.ok(step1.replyText.includes("Rice"), "Must mention Rice");
    assert.ok(step1.replyText.includes("Oil"), "Must mention Oil");

    // Confirm
    const step2 = await evaluateWhatsAppOrderWorkflow({
      customerPhone: testPhone,
      customerText: "Confirm kar do",
      customerName: "Vikas Sharma",
      messageId: `wamid.test_${Date.now()}_f2`,
    });

    assert.equal(step2.orderCreated, true);
    assert.ok(step2.order.items.length >= 2, "Order must contain all items");
  });

  it("Prevent Duplicate Orders & Notifications: Duplicate Webhook does not create second order", async () => {
    const { evaluateWhatsAppOrderWorkflow } = await import(
      "../backend/lib/whatsapp-order-service.server.ts"
    );
    const { getStoredOrders, getStoredNotifications } = await import(
      "../backend/lib/crm-store.server.ts"
    );

    // Setup order draft with address
    await evaluateWhatsAppOrderWorkflow({
      customerPhone: testPhone,
      customerText: "Mujhe 1 kg badam chahiye. H.No 12, Dehradun 248001",
      customerName,
      messageId: `wamid.dup_setup_${Date.now()}`,
    });

    const duplicateMessageId = `wamid.duplicate_delivery_${Date.now()}`;

    // Delivery 1
    const res1 = await evaluateWhatsAppOrderWorkflow({
      customerPhone: testPhone,
      customerText: "Haan ji",
      customerName,
      messageId: duplicateMessageId,
    });
    assert.equal(res1.orderCreated, true);
    const order1Number = res1.order.orderNumber;

    // Delivery 2 (Exact same webhook event redelivered by Meta)
    const res2 = await evaluateWhatsAppOrderWorkflow({
      customerPhone: testPhone,
      customerText: "Haan ji",
      customerName,
      messageId: duplicateMessageId,
    });

    // Should return existing order and NOT create a second order
    assert.equal(res2.order.orderNumber, order1Number);

    const orders = getStoredOrders().filter((o) => o.whatsappMessageId === duplicateMessageId);
    assert.equal(orders.length, 1, "Must have strictly ONE order for the message ID");

    const notifs = getStoredNotifications().filter((n) => n.orderNumber === order1Number);
    assert.equal(notifs.length, 1, "Must have strictly ONE notification for the order");
  });

  it("Notifications API (/api/crm/notifications) retrieves and updates read status", async () => {
    const { GET, POST } = await import("../app/api/crm/notifications/route.ts");
    const { saveStoredNotification } = await import("../backend/lib/crm-store.server.ts");

    const testNotifId = `notif_api_test_${Date.now()}`;
    saveStoredNotification({
      id: testNotifId,
      orderNumber: "ORD-2026-9999",
      title: "New WhatsApp Order Received",
      customerName: "Kavita Bisht",
      customerPhone: "+91 98160 11111",
      totalAmount: 950,
      read: false,
    });

    // GET /api/crm/notifications
    const getRes = await GET();
    const getData = await getRes.json();
    assert.equal(getData.success, true);
    assert.ok(getData.notifications.length > 0);
    const found = getData.notifications.find((n) => n.id === testNotifId);
    assert.ok(found, "Saved notification must be returned by API");
    assert.equal(found.read, false);

    // POST /api/crm/notifications with mark_read
    const markReq = new Request("http://localhost:3000/api/crm/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", notificationId: testNotifId }),
    });
    const markRes = await POST(markReq);
    const markData = await markRes.json();
    assert.equal(markData.success, true);

    // Verify marked read
    const verifyRes = await GET();
    const verifyData = await verifyRes.json();
    const updated = verifyData.notifications.find((n) => n.id === testNotifId);
    assert.equal(updated.read, true, "Notification must be marked as read");
  });
});
