import assert from "node:assert/strict";
import test from "node:test";

test("Catalogue Synchronization & Live Storefront Test Suite", async (t) => {
  const { getAuthoritativeCrmProducts, saveProductToRegistry, updateProductStockInRegistry, deleteProductFromRegistry } =
    await import("../backend/lib/product-registry.ts");
  const { getLiveProductCatalogue } = await import("../backend/lib/smart-assistant.server.ts");

  await t.test("1. Initial catalogue retrieves ALL live products without artificial 16-17 cap", async () => {
    const products = await getAuthoritativeCrmProducts();
    console.log(`[Test] Total Authoritative Products loaded: ${products.length}`);

    // Must be greater than the buggy 16-17 limit
    assert.ok(products.length >= 20, `Expected at least 20 products, got ${products.length}`);

    // Check essential fields on every product
    for (const p of products) {
      assert.ok(p.id, "Product must have an id");
      assert.ok(p.name, `Product ${p.id} must have a name`);
      assert.ok(p.price > 0, `Product ${p.name} must have a price > 0`);
      assert.ok(p.image, `Product ${p.name} must have an image`);
      assert.ok(p.category, `Product ${p.name} must have a category`);
      assert.ok(Array.isArray(p.variants) && p.variants.length > 0, `Product ${p.name} must have variants`);
      assert.ok(p.stockStatus, `Product ${p.name} must have a stockStatus`);
    }

    // Smart assistant's catalogue must match authoritative count
    const assistantCat = await getLiveProductCatalogue();
    assert.strictEqual(assistantCat.length, products.length, "Smart assistant catalogue count must match registry count");
  });

  await t.test("2. Adding a new product in CRM immediately synchronizes to Catalogue", async () => {
    const initialList = await getAuthoritativeCrmProducts();
    const initialCount = initialList.length;

    const newSKU = `PM-TEST-${Date.now()}`;
    const testProduct = {
      name: "Highland Wild Blackberry Jam",
      price: 490,
      stock: "In Stock",
      category: "Pickles & Preserves",
      image: "/assets/cat-pickles.jpg",
      unitsLeft: 40,
      origin: "Kinnaur High Orchard, HP",
      weight: "350g",
      sku: newSKU,
      description: "Sun-cooked wild mountain blackberries with pure raw forest honey.",
    };

    const saved = await saveProductToRegistry(testProduct);
    assert.ok(saved.id, "Saved product must receive an ID");
    assert.strictEqual(saved.name, testProduct.name);

    // Fetch catalogue again
    const updatedList = await getAuthoritativeCrmProducts();
    assert.strictEqual(updatedList.length, initialCount + 1, "Product count should increase by 1");

    const found = updatedList.find((p) => p.id === saved.id || p.sku === newSKU);
    assert.ok(found, "Newly added product must appear in catalogue immediately");
    assert.strictEqual(found.price, 490);
    assert.strictEqual(found.origin, "Kinnaur High Orchard, HP");
    assert.ok(found.variants.length >= 1, "Must have derived packaging variants");

    // Also check smart assistant catalogue
    const assistantCat = await getLiveProductCatalogue();
    const assistantFound = assistantCat.find((p) => p.id === saved.id);
    assert.ok(assistantFound, "Smart assistant catalogue must also reflect new product immediately");

    // Clean up test product
    await deleteProductFromRegistry(saved.id);
  });

  await t.test("3. Updating product price and stock immediately updates Catalogue", async () => {
    const testProduct = await saveProductToRegistry({
      name: "Temporary Test Item for Price Update",
      price: 300,
      stock: "In Stock",
      unitsLeft: 50,
      category: "Produce",
      image: "/assets/cat-honey.jpg",
    });

    // Update price to 650 and stock to Low Stock
    const updated = await updateProductStockInRegistry(testProduct.id, {
      price: 650,
      stock: "Low Stock",
      unitsLeft: 3,
    });

    assert.ok(updated);
    assert.strictEqual(updated.price, 650);
    assert.strictEqual(updated.stock, "Low Stock");
    assert.strictEqual(updated.stockStatus, "few_left");

    // Check from catalogue
    const catalogue = await getAuthoritativeCrmProducts();
    const itemInCat = catalogue.find((p) => p.id === testProduct.id);
    assert.ok(itemInCat);
    assert.strictEqual(itemInCat.price, 650);
    assert.strictEqual(itemInCat.stockStatus, "few_left");

    // Clean up
    await deleteProductFromRegistry(testProduct.id);
  });

  await t.test("4. Deleting product immediately excludes it from Catalogue", async () => {
    const toDelete = await saveProductToRegistry({
      name: "Item to be Deleted Quickly",
      price: 199,
      category: "Produce",
      image: "/assets/cat-honey.jpg",
    });

    let cat = await getAuthoritativeCrmProducts();
    assert.ok(cat.some((p) => p.id === toDelete.id), "Should exist before delete");

    // Delete
    await deleteProductFromRegistry(toDelete.id);

    cat = await getAuthoritativeCrmProducts();
    assert.ok(!cat.some((p) => p.id === toDelete.id), "Must NOT exist after delete");
  });
});
