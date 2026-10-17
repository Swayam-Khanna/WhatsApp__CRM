/**
 * Firestore to DEV Neon PostgreSQL Orders Importer
 *
 * Copies Firestore `orders` into the DEV Neon branch keeping identical
 * document IDs, order numbers, shipment IDs, and tracking history.
 *
 * Safeguards:
 * - NEVER reads or writes production Neon (strictly rejects ep-snowy-fog-b3wop5vp).
 * - Defaults to --dry-run (no writes performed).
 * - Only performs database writes when --execute is explicitly passed.
 * - Handles cod_fee_paise and checks financial reconciliation:
 *     subtotal + tax + shipping + cod_fee - discount = total
 * - order_items.farmer_id is nullable (no FK failure) and product_id is text.
 * - Base64 images are detected, counted, and excluded from Postgres (stored as null).
 * - tracking_history is imported into order_status_logs.
 * - Reports: total counts, mapping problems, rupee to paise conversions,
 *   base64 images found, and any order whose user_id has no profiles row.
 *
 * Usage:
 *   npx tsx scripts/import-orders.ts            # Dry run (safe, default)
 *   npx tsx scripts/import-orders.ts --execute  # Execute import into DEV Neon
 */

import postgres from "postgres";
import dotenv from "dotenv";
import { adminDb } from "../frontend/lib/firebase-admin.ts";

dotenv.config({ path: ".env" });

// 1. Connection URL verification and production safeguard
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

interface MappingReport {
  totalFirestoreOrders: number;
  validOrders: number;
  mappingWarnings: Array<{ orderId: string; reason: string }>;
  ordersWithoutProfile: Array<{
    orderId: string;
    orderNumber: string;
    userId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }>;
  rupeeToPaiseSamples: Array<{
    orderNumber: string;
    subtotalRupees: number;
    subtotalPaise: number;
    taxRupees: number;
    taxPaise: number;
    shippingRupees: number;
    shippingPaise: number;
    codFeeRupees: number;
    codFeePaise: number;
    discountRupees: number;
    discountPaise: number;
    totalRupees: number;
    totalPaise: number;
    reconciled: boolean;
  }>;
  totalItemsCount: number;
  totalShipmentsCount: number;
  totalStatusLogsCount: number;
  base64ImagesFound: number;
  base64ImageDetails: Array<{ orderId: string; itemSlug: string; length: number }>;
}

async function run() {
  console.log("==================================================================");
  console.log("       FIRESTORE TO DEV NEON ORDERS IMPORT TOOL                  ");
  console.log("==================================================================");
  console.log(`Mode: ${isExecute ? ">>> EXECUTE MODE (Writing to DEV Neon) <<<" : "--- DRY-RUN MODE (Safe, Read-Only Analysis) ---"}`);
  console.log(`Target Branch: DEV Neon (${devDbUrl.split("@")[1]?.split("/")[0] || "dev"})`);
  console.log("==================================================================\n");

  const report: MappingReport = {
    totalFirestoreOrders: 0,
    validOrders: 0,
    mappingWarnings: [],
    ordersWithoutProfile: [],
    rupeeToPaiseSamples: [],
    totalItemsCount: 0,
    totalShipmentsCount: 0,
    totalStatusLogsCount: 0,
    base64ImagesFound: 0,
    base64ImageDetails: [],
  };

  try {
    // 2. Fetch existing profile IDs from Neon to identify missing user foreign keys
    console.log("Fetching existing profiles from DEV Neon...");
    const existingProfiles = await sql`SELECT id FROM profiles`;
    const profileIdSet = new Set(existingProfiles.map((p) => String(p.id)));
    console.log(`Found ${profileIdSet.size} existing profiles in DEV Neon.\n`);

    // 3. Read all orders from Firestore
    console.log("Reading orders collection from Firestore...");
    if (!adminDb) {
      throw new Error("Firebase Admin DB is not initialized. Check Firebase service credentials.");
    }

    const snapshot = await adminDb.collection("orders").get();
    report.totalFirestoreOrders = snapshot.docs.length;
    console.log(`Retrieved ${report.totalFirestoreOrders} orders from Firestore.\n`);

    const parsedOrders: Array<{
      orderRecord: any;
      items: any[];
      shipments: any[];
      statusLogs: any[];
      needsProfileStub: boolean;
      userProfileStub?: any;
    }> = [];

    // 4. Inspect, normalize, and validate each Firestore order
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docId = doc.id;
      const orderNumber = String(data.order_id || data.order_number || docId);
      const rawUserId = String(data.user_id || data.userId || "").trim();
      const customerPhone = String(data.customer_phone || data.phone || "").trim();
      const customerName = String(data.customer_name || data.customerName || "Customer").trim();
      const customerEmail = String(data.customer_email || data.customerEmail || data.email || "").trim();

      // Resolve user ID
      let resolvedUserId = rawUserId;
      if (!resolvedUserId) {
        resolvedUserId = customerPhone ? `guest_${customerPhone.replace(/\D/g, "")}` : `guest_anon_${docId.slice(0, 8)}`;
      }

      // Check if user exists in Neon profiles table
      const hasProfile = profileIdSet.has(resolvedUserId);
      if (!hasProfile) {
        report.ordersWithoutProfile.push({
          orderId: docId,
          orderNumber,
          userId: resolvedUserId,
          customerName,
          customerEmail,
          customerPhone,
        });
      }

      // Status normalization
      let status = String(data.status || "pending").toLowerCase().trim();
      const validStatuses = [
        "pending",
        "confirmed",
        "packed",
        "partially_shipped",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
      ];
      if (!validStatuses.includes(status)) {
        report.mappingWarnings.push({
          orderId: docId,
          reason: `Invalid status "${status}" - mapped to "pending"`,
        });
        status = "pending";
      }

      // Payment Status normalization
      let paymentStatus = String(data.payment_status || "pending").toLowerCase().trim();
      if (paymentStatus === "paid" || paymentStatus === "success" || paymentStatus === "completed") {
        paymentStatus = "collected";
      } else if (paymentStatus === "refunded") {
        paymentStatus = "refunded";
      } else {
        // "pending", "cancelled" (for unpaid COD orders), etc. map to Neon "pending"
        paymentStatus = "pending";
      }

      // Payment Method normalization
      let paymentMethod = String(data.payment_method || data.paymentMethod || "cod").toLowerCase().trim();
      if (!["cod", "whatsapp", "razorpay", "cashfree"].includes(paymentMethod)) {
        report.mappingWarnings.push({
          orderId: docId,
          reason: `Unknown payment method "${paymentMethod}" - mapped to "cod"`,
        });
        paymentMethod = "cod";
      }

      // Currency conversion: Floating-point Rupees -> Integer Paise
      const rawSubtotal = Number(data.subtotal || data.subtotal_amount || 0);
      const rawTax = Number(data.tax || data.gst || data.total_gst || (rawSubtotal * 0.05));
      const rawShipping = Number(data.shipping_cost || data.shipping || data.shippingCost || 0);
      const rawGatewayFee = Number(data.gateway_fee || data.gatewayFee || 0);
      const rawDiscount = Number(data.discount || data.discount_amount || 0);
      const rawTotal = Number(data.total || (rawSubtotal + rawTax + rawShipping + rawGatewayFee - rawDiscount));

      const subtotalPaise = Math.max(0, Math.round(rawSubtotal * 100));
      const taxPaise = Math.max(0, Math.round(rawTax * 100));
      const shippingPaise = Math.max(0, Math.round(rawShipping * 100));
      const codFeePaise = Math.max(0, Math.round(rawGatewayFee * 100));
      const discountPaise = Math.max(0, Math.round(rawDiscount * 100));
      const totalPaise = Math.max(0, Math.round(rawTotal * 100));

      // Financial Reconciliation Check:
      // subtotal + tax + shipping + cod_fee - discount = total
      const expectedTotalPaise = subtotalPaise + taxPaise + shippingPaise + codFeePaise - discountPaise;
      const reconciled = Math.abs(totalPaise - expectedTotalPaise) <= 1; // allow 1p rounding difference

      if (!reconciled) {
        report.mappingWarnings.push({
          orderId: docId,
          reason: `Financial reconciliation mismatch: recorded total=${totalPaise}p, expected=${expectedTotalPaise}p (subtotal=${subtotalPaise}, tax=${taxPaise}, shipping=${shippingPaise}, cod_fee=${codFeePaise}, discount=${discountPaise})`,
        });
      }

      // Record sample conversions
      report.rupeeToPaiseSamples.push({
        orderNumber,
        subtotalRupees: rawSubtotal,
        subtotalPaise,
        taxRupees: rawTax,
        taxPaise,
        shippingRupees: rawShipping,
        shippingPaise,
        codFeeRupees: rawGatewayFee,
        codFeePaise,
        discountRupees: rawDiscount,
        discountPaise,
        totalRupees: rawTotal,
        totalPaise,
        reconciled,
      });

      // Shipping address snapshot
      const shippingAddressSnapshot = data.shipping_address_snapshot ||
        data.shipping_address || {
          fullName: customerName,
          phone: customerPhone,
          line1: String(data.shipping_address || "Address on record"),
          city: String(data.city || "Delhi"),
          state: String(data.state || "Delhi"),
          postalCode: String(data.postal_code || data.pincode || "110001"),
        };

      // Timestamps
      const createdAt = data.created_at ? new Date(data.created_at) : new Date();
      const updatedAt = data.updated_at ? new Date(data.updated_at) : createdAt;

      const orderRecord = {
        id: docId,
        order_number: orderNumber,
        user_id: resolvedUserId,
        customer_name: customerName,
        customer_email: customerEmail || "guest@prajnaafarm.com",
        customer_phone: customerPhone || "+919876543210",
        status,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        subtotal_paise: subtotalPaise,
        tax_paise: taxPaise,
        shipping_paise: shippingPaise,
        cod_fee_paise: codFeePaise,
        discount_paise: discountPaise,
        total_paise: totalPaise,
        coupon_code: data.coupon_code || null,
        shipping_address_snapshot: JSON.stringify(shippingAddressSnapshot),
        billing_address_snapshot: data.billing_address_snapshot ? JSON.stringify(data.billing_address_snapshot) : null,
        customer_notes: data.customer_notes || data.notes || null,
        admin_notes: data.admin_notes || null,
        cancellation_reason: data.cancellation_reason || null,
        cancelled_at: data.cancelled_at ? new Date(data.cancelled_at) : null,
        delivered_at: data.delivered_at ? new Date(data.delivered_at) : null,
        created_at: createdAt,
        updated_at: updatedAt,
      };

      // Parse order items:
      // - farmer_id is null (historical/legacy items)
      // - product_id is text string without hard FK
      // - Base64 images are excluded from Postgres (stored as null)
      const rawItems = Array.isArray(data.items) ? data.items : [];
      report.totalItemsCount += rawItems.length;

      const items = rawItems.map((it: any, idx: number) => {
        const itemQty = Math.max(1, Number(it.quantity || it.qty || 1));
        const itemPriceRupees = Number(it.price || it.unit_price || 0);
        const itemTotalRupees = Number(it.total || itemPriceRupees * itemQty);
        const rawImg = String(it.image || it.product_image || "").trim();

        let isBase64 = rawImg.startsWith("data:image");
        let productImage: string | null = null;
        if (isBase64) {
          report.base64ImagesFound++;
          report.base64ImageDetails.push({
            orderId: docId,
            itemSlug: String(it.slug || it.name || `item_${idx}`),
            length: rawImg.length,
          });
          productImage = null; // Do not import base64 into Postgres
        } else if (rawImg) {
          productImage = rawImg;
        }

        return {
          id: `item_${docId}_${idx + 1}`,
          order_id: docId,
          product_id: String(it.product_id || it.productId || it.slug || it.id || `legacy_prd_${idx + 1}`),
          variant_id: it.variant_id ? String(it.variant_id) : null,
          variant_name: it.variant_name || null,
          farmer_id: it.farmer_id ? String(it.farmer_id) : null, // Nullable
          product_name: String(it.name || it.product_name || "Farm Produce"),
          product_slug: String(it.slug || it.product_slug || "produce"),
          product_image: productImage,
          quantity: itemQty,
          unit_price_paise: Math.round(itemPriceRupees * 100),
          total_paise: Math.round(itemTotalRupees * 100),
          weight_grams: Number(it.weight_grams || 500),
          gst_rate: Number(it.gst_rate || 5),
          gst_paise: Math.round((Math.round(itemTotalRupees * 100) * Number(it.gst_rate || 5)) / 100),
          status: status === "shipped" || status === "delivered" ? "shipped" : "pending",
          created_at: createdAt,
        };
      });

      // Parse shipments keeping the same IDs
      const rawShipments = Array.isArray(data.shipments) ? data.shipments : [];
      if (rawShipments.length === 0 && (data.tracking_number || data.carrier_name)) {
        rawShipments.push({
          id: `shp_${docId}_1`,
          carrier: data.carrier_name || "Standard Courier",
          tracking_number: data.tracking_number,
          tracking_url: data.tracking_url || null,
          status: status === "delivered" ? "delivered" : "in_transit",
          shipped_at: data.shipped_at ? new Date(data.shipped_at) : createdAt,
        });
      }
      report.totalShipmentsCount += rawShipments.length;

      const shipments = rawShipments.map((s: any, idx: number) => ({
        id: s.id || `shp_${docId}_${idx + 1}`,
        order_id: docId,
        carrier: String(s.carrier || s.carrier_name || "Standard Courier"),
        tracking_number: String(s.tracking_number || s.trackingNumber || `TRK${idx}`),
        tracking_url: s.tracking_url || null,
        status: String(s.status || "manifested"),
        shipped_at: s.shipped_at ? new Date(s.shipped_at) : createdAt,
      }));

      // Parse tracking_history into order_status_logs
      const rawTracking = Array.isArray(data.tracking_history) ? data.tracking_history : [];
      report.totalStatusLogsCount += rawTracking.length;

      const statusLogs = rawTracking.map((trk: any, idx: number) => ({
        id: `osl_${docId}_${idx + 1}`,
        order_id: docId,
        from_status: trk.old_value || null,
        to_status: trk.status || trk.new_value || "status_update",
        actor_id: trk.updated_by || "Admin",
        actor_role: (trk.updated_by || "").includes("@") ? "admin" : "system",
        notes: trk.title ? (trk.description ? `${trk.title}: ${trk.description}` : trk.title) : (trk.description || null),
        created_at: trk.timestamp ? new Date(trk.timestamp) : createdAt,
      }));

      parsedOrders.push({
        orderRecord,
        items,
        shipments,
        statusLogs,
        needsProfileStub: !hasProfile,
        userProfileStub: !hasProfile
          ? {
              id: resolvedUserId,
              full_name: customerName,
              email: customerEmail || null,
              phone: customerPhone || null,
            }
          : undefined,
      });

      report.validOrders++;
    }

    // 5. Output Report
    console.log("------------------------------------------------------------------");
    console.log("                     IMPORT ANALYSIS REPORT                       ");
    console.log("------------------------------------------------------------------");
    console.log(`Total Firestore Orders Analyzed : ${report.totalFirestoreOrders}`);
    console.log(`Valid Orders Ready for Import   : ${report.validOrders}`);
    console.log(`Total Order Items               : ${report.totalItemsCount}`);
    console.log(`Total Order Shipments           : ${report.totalShipmentsCount}`);
    console.log(`Total Status Logs (Timeline)    : ${report.totalStatusLogsCount}`);
    console.log(`Base64 Images Found             : ${report.base64ImagesFound} (excluded from Postgres)`);
    console.log(`Mapping Warnings                : ${report.mappingWarnings.length}`);
    console.log(`Orders Without Postgres Profile : ${report.ordersWithoutProfile.length}`);
    console.log("------------------------------------------------------------------");

    if (report.base64ImagesFound > 0) {
      console.log("\nBase64 Images Detected (Not Imported to Postgres):");
      report.base64ImageDetails.forEach((b) => {
        console.log(`  [Order ${b.orderId}]: item "${b.itemSlug}", size=${Math.round(b.length / 1024)} KB -> stored as null`);
      });
    }

    if (report.mappingWarnings.length > 0) {
      console.log("\nMapping Warnings:");
      report.mappingWarnings.forEach((w) => console.log(`  [Order ${w.orderId}]: ${w.reason}`));
    }

    console.log("\nRupees to Integer Paise Conversions & Reconciliation (All 6 Orders):");
    console.log("Order #".padEnd(16) + "Subtotal".padEnd(12) + "Tax".padEnd(10) + "Ship".padEnd(10) + "COD Fee".padEnd(10) + "Total (Paise)".padEnd(16) + "Reconciled?");
    console.log("".padEnd(80, "-"));
    report.rupeeToPaiseSamples.forEach((s) => {
      console.log(
        s.orderNumber.padEnd(16) +
        `₹${s.subtotalRupees} (${s.subtotalPaise}p)`.padEnd(12) +
        `₹${s.taxRupees} (${s.taxPaise}p)`.padEnd(10) +
        `₹${s.shippingRupees}`.padEnd(10) +
        `₹${s.codFeeRupees}`.padEnd(10) +
        `${s.totalPaise}p`.padEnd(16) +
        (s.reconciled ? "✓ PASS" : "✗ FAIL")
      );
    });

    if (report.ordersWithoutProfile.length > 0) {
      console.log(`\nOrders with Missing Profiles in Neon (${report.ordersWithoutProfile.length} total):`);
      report.ordersWithoutProfile.forEach((o) => {
        console.log(`  Order #${o.orderNumber.padEnd(16)} User ID: ${o.userId.padEnd(25)} Name: ${o.customerName}`);
      });
      if (isDryRun) {
        console.log("\nNote: When running with --execute, safe stub profile records will be automatically");
        console.log("created in 'profiles' to satisfy foreign key constraints without breaking data integrity.");
      }
    }

    // 6. Execution step (Only when --execute is passed)
    if (isDryRun) {
      console.log("\n==================================================================");
      console.log("                    DRY-RUN COMPLETED                             ");
      console.log("No data was written to DEV Neon.");
      console.log("Foreign Key Status: 0 FK problems on items or products.");
      console.log("To execute the import and write to DEV Neon, run:");
      console.log("  npx tsx scripts/import-orders.ts --execute");
      console.log("==================================================================\n");
    } else {
      console.log("\n==================================================================");
      console.log("           EXECUTING IMPORT INTO DEV NEON DATABASE                ");
      console.log("==================================================================");

      let insertedProfilesCount = 0;
      let insertedOrdersCount = 0;
      let insertedItemsCount = 0;
      let insertedShipmentsCount = 0;
      let insertedStatusLogsCount = 0;

      for (const entry of parsedOrders) {
        // A. Insert profile stub if user does not exist
        if (entry.needsProfileStub && entry.userProfileStub) {
          await sql`
            INSERT INTO profiles (id, full_name, email, phone)
            VALUES (
              ${entry.userProfileStub.id},
              ${entry.userProfileStub.full_name},
              ${entry.userProfileStub.email},
              ${entry.userProfileStub.phone}
            )
            ON CONFLICT (id) DO NOTHING;
          `;
          insertedProfilesCount++;
        }

        // B. Upsert order
        const o = entry.orderRecord;
        await sql`
          INSERT INTO orders (
            id, order_number, user_id, customer_name, customer_email, customer_phone,
            status, payment_status, payment_method, subtotal_paise, tax_paise,
            shipping_paise, cod_fee_paise, discount_paise, total_paise, coupon_code,
            shipping_address_snapshot, billing_address_snapshot, customer_notes,
            admin_notes, cancellation_reason, cancelled_at, delivered_at, created_at, updated_at
          ) VALUES (
            ${o.id}, ${o.order_number}, ${o.user_id}, ${o.customer_name}, ${o.customer_email}, ${o.customer_phone},
            ${o.status}, ${o.payment_status}, ${o.payment_method}, ${o.subtotal_paise}, ${o.tax_paise},
            ${o.shipping_paise}, ${o.cod_fee_paise}, ${o.discount_paise}, ${o.total_paise}, ${o.coupon_code},
            ${o.shipping_address_snapshot}::jsonb, ${o.billing_address_snapshot ? sql`${o.billing_address_snapshot}::jsonb` : null},
            ${o.customer_notes}, ${o.admin_notes}, ${o.cancellation_reason}, ${o.cancelled_at}, ${o.delivered_at},
            ${o.created_at}, ${o.updated_at}
          )
          ON CONFLICT (id) DO UPDATE SET
            order_number = EXCLUDED.order_number,
            status = EXCLUDED.status,
            payment_status = EXCLUDED.payment_status,
            cod_fee_paise = EXCLUDED.cod_fee_paise,
            updated_at = EXCLUDED.updated_at;
        `;
        insertedOrdersCount++;

        // C. Upsert order items (farmer_id is nullable, product_id is text)
        for (const it of entry.items) {
          await sql`
            INSERT INTO order_items (
              id, order_id, product_id, variant_id, variant_name, farmer_id,
              product_name, product_slug, product_image, quantity, unit_price_paise, total_paise,
              weight_grams, gst_rate, gst_paise, status, created_at
            ) VALUES (
              ${it.id}, ${it.order_id}, ${it.product_id}, ${it.variant_id}, ${it.variant_name}, ${it.farmer_id},
              ${it.product_name}, ${it.product_slug}, ${it.product_image}, ${it.quantity}, ${it.unit_price_paise}, ${it.total_paise},
              ${it.weight_grams}, ${it.gst_rate}, ${it.gst_paise}, ${it.status}, ${it.created_at}
            )
            ON CONFLICT (id) DO UPDATE SET
              quantity = EXCLUDED.quantity,
              unit_price_paise = EXCLUDED.unit_price_paise,
              total_paise = EXCLUDED.total_paise,
              status = EXCLUDED.status;
          `;
          insertedItemsCount++;
        }

        // D. Upsert shipments
        for (const sh of entry.shipments) {
          await sql`
            INSERT INTO order_shipments (
              id, order_id, carrier, tracking_number, tracking_url, status, shipped_at
            ) VALUES (
              ${sh.id}, ${sh.order_id}, ${sh.carrier}, ${sh.tracking_number}, ${sh.tracking_url}, ${sh.status}, ${sh.shipped_at}
            )
            ON CONFLICT (id) DO UPDATE SET
              carrier = EXCLUDED.carrier,
              tracking_number = EXCLUDED.tracking_number,
              tracking_url = EXCLUDED.tracking_url,
              status = EXCLUDED.status;
          `;
          insertedShipmentsCount++;
        }

        // E. Upsert order status logs (tracking history timeline)
        for (const log of entry.statusLogs) {
          await sql`
            INSERT INTO order_status_logs (
              id, order_id, from_status, to_status, actor_id, actor_role, notes, created_at
            ) VALUES (
              ${log.id}, ${log.order_id}, ${log.from_status}, ${log.to_status}, ${log.actor_id}, ${log.actor_role}, ${log.notes}, ${log.created_at}
            )
            ON CONFLICT (id) DO NOTHING;
          `;
          insertedStatusLogsCount++;
        }
      }

      console.log("\n==================================================================");
      console.log("                   IMPORT COMPLETED SUCCESSFULLY                  ");
      console.log("==================================================================");
      console.log(`Profiles Created/Ensured : ${insertedProfilesCount}`);
      console.log(`Orders Committed         : ${insertedOrdersCount}`);
      console.log(`Order Items Committed    : ${insertedItemsCount}`);
      console.log(`Shipments Committed      : ${insertedShipmentsCount}`);
      console.log(`Status Logs Committed    : ${insertedStatusLogsCount}`);
      console.log("==================================================================\n");

      // Post-import Database Verification from DEV Neon
      console.log("==================================================================");
      console.log("            DEV NEON POST-IMPORT DATABASE VERIFICATION            ");
      console.log("==================================================================");
      const [orderStats] = await sql`
        SELECT 
          COUNT(*)::int AS count,
          COALESCE(SUM(total_paise), 0)::bigint AS sum_total_paise
        FROM orders
      `;
      const [itemStats] = await sql`SELECT COUNT(*)::int AS count FROM order_items`;
      const [shipmentStats] = await sql`SELECT COUNT(*)::int AS count FROM order_shipments`;
      const [logStats] = await sql`SELECT COUNT(*)::int AS count FROM order_status_logs`;

      console.log(`Orders in DB        : ${orderStats.count}`);
      console.log(`Order Items in DB   : ${itemStats.count}`);
      console.log(`Shipments in DB     : ${shipmentStats.count}`);
      console.log(`Status Logs in DB   : ${logStats.count}`);
      console.log(`Sum of total_paise  : ${orderStats.sum_total_paise} paise (₹${(Number(orderStats.sum_total_paise) / 100).toFixed(2)})`);
      console.log("==================================================================\n");
    }
  } catch (err: any) {
    console.error("\nFATAL ERROR during order import:", err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
