import test from "node:test";
import assert from "node:assert/strict";

test("Centralized Products Architecture & CRM-Only Preservation", async (t) => {
  await t.test("1. Central and CRM-Exclusive Product Mapping", () => {
    const rawWebsiteProducts = [
      {
        id: "prod_1792413114133_8sy9",
        name: "Pecan Nuts (In-Shell)",
        slug: "pecan-nuts-in-shell",
        price: 800,
        stock: 10,
        unit: "500g",
        image: "/api/storage/prajnaa/products/Premium_Himalayan_Pecan_Pouch_1792413107860_5utau.webp",
        category: "dry-fruits",
        farmer_profiles: {
          farmName: "Ranjan's Farm",
          village: "Pangi Velly",
          state: "Himachal Pradesh"
        }
      },
      {
        id: "prod_walnut_1",
        name: "Kashmiri Akhrot Giri",
        slug: "kashmiri-akhrot-giri",
        price: 950,
        stock: 25,
        unit: "500g",
        image: "https://res.cloudinary.com/prajnaa/walnut.jpg",
        category: "dry-fruits"
      }
    ];

    const manualCrmProducts = [
      {
        id: "crm_exclusive_deal_01",
        name: "Special B2B Walnut Kernels (Wholesale Pack)",
        price: 750,
        stock: "In Stock",
        unitsLeft: 100,
        sku: "PM-CRM-9999",
        weight: "1kg",
        origin: "Kinnaur Orchard Direct",
        isCrmOnly: true,
        channel: "crm_only"
      }
    ];

    // Helper: Map central products
    const mappedCentral = rawWebsiteProducts.map((p) => {
      const id = p.id || p.slug;
      const sku = p.sku || `PM-${(p.slug || p.id).substring(0, 3).toUpperCase()}-500`;
      let image = p.image;
      if (image && (image.startsWith("/api/storage") || image.startsWith("/storage"))) {
        image = `https://market.prajnaa.in${image}`;
      }
      return {
        id,
        name: p.name,
        price: Number(p.price) || 0,
        stock: p.stock > 0 ? "In Stock" : "Out of Stock",
        image,
        category: p.category,
        unitsLeft: p.stock,
        origin: p.farmer_profiles?.village ? `${p.farmer_profiles.village}, ${p.farmer_profiles.state}` : "Himalayan Farms",
        sku,
        weight: p.unit || "500g",
        isCrmOnly: false,
        channel: "central",
        farmerName: p.farmer_profiles?.farmName
      };
    });

    assert.equal(mappedCentral.length, 2);
    assert.equal(mappedCentral[0].channel, "central");
    assert.equal(mappedCentral[0].isCrmOnly, false);
    assert.equal(
      mappedCentral[0].image,
      "https://market.prajnaa.in/api/storage/prajnaa/products/Premium_Himalayan_Pecan_Pouch_1792413107860_5utau.webp"
    );

    // Non-destructive merge
    const centralIds = new Set(mappedCentral.map((c) => c.id));
    const uniqueManual = manualCrmProducts.filter((m) => !centralIds.has(m.id));
    const combined = [...mappedCentral, ...uniqueManual];

    assert.equal(combined.length, 3, "Combined catalog should contain both central and CRM exclusive products");
    const crmItem = combined.find((p) => p.id === "crm_exclusive_deal_01");
    assert.ok(crmItem, "CRM exclusive item must be preserved in merged list");
    assert.equal(crmItem.isCrmOnly, true);
    assert.equal(crmItem.channel, "crm_only");
  });

  await t.test("2. Re-sync from Website never erases or duplicates manual CRM items", () => {
    let mockLocalStorage = {
      prajnaa_crm_manual_products: JSON.stringify([
        {
          id: "crm_manual_101",
          name: "Organic Shilajit Resin Private Batch",
          price: 1450,
          stock: "In Stock",
          unitsLeft: 15,
          sku: "PM-CRM-7721",
          weight: "20g",
          origin: "High Himalayan Rocks, Spiti",
          isCrmOnly: true,
          channel: "crm_only"
        }
      ]),
      prajnaa_crm_products: ""
    };

    // Simulate Sync Cycle 1
    const rawWebsiteSync1 = [
      { id: "prod_1", name: "Apricots", slug: "apricots", price: 999, stock: 40, unit: "500g" }
    ];

    const manual1 = JSON.parse(mockLocalStorage.prajnaa_crm_manual_products);
    const central1 = rawWebsiteSync1.map(p => ({ ...p, isCrmOnly: false, channel: "central" }));
    const merged1 = [...central1, ...manual1.filter(m => !central1.some(c => c.id === m.id))];
    mockLocalStorage.prajnaa_crm_products = JSON.stringify(merged1);

    assert.equal(merged1.length, 2);
    assert.ok(merged1.some(p => p.id === "crm_manual_101"));

    // Simulate Sync Cycle 2 (admin on website added 2 more products: Honey, Walnuts)
    const rawWebsiteSync2 = [
      { id: "prod_1", name: "Apricots", slug: "apricots", price: 999, stock: 35, unit: "500g" },
      { id: "prod_2", name: "Raw Honey", slug: "raw-honey", price: 550, stock: 20, unit: "500g" },
      { id: "prod_3", name: "Walnuts", slug: "walnuts", price: 600, stock: 15, unit: "250g" }
    ];

    const manual2 = JSON.parse(mockLocalStorage.prajnaa_crm_manual_products);
    const central2 = rawWebsiteSync2.map(p => ({ ...p, isCrmOnly: false, channel: "central" }));
    const merged2 = [...central2, ...manual2.filter(m => !central2.some(c => c.id === m.id))];
    mockLocalStorage.prajnaa_crm_products = JSON.stringify(merged2);

    assert.equal(merged2.length, 4, "Should have 3 website products + 1 preserved CRM item");
    const preservedManual = merged2.find(p => p.id === "crm_manual_101");
    assert.ok(preservedManual, "CRM-only product must survive subsequent website uploads");
    assert.equal(preservedManual.name, "Organic Shilajit Resin Private Batch");
  });

  await t.test("3. Catalog Channel Filtering: All, Website Synced, CRM Exclusive", () => {
    const catalog = [
      { id: "p1", name: "Pecan Nuts", isCrmOnly: false, stock: "In Stock" },
      { id: "p2", name: "Apricots", isCrmOnly: false, stock: "Out of Stock" },
      { id: "c1", name: "Custom Offline Bundle", isCrmOnly: true, stock: "In Stock" }
    ];

    // Filter by website
    const websiteOnly = catalog.filter(p => !p.isCrmOnly);
    assert.equal(websiteOnly.length, 2);
    assert.deepEqual(websiteOnly.map(p => p.id), ["p1", "p2"]);

    // Filter by crm_only
    const crmOnly = catalog.filter(p => p.isCrmOnly);
    assert.equal(crmOnly.length, 1);
    assert.equal(crmOnly[0].id, "c1");

    // Filter by stock: In Stock
    const inStock = catalog.filter(p => p.stock === "In Stock");
    assert.equal(inStock.length, 2);
  });
});
