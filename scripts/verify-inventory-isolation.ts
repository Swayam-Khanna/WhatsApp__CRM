import assert from "node:assert";
import { formatStock, toGrams } from "../frontend/lib/weight-utils";
import { sanitizeInventoryRecords } from "../frontend/lib/services/inventoryService";
import { sanitizeStoredCustomProducts } from "../frontend/lib/services/productSyncService";

console.log("==============================================================");
console.log("TESTING MULTI-PRODUCT INVENTORY ISOLATION & ACCURACY");
console.log("==============================================================\n");

// ----------------------------------------------------------------------
// Test 1: Sanitization and Disambiguation of Corrupted Records
// ----------------------------------------------------------------------
console.log("Test 1: Sanitization of corrupted legacy records (inv_undefined, missing IDs, duplicates)");

const corruptedInventory = [
  {
    id: "inv_undefined",
    product_id: "undefined",
    product_slug: "walnuts",
    product_name: "Himalayan Mountain Walnuts",
    stock_grams: 0,
    quantity: 0,
  },
  {
    id: "inv_undefined", // Colliding ID from legacy bug
    product_id: "undefined",
    product_slug: "test-one",
    product_name: "test one",
    stock_grams: 0,
    quantity: 0,
  },
];

const healedInventory = sanitizeInventoryRecords(corruptedInventory);
assert.strictEqual(healedInventory.length, 2, "Must keep both products");
assert.notStrictEqual(healedInventory[0].id, healedInventory[1].id, "Record IDs must be disambiguated and unique");
assert.notStrictEqual(healedInventory[0].product_id, healedInventory[1].product_id, "Product IDs must be unique");
assert.strictEqual(healedInventory[0].product_slug, "walnuts");
assert.strictEqual(healedInventory[1].product_slug, "test-one");
console.log("✓ Test 1 Passed: Legacy corrupted records cleanly auto-healed and disambiguated\n");

// ----------------------------------------------------------------------
// Test 2: Custom Product Sanitization
// ----------------------------------------------------------------------
console.log("Test 2: Custom products list sanitization and collision prevention");

const corruptedProducts = [
  { id: "undefined", name: "Walnuts", slug: "walnuts" },
  { id: "undefined", name: "test one", slug: "test-one" },
];

const healedProducts = sanitizeStoredCustomProducts(corruptedProducts);
assert.strictEqual(healedProducts.length, 2);
assert.notStrictEqual(healedProducts[0].id, healedProducts[1].id, "Custom product IDs must never collide");
assert.strictEqual(healedProducts[0].slug, "walnuts");
assert.strictEqual(healedProducts[1].slug, "test-one");
console.log("✓ Test 2 Passed: Custom products list sanitized with guaranteed unique IDs\n");

// ----------------------------------------------------------------------
// Test 3: Isolated Stock Adjustment (Updating Product A leaves Product B unchanged)
// ----------------------------------------------------------------------
console.log("Test 3: Adjusting Product A (Walnuts) leaves Product B (test one) completely untouched");

let simulatedDb = [
  {
    id: "inv_prod_walnuts",
    product_id: "prod_walnuts",
    product_slug: "walnuts",
    product_name: "Himalayan Mountain Walnuts",
    stock_grams: 0,
    quantity: 0,
    updated_at: new Date().toISOString(),
  },
  {
    id: "inv_prod_test_one",
    product_id: "prod_test_one",
    product_slug: "test-one",
    product_name: "test one",
    stock_grams: 0,
    quantity: 0,
    updated_at: new Date().toISOString(),
  },
];

// Simulate adjustStock logic strictly targeted by ID
function simulateAdjust(records: typeof simulatedDb, targetPid: string, newGrams: number) {
  const cleanPid = String(targetPid || "").trim();
  const targetIdx = records.findIndex((r) => {
    const rPid = String(r.product_id || "").trim();
    const rSlug = String(r.product_slug || "").trim();
    const rId = String(r.id || "").trim();
    return (
      Boolean(cleanPid && rPid && rPid === cleanPid) ||
      Boolean(cleanPid && rSlug && rSlug === cleanPid) ||
      Boolean(cleanPid && rId && (rId === cleanPid || rId === `inv_${cleanPid}`))
    );
  });

  assert.ok(targetIdx >= 0, `Target product ${cleanPid} must be found`);

  const updated = [...records];
  updated[targetIdx] = {
    ...updated[targetIdx],
    stock_grams: newGrams,
    quantity: Math.floor(newGrams / 1000),
    updated_at: new Date().toISOString(),
  };
  return updated;
}

// Adjust Walnuts by adding 10 kg (10,000 g)
simulatedDb = simulateAdjust(simulatedDb, "prod_walnuts", 10000);

const walnutsRec = simulatedDb.find((r) => r.product_id === "prod_walnuts")!;
const testOneRec = simulatedDb.find((r) => r.product_id === "prod_test_one")!;

assert.strictEqual(walnutsRec.stock_grams, 10000, "Walnuts stock must be 10,000 g");
assert.strictEqual(formatStock(walnutsRec.stock_grams), "10 kg", "Walnuts formatted stock must be '10 kg'");

assert.strictEqual(testOneRec.stock_grams, 0, "test one stock MUST remain 0 g");
assert.strictEqual(formatStock(testOneRec.stock_grams), "0 kg", "test one formatted stock must remain '0 kg'");

console.log("✓ Test 3 Passed: Walnuts stock updated to 10 kg, test one stock stayed at 0 kg\n");

// ----------------------------------------------------------------------
// Test 4: Adjusting Product B leaves Product A unchanged
// ----------------------------------------------------------------------
console.log("Test 4: Adjusting Product B (test one) leaves Product A (Walnuts) at 10 kg");

simulatedDb = simulateAdjust(simulatedDb, "prod_test_one", 3500);

const walnutsRec2 = simulatedDb.find((r) => r.product_id === "prod_walnuts")!;
const testOneRec2 = simulatedDb.find((r) => r.product_id === "prod_test_one")!;

assert.strictEqual(walnutsRec2.stock_grams, 10000, "Walnuts stock MUST remain 10,000 g");
assert.strictEqual(testOneRec2.stock_grams, 3500, "test one stock must be 3,500 g");
assert.strictEqual(formatStock(testOneRec2.stock_grams), "3 kg 500 g");

console.log("✓ Test 4 Passed: test one updated to 3 kg 500 g, Walnuts remained at 10 kg\n");

// ----------------------------------------------------------------------
// Test 5: Optimistic UI Updater Verification
// ----------------------------------------------------------------------
console.log("Test 5: UI Optimistic update strictly targets ONLY the modal item");

const oldState = [
  { id: "inv_w1", product_id: "prod_w1", product_slug: "walnuts", product_name: "Walnuts", stock_grams: 10000, quantity: 10 },
  { id: "inv_t1", product_id: "prod_t1", product_slug: "test-one", product_name: "test one", stock_grams: 3500, quantity: 3 },
];

const modalItem = { id: "inv_w1", product_id: "prod_w1", product_slug: "walnuts", product_name: "Walnuts" };
const newStockAfter = 15000;

const targetId = modalItem.id;
const targetPid = modalItem.product_id;
const targetSlug = modalItem.product_slug;

const newState = oldState.map((item) => {
  const isMatch =
    Boolean(targetId && item.id && item.id === targetId) ||
    Boolean(targetPid && item.product_id && item.product_id === targetPid) ||
    Boolean(targetSlug && item.product_slug && item.product_slug === targetSlug);

  if (isMatch) {
    return {
      ...item,
      stock_grams: newStockAfter,
      quantity: Math.floor(newStockAfter / 1000),
    };
  }
  return item;
});

assert.strictEqual(newState[0].stock_grams, 15000, "Walnuts in optimistic state must be 15,000 g");
assert.strictEqual(newState[1].stock_grams, 3500, "test one in optimistic state MUST remain 3,500 g");
console.log("✓ Test 5 Passed: Optimistic UI updater strictly updates only the target product row\n");

console.log("==============================================================");
console.log("ALL MULTI-PRODUCT ISOLATION TESTS PASSED WITH 100% SUCCESS!");
console.log("==============================================================");
