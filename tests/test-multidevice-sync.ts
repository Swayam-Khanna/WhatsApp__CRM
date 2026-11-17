async function runMultiDeviceSyncTest() {
  const base = "http://localhost:3000";
  console.log("=== STARTING MULTI-DEVICE SYNCHRONIZATION TEST ===");

  // 1. Simulation of Device A and Device B logging in with admin@prajnaamarket.com
  console.log("\n[Step 1] Device A & Device B fetch team roster...");
  const teamRes = await fetch(`${base}/api/crm/team`);
  const teamData = await teamRes.json();
  if (!teamData.success || !Array.isArray(teamData.team)) {
    throw new Error("Failed to fetch team roster");
  }
  const adminMember = teamData.team.find((m: any) => m.email.toLowerCase() === "admin@prajnaamarket.com");
  if (!adminMember) {
    throw new Error("Admin member not found in team roster");
  }
  console.log("✓ Both devices successfully recognize authenticated admin:", adminMember.name, `(${adminMember.email})`);

  // 2. Device A sends a customer message
  const testPhone = "9812345678";
  const testText = `Hello from Device A at ${Date.now()}`;
  console.log("\n[Step 2] Device A sends message to customer +91 " + testPhone + "...");
  const sendRes = await fetch(`${base}/api/crm/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: `91${testPhone}`,
      text: testText,
      sender: "business",
      customerName: "Multi-Device Test Customer",
    }),
  });
  const sendData = await sendRes.json();
  if (!sendData.success) {
    throw new Error("Device A failed to send message: " + JSON.stringify(sendData));
  }
  console.log("✓ Device A message dispatched and saved to persistent store. ID:", sendData.messageRecord?.id);

  // 3. Device B polls messages -> MUST receive Device A's message!
  console.log("\n[Step 3] Device B fetches messages feed...");
  const devBMsgsRes = await fetch(`${base}/api/crm/messages`);
  const devBMsgsData = await devBMsgsRes.json();
  const foundMsgOnDevB = devBMsgsData.messages.find(
    (m: any) => (m.to || "").includes(testPhone) && m.text === testText
  );
  if (!foundMsgOnDevB) {
    throw new Error("DESYNC FAILURE: Device B could not see message sent by Device A!");
  }
  console.log("✓ PERFECT SYNC: Device B immediately received Device A's message in live feed!");

  // 4. Device A creates / updates an order
  const testOrderNum = `PRJ-SYNC-${Date.now().toString().slice(-5)}`;
  console.log("\n[Step 4] Device A creates an order " + testOrderNum + "...");
  const orderRes = await fetch(`${base}/api/crm/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderNumber: testOrderNum,
      customerName: "Multi-Device Test Customer",
      customerPhone: testPhone,
      customerEmail: "multidevice@test.com",
      amount: 1450,
      totalPaise: 145000,
      status: "In Transit",
      paymentStatus: "paid",
      items: [
        {
          productName: "Prajnaa Himalayan Wild Honey 500g",
          quantity: 2,
          unitPricePaise: 72500,
          totalPaise: 145000,
        },
      ],
    }),
  });
  const orderData = await orderRes.json();
  if (!orderData.success) {
    throw new Error("Device A failed to create order: " + JSON.stringify(orderData));
  }
  console.log("✓ Device A created order:", orderData.order.orderNumber, "Status:", orderData.order.status);

  // 5. Device B polls orders -> MUST see exact order with 'paid' and 'In Transit'
  console.log("\n[Step 5] Device B fetches orders list...");
  const devBOrdersRes = await fetch(`${base}/api/crm/orders`);
  const devBOrdersData = await devBOrdersRes.json();
  const foundOrderOnDevB = devBOrdersData.orders.find(
    (o: any) => o.orderNumber === testOrderNum || o.id === testOrderNum
  );
  if (!foundOrderOnDevB) {
    throw new Error("DESYNC FAILURE: Device B could not find order created by Device A!");
  }
  if (foundOrderOnDevB.paymentStatus !== "paid" || foundOrderOnDevB.status !== "In Transit") {
    throw new Error(`DESYNC FAILURE: Order fields mismatch on Device B. Got: ${JSON.stringify(foundOrderOnDevB)}`);
  }
  console.log("✓ PERFECT SYNC: Device B retrieved identical order details, status, and paymentStatus!");

  // 6. Device A saves customer internal note
  console.log("\n[Step 6] Device A saves internal customer note...");
  const testNote = "VIP customer from Solan preferring Himalayan Honey";
  const noteRes = await fetch(`${base}/api/crm/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: testPhone,
      notes: testNote,
    }),
  });
  const noteData = await noteRes.json();
  if (!noteData.success) {
    throw new Error("Device A failed to save customer note");
  }

  // 7. Device B fetches sync state -> MUST receive note!
  console.log("\n[Step 7] Device B fetches sync state for customer note...");
  const syncRes = await fetch(`${base}/api/crm/sync`);
  const syncData = await syncRes.json();
  const savedMeta = syncData.customerMeta[testPhone];
  if (!savedMeta || savedMeta.notes !== testNote) {
    throw new Error("DESYNC FAILURE: Customer note not synced to Device B!");
  }
  console.log("✓ PERFECT SYNC: Device B loaded matching internal note:", savedMeta.notes);

  // 8. Device A deletes customer contact
  console.log("\n[Step 8] Device A deletes customer contact...");
  const deleteRes = await fetch(`${base}/api/crm/messages?phone=${testPhone}`, {
    method: "DELETE",
  });
  const deleteData = await deleteRes.json();
  if (!deleteData.success) {
    throw new Error("Failed to delete contact: " + JSON.stringify(deleteData));
  }
  console.log("✓ Device A permanently deleted contact:", testPhone);

  // 9. Device B polls messages feed -> Phone MUST be in deletedPhones and messages excluded!
  console.log("\n[Step 9] Device B polls messages feed after deletion...");
  const postDelRes = await fetch(`${base}/api/crm/messages`);
  const postDelData = await postDelRes.json();
  const stillHasMsg = postDelData.messages.some((m: any) => (m.to || "").includes(testPhone) || (m.from || "").includes(testPhone));
  const isMarkedDeleted = postDelData.deletedPhones.includes(testPhone);

  if (stillHasMsg) {
    throw new Error("DESYNC FAILURE: Deleted customer messages still appeared on Device B!");
  }
  if (!isMarkedDeleted) {
    throw new Error("DESYNC FAILURE: Deleted phone not listed in deletedPhones for Device B!");
  }
  console.log("✓ PERFECT SYNC: Deleted contact successfully purged and synchronized on Device B!");

  console.log("\n========================================================");
  console.log("🏆 ALL MULTI-DEVICE SYNCHRONIZATION TESTS PASSED 100%!");
  console.log("========================================================");
}

runMultiDeviceSyncTest().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
