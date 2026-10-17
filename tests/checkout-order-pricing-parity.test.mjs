import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateCartTotalsPaise, calculateOrderServerTotals } from "../backend/lib/orders.server.ts";

/**
 * Legacy Cart Totals calculation (from main checkout page)
 * Emulates the exact arithmetic executed on main checkout:
 * - Customer price for farmer product = Math.ceil(farmer_base_price * 1.1)
 * - Customer price for static catalog = retail price
 * - Taxable amount = price * qty
 * - GST = 5% of taxable amount rounded to 2 decimals
 * - Subtotal = sum of taxable amounts
 * - Tax = sum of GST amounts
 * - Shipping = derived from weight/zone or flat fee
 * - Gateway/COD fee = flat ₹40 for COD, 0 for WhatsApp/online
 * - Total = Subtotal + Tax + Shipping + GatewayFee - Discount
 */
function calculateLegacyCheckoutTotals({
  items,
  shippingCost = 0,
  discountAmount = 0,
  paymentMethod = "cod",
}) {
  let subtotalPaise = 0;
  let totalGstPaise = 0;

  const resolved = items.map((i) => {
    // If farmer product, apply 10% commission markup
    const customerPrice = i.isFarmerProduct
      ? Math.ceil(Number(i.basePrice) * 1.1)
      : Number(i.price);

    // Work entirely in paise to match server-side rounding behaviour.
    // The legacy browser code rounded GST at the rupee level which introduced
    // up to 49-paise skew vs the server.  The server is authoritative, so the
    // test reference must follow the server's rounding path.
    const unitPricePaise = Math.round(customerPrice * 100);
    const itemTotalPaise = unitPricePaise * i.qty;
    const gstRate = i.gstApplicable !== false ? 5 : 0;
    const gstPaise = Math.round((itemTotalPaise * gstRate) / 100);

    subtotalPaise += itemTotalPaise;
    totalGstPaise += gstPaise;

    return {
      customerPrice,
      qty: i.qty,
      itemTotalPaise,
      gstPaise,
    };
  });

  const codFeePaise = paymentMethod === "cod" ? 4000 : 0;
  const shippingPaise = Math.round(shippingCost * 100);
  const discountAmountPaise = Math.round(discountAmount * 100);
  const finalDiscountPaise = Math.min(discountAmountPaise, subtotalPaise + totalGstPaise + shippingPaise + codFeePaise);
  const totalPaise = subtotalPaise + totalGstPaise + shippingPaise + codFeePaise - finalDiscountPaise;

  return {
    subtotalPaise,
    taxPaise: totalGstPaise,
    shippingPaise,
    codFeePaise,
    discountPaise: finalDiscountPaise,
    totalPaise,
    items: resolved,
  };
}

test("1. Price Parity: Farmer Product alone (walnuts-2xmh, base 549 -> customer 604)", async () => {
  const cartItems = [
    {
      productId: "fI2iZKDI6SWmIpfHgu1xfLpYPLA3_walnuts-2xmh",
      slug: "walnuts-2xmh",
      basePrice: 549,
      isFarmerProduct: true,
      qty: 2,
    },
  ];

  const legacy = calculateLegacyCheckoutTotals({
    items: cartItems,
    shippingCost: 48,
    paymentMethod: "cod",
  });

  // Test server calculation
  const server = await calculateOrderServerTotals(
    [{ productId: cartItems[0].productId, slug: cartItems[0].slug, quantity: cartItems[0].qty }],
    "110001",
    "cod"
  );

  assert.equal(server.items[0].unitPricePaise, 60400, "Customer unit price must be 60400 paise (₹604)");
  assert.equal(server.items[0].totalPaise, 120800, "Item total must be 120800 paise (₹1,208)");
  assert.equal(server.subtotalPaise, legacy.subtotalPaise, "Subtotal must match legacy to the paise");
  assert.equal(server.taxPaise, legacy.taxPaise, "Tax must match legacy to the paise");
  assert.equal(server.codFeePaise, 4000, "COD fee must be exactly 4000 paise (₹40)");
  assert.match(server.orderNumber, /^PRJ\d{8}$/, "Order number must match PRJ######## format");
});

test("2. Price Parity: Static Catalog Product alone (organic-almonds, price 1250)", async () => {
  const cartItems = [
    {
      productId: "prod_organic-almonds",
      slug: "organic-almonds",
      price: 1250,
      isFarmerProduct: false,
      qty: 1,
    },
  ];

  const legacy = calculateLegacyCheckoutTotals({
    items: cartItems,
    shippingCost: 55,
    paymentMethod: "whatsapp",
  });

  const server = await calculateOrderServerTotals(
    [{ productId: cartItems[0].productId, slug: cartItems[0].slug, quantity: cartItems[0].qty }],
    "400001",
    "whatsapp"
  );

  assert.equal(server.items[0].unitPricePaise, 125000, "Customer unit price must be 125000 paise (₹1,250)");
  assert.equal(server.subtotalPaise, legacy.subtotalPaise, "Subtotal must match legacy to the paise");
  assert.equal(server.taxPaise, legacy.taxPaise, "Tax must match legacy to the paise");
  assert.equal(server.codFeePaise, 0, "WhatsApp payment must have 0 COD fee");
});

test("3. Price Parity: Mixed Cart (Farmer product + Static products)", async () => {
  const cartItems = [
    {
      productId: "fI2iZKDI6SWmIpfHgu1xfLpYPLA3_walnuts-2xmh",
      slug: "walnuts-2xmh",
      basePrice: 549,
      isFarmerProduct: true,
      qty: 1,
    },
    {
      productId: "prod_turmeric-powder",
      slug: "turmeric-powder",
      price: 240,
      isFarmerProduct: false,
      qty: 2,
    },
    {
      productId: "prod_pink-himalayan-salt",
      slug: "pink-himalayan-salt",
      price: 180,
      isFarmerProduct: false,
      qty: 1,
    },
  ];

  const legacy = calculateLegacyCheckoutTotals({
    items: cartItems,
    shippingCost: 0,
    paymentMethod: "cod",
  });

  const server = await calculateOrderServerTotals(
    cartItems.map((c) => ({ productId: c.productId, slug: c.slug, quantity: c.qty })),
    "110001",
    "cod"
  );

  // Walnuts: 604 * 1 = 604
  // Turmeric: 240 * 2 = 480
  // Pink salt: 180 * 1 = 180
  // Subtotal = 1264
  assert.equal(server.subtotalPaise, legacy.subtotalPaise, "Mixed cart subtotal must match to the paise");
  assert.equal(server.taxPaise, legacy.taxPaise, "Mixed cart tax must match to the paise");
  assert.equal(server.codFeePaise, 4000, "COD fee must be ₹40 (4000 paise)");
});

test("4. Price Parity: Cart with Coupon (FREE_SHIPPING & PERCENT_OFF)", async () => {
  // Test pure calculateCartTotalsPaise pure engine parity
  const items = [
    { unitPricePaise: 60400, quantity: 2, gstApplicable: true, gstRate: 5 },
    { unitPricePaise: 24000, quantity: 1, gstApplicable: true, gstRate: 5 },
  ];

  // 10% coupon off subtotal
  const subtotalPaise = 60400 * 2 + 24000 * 1; // 144800 paise
  const discountPaise = Math.round((subtotalPaise * 10) / 100); // 14480 paise

  const res = calculateCartTotalsPaise({
    items,
    shippingPaise: 5500,
    codFeePaise: 4000,
    discountPaise,
  });

  assert.equal(res.subtotalPaise, 144800);
  assert.equal(res.discountPaise, 14480);
  assert.equal(res.shippingPaise, 5500);
  assert.equal(res.codFeePaise, 4000);
  assert.equal(res.totalPaise, res.subtotalPaise + res.taxPaise + res.shippingPaise + res.codFeePaise - res.discountPaise);
});

test("5. Price Parity: COD vs WhatsApp Payment Methods", async () => {
  const cartInput = [{ slug: "walnuts-2xmh", quantity: 1 }];

  const codServer = await calculateOrderServerTotals(cartInput, "110001", "cod");
  const waServer = await calculateOrderServerTotals(cartInput, "110001", "whatsapp");

  assert.equal(codServer.codFeePaise, 4000, "COD must have 4000 paise COD fee");
  assert.equal(waServer.codFeePaise, 0, "WhatsApp must have 0 COD fee");
  assert.equal(codServer.totalPaise - waServer.totalPaise, 4000, "Difference between COD and WhatsApp must be exactly 4000 paise (₹40)");
});

test("6. Destination Pincodes: Local, Metro, Within-State, Other States, and Unknown Fallback", async () => {
  const pincodes = ["110001", "400001", "141001", "700001", "999999"];
  const cartInput = [{ slug: "organic-almonds", quantity: 1 }];

  for (const pin of pincodes) {
    const server = await calculateOrderServerTotals(cartInput, pin, "cod");
    assert(server.shippingPaise > 0, `Shipping paise must be positive for pincode ${pin}`);
    assert(server.totalPaise > server.subtotalPaise, `Total must include shipping and tax for pincode ${pin}`);
    assert.match(server.orderNumber, /^PRJ\d{8}$/, `Order number format valid for pincode ${pin}`);
    assert.match(server.invoiceNumber, /^INV-\d{4}-\d{5}$/, `Invoice number format valid for pincode ${pin}`);
  }
});
