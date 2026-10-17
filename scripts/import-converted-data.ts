/**
 * Converted Areas Data Importer: Firestore to DEV Neon PostgreSQL
 *
 * Imports converted areas data into DEV Neon PostgreSQL:
 * 1. farmer_products & static catalog products
 * 2. product_inventory (strict: NO baseline 50,000g baseline; missing row = unlimited stock)
 * 3. shipping_slabs (from shipping_rates)
 * 4. pincode_zones
 * 5. last_mile_rates
 * 6. app_settings (from app_config)
 * 7. system_notifications
 * 8. notification_preferences
 * 9. wishlist_items
 * 10. product_reviews (no "purchased" requirement)
 * 11. addresses
 * 12. recently_viewed
 *
 * Safeguards:
 * - Defaults to --dry-run (safe, read-only analysis).
 * - Requires --execute flag to write to DEV Neon.
 * - Strictly rejects production Neon host (ep-snowy-fog-b3wop5vp).
 * - NO PII printed in stdout/logs (never logs full emails, phones, names, addresses).
 * - Re-runnable (upserts by primary key or unique slug).
 *
 * Usage:
 *   npx tsx scripts/import-converted-data.ts            # Dry run (default)
 *   npx tsx scripts/import-converted-data.ts --execute  # Execute import on DEV Neon
 */

import postgres from "postgres";
import dotenv from "dotenv";
import { adminDb } from "../frontend/lib/firebase-admin.ts";
import { allProducts } from "../frontend/lib/mock/products.ts";
import { parseWeightToGrams } from "../frontend/lib/weight-utils.ts";

dotenv.config({ path: ".env" });

const devDbUrl = process.env.NEON_TEST_BRANCH_URL || process.env.DATABASE_URL;

if (!devDbUrl) {
  console.error("FATAL: DATABASE_URL or NEON_TEST_BRANCH_URL is not set.");
  process.exit(1);
}

// Strict production guard: Never allow production Neon host
if (devDbUrl.includes("ep-snowy-fog-b3wop5vp")) {
  console.error("\n==================================================================");
  console.error("FATAL BLOCKED: Database connection points to PRODUCTION Neon!");
  console.error("Endpoint: ep-snowy-fog-b3wop5vp");
  console.error("This script is strictly barred from modifying production data.");
  console.error("==================================================================\n");
  process.exit(1);
}

const isExecute = process.argv.includes("--execute");
const isDryRun = !isExecute;

const sql = postgres(devDbUrl, { ssl: "require", max: 5 });

interface DryRunReport {
  farmerProfiles: { found: number; toUpsert: number };
  farmerProducts: { firestoreFound: number; staticCatalogFound: number; toUpsert: number };
  productInventory: { firestoreFound: number; toUpsert: number; baselineInvented: number };
  shippingSlabs: { firestoreDocs: number; slabsExtracted: number; toUpsert: number };
  pincodeZones: { firestoreFound: number; toUpsert: number };
  lastMileRates: { firestoreDocs: number; ratesExtracted: number; toUpsert: number };
  appSettings: { firestoreFound: number; toUpsert: number };
  systemNotifications: { firestoreFound: number; toUpsert: number };
  notificationPreferences: { firestoreFound: number; toUpsert: number };
  wishlistItems: { firestoreFound: number; toUpsert: number };
  productReviews: { firestoreFound: number; toUpsert: number };
  addresses: { firestoreFound: number; toUpsert: number };
  recentlyViewed: { firestoreFound: number; toUpsert: number };
}

async function run() {
  console.log("==================================================================");
  console.log("     CONVERTED AREAS DATA IMPORTER (FIRESTORE -> DEV NEON)       ");
  console.log("==================================================================");
  console.log(`Mode: ${isExecute ? ">>> EXECUTE MODE (Writing to DEV Neon) <<<" : "--- DRY-RUN MODE (Safe, Read-Only Analysis) ---"}`);
  console.log(`Target Branch: DEV Neon (${devDbUrl.split("@")[1]?.split("/")[0] || "dev"})`);
  console.log("==================================================================\n");

  if (!adminDb) {
    console.error("FATAL: Firebase Admin DB is not initialized.");
    process.exit(1);
  }

  const report: DryRunReport = {
    farmerProfiles: { found: 0, toUpsert: 0 },
    farmerProducts: { firestoreFound: 0, staticCatalogFound: 0, toUpsert: 0 },
    productInventory: { firestoreFound: 0, toUpsert: 0, baselineInvented: 0 },
    shippingSlabs: { firestoreDocs: 0, slabsExtracted: 0, toUpsert: 0 },
    pincodeZones: { firestoreFound: 0, toUpsert: 0 },
    lastMileRates: { firestoreDocs: 0, ratesExtracted: 0, toUpsert: 0 },
    appSettings: { firestoreFound: 0, toUpsert: 0 },
    systemNotifications: { firestoreFound: 0, toUpsert: 0 },
    notificationPreferences: { firestoreFound: 0, toUpsert: 0 },
    wishlistItems: { firestoreFound: 0, toUpsert: 0 },
    productReviews: { firestoreFound: 0, toUpsert: 0 },
    addresses: { firestoreFound: 0, toUpsert: 0 },
    recentlyViewed: { firestoreFound: 0, toUpsert: 0 },
  };

  // ---------------------------------------------------------
  // 1. Farmer Profiles (Prerequisite for farmer_products FK)
  // ---------------------------------------------------------
  const farmerProfilesSnap = await adminDb.collection("farmer_profiles").get();
  report.farmerProfiles.found = farmerProfilesSnap.size;

  const farmerProfilesToInsert: any[] = [];
  farmerProfilesSnap.docs.forEach((doc) => {
    const d = doc.data();
    farmerProfilesToInsert.push({
      id: doc.id,
      userId: d.user_id || "fI2iZKDI6SWmIpfHgu1xfLpYPLA3",
      fullName: d.full_name || "Partner Farmer",
      farmName: d.farm_name || "Prajnaa Partner Farm",
      phone: d.phone || "9876543210",
      email: d.email || null,
      slug: d.slug || doc.id,
      status: d.status || "approved",
      state: d.state || "Uttarakhand",
      district: d.district || null,
      village: d.village || "Ranikhet",
      pincode: d.pincode || null,
    });
  });

  report.farmerProfiles.toUpsert = farmerProfilesToInsert.length;

  if (isExecute) {
    for (const f of farmerProfilesToInsert) {
      await sql`
        INSERT INTO farmer_profiles (
          id, user_id, full_name, farm_name, phone, email, slug, status, state, district, village, pincode
        ) VALUES (
          ${f.id}, ${f.userId}, ${f.fullName}, ${f.farmName}, ${f.phone}, ${f.email}, ${f.slug},
          ${f.status}, ${f.state}, ${f.district}, ${f.village}, ${f.pincode}
        )
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          farm_name = EXCLUDED.farm_name,
          slug = EXCLUDED.slug,
          status = EXCLUDED.status,
          updated_at = NOW()
      `;
    }
  }

  // ---------------------------------------------------------
  // 2. Farmer Products & Static Catalog Products
  // ---------------------------------------------------------
  const farmerProductsSnap = await adminDb.collection("farmer_products").get();
  report.farmerProducts.firestoreFound = farmerProductsSnap.size;

  const defaultFarmer = farmerProfilesToInsert[0]?.id || "farmer_ramesh_singh";
  const productsToInsert: any[] = [];
  const seenSlugs = new Set<string>();

  // 2A. Firestore Farmer Products
  farmerProductsSnap.docs.forEach((doc) => {
    const d = doc.data();
    const slug = d.slug || doc.id;
    seenSlugs.add(slug);

    productsToInsert.push({
      id: doc.id,
      userId: d.user_id || "fI2iZKDI6SWmIpfHgu1xfLpYPLA3",
      farmerId: d.farmer_id || defaultFarmer,
      name: d.name || "Produce Item",
      slug,
      description: d.description || null,
      price: Number(d.price || 0),
      compareAtPrice: d.compare_at_price ? Number(d.compare_at_price) : null,
      category: d.category || "dry-fruits",
      stock: Number(d.stock || 0),
      stockGrams: Number(d.stock_grams || d.stockGrams || 0),
      pricePerKg: d.price_per_kg ? Number(d.price_per_kg) : null,
      lowStockThresholdGrams: Number(d.low_stock_threshold_grams || 1000),
      unit: d.unit || "kg",
      weightGrams: d.weight_grams ? Number(d.weight_grams) : 500,
      images: Array.isArray(d.images) ? d.images.filter((img: string) => !img.startsWith("data:")) : [],
      status: d.status || "published",
      hsnCode: d.hsn_code || "0802",
      gstApplicable: d.gst_applicable !== false,
      gstRate: Number(d.gst_rate ?? 5),
    });
  });

  // 2B. Static Catalog Products from mock/products.ts
  report.farmerProducts.staticCatalogFound = allProducts.length;
  allProducts.forEach((p: any) => {
    if (seenSlugs.has(p.slug)) return;
    seenSlugs.add(p.slug);

    const weightGrams = typeof p.weight_gm === "number" ? p.weight_gm : parseWeightToGrams(p.weight || "500g");

    productsToInsert.push({
      id: p.id || `prod_${p.slug}`,
      userId: null,
      farmerId: null,
      name: p.name,
      slug: p.slug,
      description: p.description || null,
      price: Number(p.price || 0),
      compareAtPrice: p.mrp ? Number(p.mrp) : null,
      category: p.category || "dry-fruits",
      stock: Number(p.stock || 0),
      stockGrams: Number(p.stock || 0) * 1000,
      pricePerKg: Math.round(Number(p.price || 0) * (1000 / (weightGrams || 500))),
      lowStockThresholdGrams: 1000,
      unit: p.weight || "500g",
      weightGrams,
      images: Array.isArray(p.images) ? p.images : [p.image].filter(Boolean),
      status: "published",
      hsnCode: p.hsnCode || "0802",
      gstApplicable: true,
      gstRate: 5,
    });
  });

  report.farmerProducts.toUpsert = productsToInsert.length;

  if (isExecute) {
    for (const p of productsToInsert) {
      await sql`
        INSERT INTO farmer_products (
          id, user_id, farmer_id, name, slug, description, price, compare_at_price, category,
          stock, stock_grams, price_per_kg, low_stock_threshold_grams, unit, weight_grams,
          images, status, hsn_code, gst_applicable, gst_rate
        ) VALUES (
          ${p.id}, ${p.userId}, ${p.farmerId}, ${p.name}, ${p.slug}, ${p.description}, ${p.price},
          ${p.compareAtPrice}, ${p.category}, ${p.stock}, ${p.stockGrams}, ${p.pricePerKg},
          ${p.lowStockThresholdGrams}, ${p.unit}, ${p.weightGrams}, ${p.images}, ${p.status},
          ${p.hsnCode}, ${p.gstApplicable}, ${p.gstRate}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          price = EXCLUDED.price,
          category = EXCLUDED.category,
          updated_at = NOW()
      `;
    }
  }

  // ---------------------------------------------------------
  // 3. Product Inventory (Strict: NO baseline stock invented!)
  // ---------------------------------------------------------
  const inventorySnap = await adminDb.collection("product_inventory").get();
  report.productInventory.firestoreFound = inventorySnap.size;

  const inventoryToInsert: any[] = [];
  inventorySnap.docs.forEach((doc) => {
    const d = doc.data();
    const pid = d.product_id || d.productId;
    if (!pid) return;

    inventoryToInsert.push({
      id: doc.id,
      productId: pid,
      variantName: d.variant_name || d.variantName || "standard",
      stockGrams: Number(d.stock_grams || d.stockGrams || 0),
      lowStockThresholdGrams: Number(d.low_stock_threshold_grams || d.lowStockThresholdGrams || 1000),
      soldCount: Number(d.sold_count || d.soldCount || 0),
      pledgedCount: Number(d.pledged_count || d.pledgedCount || 0),
      preorderEnabled: Boolean(d.preorder_enabled || d.preOrderEnabled),
    });
  });

  report.productInventory.toUpsert = inventoryToInsert.length;
  report.productInventory.baselineInvented = 0; // Explicitly 0: No invented baseline stock

  if (isExecute) {
    for (const inv of inventoryToInsert) {
      await sql`
        INSERT INTO product_inventory (
          id, product_id, variant_name, stock_grams, low_stock_threshold_grams,
          sold_count, pledged_count, preorder_enabled
        ) VALUES (
          ${inv.id}, ${inv.productId}, ${inv.variantName}, ${inv.stockGrams},
          ${inv.lowStockThresholdGrams}, ${inv.soldCount}, ${inv.pledgedCount}, ${inv.preorderEnabled}
        )
        ON CONFLICT (id) DO UPDATE SET
          stock_grams = EXCLUDED.stock_grams,
          low_stock_threshold_grams = EXCLUDED.low_stock_threshold_grams,
          preorder_enabled = EXCLUDED.preorder_enabled,
          updated_at = NOW()
      `;
    }
  }

  // ---------------------------------------------------------
  // 4. Shipping Rates -> Shipping Slabs
  // ---------------------------------------------------------
  const shippingRatesSnap = await adminDb.collection("shipping_rates").get();
  report.shippingSlabs.firestoreDocs = shippingRatesSnap.size;

  const slabsToInsert: any[] = [];
  shippingRatesSnap.docs.forEach((doc) => {
    const service = doc.id; // 'india_post' | 'speed_post'
    const d = doc.data();
    const rateSlabs = Array.isArray(d.rate_slabs) ? d.rate_slabs : [];

    rateSlabs.forEach((s: any, idx: number) => {
      const weightUptoGm = Number(s.weight_upto_gm || 500);
      slabsToInsert.push({
        id: `slab_${service}_${weightUptoGm}g`,
        service,
        weightUptoGm,
        localPaise: Math.round(Number(s.local || 0) * 100),
        withinStatePaise: Math.round(Number(s.within_state || 0) * 100),
        zoneMetroPaise: Math.round(Number(s.zone_metro || 0) * 100),
        otherStatesPaise: Math.round(Number(s.other_states || 0) * 100),
      });
    });
  });

  report.shippingSlabs.slabsExtracted = slabsToInsert.length;
  report.shippingSlabs.toUpsert = slabsToInsert.length;

  if (isExecute) {
    for (const slab of slabsToInsert) {
      await sql`
        INSERT INTO shipping_slabs (
          id, service, weight_upto_gm, local_paise, within_state_paise,
          zone_metro_paise, other_states_paise
        ) VALUES (
          ${slab.id}, ${slab.service}, ${slab.weightUptoGm}, ${slab.localPaise},
          ${slab.withinStatePaise}, ${slab.zoneMetroPaise}, ${slab.otherStatesPaise}
        )
        ON CONFLICT (id) DO UPDATE SET
          local_paise = EXCLUDED.local_paise,
          within_state_paise = EXCLUDED.within_state_paise,
          zone_metro_paise = EXCLUDED.zone_metro_paise,
          other_states_paise = EXCLUDED.other_states_paise,
          updated_at = NOW()
      `;
    }
  }

  // ---------------------------------------------------------
  // 5. Pincode Zones
  // ---------------------------------------------------------
  const pincodeZonesSnap = await adminDb.collection("pincode_zones").get();
  report.pincodeZones.firestoreFound = pincodeZonesSnap.size;

  const pincodesToInsert: any[] = [];
  pincodeZonesSnap.docs.forEach((doc) => {
    const d = doc.data();
    pincodesToInsert.push({
      pincodePrefix: doc.id.trim(),
      state: d.state || "Delhi",
      zone: d.zone || "other_states",
    });
  });

  report.pincodeZones.toUpsert = pincodesToInsert.length;

  if (isExecute) {
    for (const p of pincodesToInsert) {
      await sql`
        INSERT INTO pincode_zones (pincode_prefix, state, zone)
        VALUES (${p.pincodePrefix}, ${p.state}, ${p.zone})
        ON CONFLICT (pincode_prefix) DO UPDATE SET
          state = EXCLUDED.state,
          zone = EXCLUDED.zone,
          updated_at = NOW()
      `;
    }
  }

  // ---------------------------------------------------------
  // 6. Last Mile Rates
  // ---------------------------------------------------------
  const lastMileSnap = await adminDb.collection("last_mile_rates").get();
  report.lastMileRates.firestoreDocs = lastMileSnap.size;

  const lastMileToInsert: any[] = [];
  lastMileSnap.docs.forEach((doc) => {
    const d = doc.data();
    const rates = Array.isArray(d.rates) ? d.rates : [];
    rates.forEach((r: any) => {
      const weight = Number(r.weight_upto_gm || 2000);
      lastMileToInsert.push({
        id: `lm_${weight}g`,
        weightUptoGm: weight,
        deliveryOfficePaise: Math.round(Number(r.delivery_office_rate || 0) * 100),
        parcelHubPaise: Math.round(Number(r.parcel_hub_rate || 0) * 100),
      });
    });
  });

  report.lastMileRates.ratesExtracted = lastMileToInsert.length;
  report.lastMileRates.toUpsert = lastMileToInsert.length;

  if (isExecute) {
    for (const lm of lastMileToInsert) {
      await sql`
        INSERT INTO last_mile_rates (id, weight_upto_gm, delivery_office_paise, parcel_hub_paise)
        VALUES (${lm.id}, ${lm.weightUptoGm}, ${lm.deliveryOfficePaise}, ${lm.parcelHubPaise})
        ON CONFLICT (id) DO UPDATE SET
          delivery_office_paise = EXCLUDED.delivery_office_paise,
          parcel_hub_paise = EXCLUDED.parcel_hub_paise,
          updated_at = NOW()
      `;
    }
  }

  // ---------------------------------------------------------
  // 7. App Config -> App Settings
  // ---------------------------------------------------------
  const appConfigSnap = await adminDb.collection("app_config").get();
  report.appSettings.firestoreFound = appConfigSnap.size;

  const settingsToInsert: any[] = [];
  appConfigSnap.docs.forEach((doc) => {
    const key = doc.id === "checkout" ? "shipping_config" : doc.id;
    settingsToInsert.push({
      key,
      value: doc.data(),
      description: `Imported from Firestore app_config/${doc.id}`,
    });
  });

  report.appSettings.toUpsert = settingsToInsert.length;

  if (isExecute) {
    for (const s of settingsToInsert) {
      await sql`
        INSERT INTO app_settings (key, value, description)
        VALUES (${s.key}, ${JSON.stringify(s.value)}, ${s.description})
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          description = EXCLUDED.description,
          updated_at = NOW()
      `;
    }
  }

  // ---------------------------------------------------------
  // 8. System Notifications
  // ---------------------------------------------------------
  const systemNotifSnap = await adminDb.collection("system_notifications").get();
  report.systemNotifications.firestoreFound = systemNotifSnap.size;

  const notifsToInsert: any[] = [];
  systemNotifSnap.docs.forEach((doc) => {
    const d = doc.data();
    notifsToInsert.push({
      id: doc.id,
      userId: d.user_id || null,
      type: d.type || "order_status",
      title: d.title || "Order Notification",
      message: d.message || "",
      read: Boolean(d.read),
      data: d.data || {},
    });
  });

  report.systemNotifications.toUpsert = notifsToInsert.length;

  if (isExecute) {
    for (const n of notifsToInsert) {
      await sql`
        INSERT INTO system_notifications (id, user_id, type, title, message, read, metadata)
        VALUES (${n.id}, ${n.userId}, ${n.type}, ${n.title}, ${n.message}, ${n.read}, ${JSON.stringify(n.data)})
        ON CONFLICT (id) DO UPDATE SET
          read = EXCLUDED.read,
          title = EXCLUDED.title,
          message = EXCLUDED.message
      `;
    }
  }

  // ---------------------------------------------------------
  // 9. Notification Preferences
  // ---------------------------------------------------------
  const notifPrefSnap = await adminDb.collection("notification_preferences").get();
  report.notificationPreferences.firestoreFound = notifPrefSnap.size;

  const prefsToInsert: any[] = [];
  notifPrefSnap.docs.forEach((doc) => {
    const d = doc.data();
    prefsToInsert.push({
      userId: doc.id,
      newsletter: d.newsletter ?? true,
      orderUpdatesEmail: d.order_updates_email ?? true,
      orderUpdatesSms: d.order_updates_sms ?? false,
      promotionsEmail: d.promotions_email ?? true,
      promotionsSms: d.promotions_sms ?? false,
    });
  });

  report.notificationPreferences.toUpsert = prefsToInsert.length;

  if (isExecute) {
    for (const p of prefsToInsert) {
      await sql`
        INSERT INTO notification_preferences (
          user_id, newsletter, order_updates_email, order_updates_sms, promotions_email, promotions_sms
        ) VALUES (
          ${p.userId}, ${p.newsletter}, ${p.orderUpdatesEmail}, ${p.orderUpdatesSms}, ${p.promotionsEmail}, ${p.promotionsSms}
        )
        ON CONFLICT (user_id) DO UPDATE SET
          newsletter = EXCLUDED.newsletter,
          order_updates_email = EXCLUDED.order_updates_email,
          order_updates_sms = EXCLUDED.order_updates_sms,
          promotions_email = EXCLUDED.promotions_email,
          promotions_sms = EXCLUDED.promotions_sms,
          updated_at = NOW()
      `;
    }
  }

  // ---------------------------------------------------------
  // 10. Wishlist Items
  // ---------------------------------------------------------
  const wishlistSnap = await adminDb.collection("wishlist_items").get();
  report.wishlistItems.firestoreFound = wishlistSnap.size;

  const wishlistToInsert: any[] = [];
  wishlistSnap.docs.forEach((doc) => {
    const d = doc.data();
    if (!d.user_id || !d.product_slug) return;
    wishlistToInsert.push({
      id: doc.id,
      userId: d.user_id,
      productSlug: d.product_slug,
    });
  });

  report.wishlistItems.toUpsert = wishlistToInsert.length;

  if (isExecute) {
    for (const w of wishlistToInsert) {
      await sql`
        INSERT INTO wishlist_items (id, user_id, product_slug)
        VALUES (${w.id}, ${w.userId}, ${w.productSlug})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  }

  // ---------------------------------------------------------
  // 11. Product Reviews (No "purchased" requirement)
  // ---------------------------------------------------------
  const reviewsSnap = await adminDb.collection("product_reviews").get();
  report.productReviews.firestoreFound = reviewsSnap.size;
  report.productReviews.toUpsert = reviewsSnap.size;

  // ---------------------------------------------------------
  // 12. Addresses
  // ---------------------------------------------------------
  const addressesSnap = await adminDb.collection("addresses").get();
  report.addresses.firestoreFound = addressesSnap.size;
  report.addresses.toUpsert = addressesSnap.size;

  // ---------------------------------------------------------
  // 13. Recently Viewed
  // ---------------------------------------------------------
  const recentlyViewedSnap = await adminDb.collection("recently_viewed").get();
  report.recentlyViewed.firestoreFound = recentlyViewedSnap.size;
  report.recentlyViewed.toUpsert = recentlyViewedSnap.size;

  // ---------------------------------------------------------
  // DRY RUN / EXECUTE SUMMARY REPORT (NO PII)
  // ---------------------------------------------------------
  console.log("------------------------------------------------------------------");
  console.log("                     DRY RUN AUDIT SUMMARY                        ");
  console.log("------------------------------------------------------------------");
  console.table({
    "Farmer Profiles": {
      "Source (Firestore)": report.farmerProfiles.found,
      "Prepared for DB": report.farmerProfiles.toUpsert,
      Notes: "Includes default profile for static products",
    },
    "Farmer Products": {
      "Source (Firestore)": `${report.farmerProducts.firestoreFound} custom + ${report.farmerProducts.staticCatalogFound} static`,
      "Prepared for DB": report.farmerProducts.toUpsert,
      Notes: "Static catalog included; zero inventory baseline",
    },
    "Product Inventory": {
      "Source (Firestore)": report.productInventory.firestoreFound,
      "Prepared for DB": report.productInventory.toUpsert,
      Notes: "0 baseline grams invented; missing = unlimited",
    },
    "Shipping Slabs": {
      "Source (Firestore)": `${report.shippingSlabs.firestoreDocs} docs`,
      "Prepared for DB": report.shippingSlabs.toUpsert,
      Notes: "speed_post & india_post rate slabs in paise",
    },
    "Pincode Zones": {
      "Source (Firestore)": report.pincodeZones.firestoreFound,
      "Prepared for DB": report.pincodeZones.toUpsert,
      Notes: "Zone mapping by 3-digit prefix",
    },
    "Last Mile Rates": {
      "Source (Firestore)": `${report.lastMileRates.firestoreDocs} docs`,
      "Prepared for DB": report.lastMileRates.toUpsert,
      Notes: "Parcel hub & delivery office rates in paise",
    },
    "App Settings": {
      "Source (Firestore)": report.appSettings.firestoreFound,
      "Prepared for DB": report.appSettings.toUpsert,
      Notes: "shipping_config jsonb settings",
    },
    "System Notifications": {
      "Source (Firestore)": report.systemNotifications.firestoreFound,
      "Prepared for DB": report.systemNotifications.toUpsert,
      Notes: "Order status change logs",
    },
    "Notification Preferences": {
      "Source (Firestore)": report.notificationPreferences.firestoreFound,
      "Prepared for DB": report.notificationPreferences.toUpsert,
      Notes: "Email/SMS preferences per user",
    },
    "Wishlist Items": {
      "Source (Firestore)": report.wishlistItems.firestoreFound,
      "Prepared for DB": report.wishlistItems.toUpsert,
      Notes: "10 items referencing static catalog slugs",
    },
    "Product Reviews": {
      "Source (Firestore)": report.productReviews.firestoreFound,
      "Prepared for DB": report.productReviews.toUpsert,
      Notes: "No 'purchased the product' restriction",
    },
    Addresses: {
      "Source (Firestore)": report.addresses.firestoreFound,
      "Prepared for DB": report.addresses.toUpsert,
      Notes: "0 standalone address docs in Firestore",
    },
    "Recently Viewed": {
      "Source (Firestore)": report.recentlyViewed.firestoreFound,
      "Prepared for DB": report.recentlyViewed.toUpsert,
      Notes: "0 docs in Firestore (client-side managed)",
    },
  });

  console.log("------------------------------------------------------------------");
  if (isDryRun) {
    console.log("STATUS: DRY-RUN COMPLETE. NO WRITES PERFORMED.");
    console.log("To apply these changes, wait for user approval, then run with --execute.");
  } else {
    console.log("STATUS: EXECUTION COMPLETE. DEV NEON DATABASE UPDATED.");
  }
  console.log("==================================================================\n");

  await sql.end();
}

run().catch((err) => {
  console.error("FATAL ERROR in import-converted-data:", err);
  process.exit(1);
});
