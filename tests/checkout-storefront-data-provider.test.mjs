import test from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: ".env" });
process.env.DATA_PROVIDER = "neon";
process.env.EMAIL_DISABLED = "true";
process.env.ONLINE_PAYMENTS_ENABLED = "false";

test("Checkout and Storefront Behind DATA_PROVIDER Suite", async (t) => {
  const { GET: getProducts } = await import("../app/api/products/route.ts");
  const { GET: getInventory } = await import("../app/api/inventory/route.ts");
  const { POST: createOrder } = await import("../app/api/orders/create/route.ts");

  await t.test("1. GET /api/products returns catalog from Neon when DATA_PROVIDER=neon", async () => {
    const req = new Request("http://localhost:3000/api/products");
    const res = await getProducts(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.products));
    assert.ok(data.products.length > 0);
  });

  await t.test("2. GET /api/inventory returns inventory records from Neon when DATA_PROVIDER=neon", async () => {
    const req = new Request("http://localhost:3000/api/inventory");
    const res = await getInventory(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.data));
  });

  await t.test("3. POST /api/orders/create creates COD order atomically and respects EMAIL_DISABLED", async () => {
    const req = new Request("http://localhost:3000/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "Integration Test Customer",
        customerEmail: "integration-test@example.com",
        customerPhone: "9876543210",
        paymentMethod: "cod",
        shippingAddressSnapshot: {
          fullName: "Integration Test Customer",
          phone: "9876543210",
          email: "integration-test@example.com",
          addressLine1: "123 Test Street",
          city: "Dehradun",
          state: "Uttarakhand",
          postalCode: "248001",
          country: "India",
        },
        items: [
          {
            slug: "walnuts",
            productId: "walnuts",
            productName: "Premium Organic Walnuts",
            quantity: 1,
            unitPrice: 604,
          },
        ],
      }),
    });

    const res = await createOrder(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.order);
    assert.ok(data.order.id);
    assert.ok(data.order.orderNumber);
    assert.equal(data.order.paymentMethod, "cod");
    assert.equal(data.order.paymentStatus, "pending");
  });

  await t.test("4. POST /api/orders/create creates WhatsApp order and returns whatsappUrl", async () => {
    const req = new Request("http://localhost:3000/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "WhatsApp Test Customer",
        customerEmail: "whatsapp-test@example.com",
        customerPhone: "9876543210",
        paymentMethod: "whatsapp",
        shippingAddressSnapshot: {
          fullName: "WhatsApp Test Customer",
          phone: "9876543210",
          email: "whatsapp-test@example.com",
          addressLine1: "456 Orchard Road",
          city: "Dehradun",
          state: "Uttarakhand",
          postalCode: "248001",
          country: "India",
        },
        items: [
          {
            slug: "walnuts",
            productId: "walnuts",
            productName: "Premium Organic Walnuts",
            quantity: 1,
            unitPrice: 604,
          },
        ],
      }),
    });

    const res = await createOrder(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.order);
    assert.ok(data.whatsappUrl);
    assert.ok(data.whatsappUrl.includes("wa.me"));
    assert.ok(data.whatsappUrl.includes(encodeURIComponent(data.order.orderNumber)));
  });

  await t.test("5. POST /api/orders/create strictly rejects Razorpay when ONLINE_PAYMENTS_ENABLED=false", async () => {
    const req = new Request("http://localhost:3000/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "Declined Test",
        customerEmail: "declined@example.com",
        customerPhone: "9876543210",
        paymentMethod: "razorpay",
        shippingAddressSnapshot: {
          postalCode: "248001",
        },
        items: [{ slug: "walnuts", quantity: 1 }],
      }),
    });

    const res = await createOrder(req);
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.code, "ONLINE_PAYMENTS_DISABLED");
  });
});
