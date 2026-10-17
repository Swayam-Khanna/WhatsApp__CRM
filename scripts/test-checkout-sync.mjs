async function runTest() {
  const payload = {
    customerName: "Aarav Sharma",
    customerPhone: "9811234567",
    customerEmail: "aarav.sharma@gmail.com",
    paymentMethod: "whatsapp",
    shippingAddressSnapshot: {
      fullName: "Aarav Sharma",
      line1: "Flat 402, Green Glen Layout, Bellandur",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560103"
    },
    items: [
      {
        productId: "himalayan-dried-apricots",
        quantity: 2
      }
    ]
  };

  console.log("--> Sending checkout POST request to http://localhost:3000/api/orders/create...");
  const res = await fetch("http://localhost:3000/api/orders/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  console.log("--> Response HTTP Status:", res.status);
  const data = await res.json();
  console.log("--> Response Body:", JSON.stringify(data, null, 2));

  if (res.ok && data.success) {
    console.log("--> SUCCESS: Order saved and synchronized with WhatsApp CRM!");
    console.log("--> Order Number:", data.order.orderNumber);
    console.log("--> CRM Sync Status:", data.crmSync?.status);
    console.log("--> CRM WhatsApp Notification:", data.crmSync?.crmResponse?.whatsappNotification);
  } else {
    console.error("--> FAILED:", data);
  }
}

runTest();
