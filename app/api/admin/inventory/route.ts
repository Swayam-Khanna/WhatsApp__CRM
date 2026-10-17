import { NextRequest, NextResponse } from "next/server.js";
import { requireAdminAuth } from "../../../../frontend/lib/api/admin-auth.server.ts";
import { isNeonDataProvider } from "../../../../backend/lib/data-provider.ts";
import { db } from "../../../../backend/db.ts";
import {
  productInventory,
  farmerProducts,
  farmerProfiles,
} from "../../../../backend/schema/index.ts";
import { eq, desc } from "drizzle-orm";
import { adminDb } from "../../../../frontend/lib/firebase-admin.ts";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/inventory
 * Returns inventory records with linked product and farmer data.
 */
export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    // ------------------------------------------
    // PATH 1: NEON DATA PROVIDER (PostgreSQL)
    // ------------------------------------------
    if (isNeonDataProvider()) {
      const rows = await db
        .select({
          inventory: productInventory,
          product: {
            id: farmerProducts.id,
            name: farmerProducts.name,
            slug: farmerProducts.slug,
            unit: farmerProducts.unit,
            category: farmerProducts.category,
            price: farmerProducts.price,
            images: farmerProducts.images,
            status: farmerProducts.status,
          },
          farmer: {
            id: farmerProfiles.id,
            fullName: farmerProfiles.fullName,
            farmName: farmerProfiles.farmName,
          },
        })
        .from(productInventory)
        .leftJoin(farmerProducts, eq(productInventory.productId, farmerProducts.id))
        .leftJoin(farmerProfiles, eq(farmerProducts.farmerId, farmerProfiles.id))
        .orderBy(desc(productInventory.updatedAt));

      const items = rows.map(({ inventory, product, farmer }) => ({
        id: inventory.id,
        product_id: inventory.productId,
        variant_id: inventory.variantId || "standard",
        variant_name: inventory.variantName || "standard",
        stock_grams: inventory.stockGrams,
        quantity: inventory.quantity,
        low_stock_threshold_grams: inventory.lowStockThresholdGrams,
        sold_count: inventory.soldCount,
        pledged_count: inventory.pledgedCount,
        preorder_enabled: inventory.preorderEnabled,
        product_name: product?.name || "Product",
        product_slug: product?.slug || "",
        category: product?.category || "general",
        price: product?.price || 0,
        images: product?.images || [],
        status: product?.status || "draft",
        farmer_name: farmer?.fullName || farmer?.farmName || "Farmer",
        updated_at: inventory.updatedAt instanceof Date ? inventory.updatedAt.toISOString() : String(inventory.updatedAt),
        _source: "neon",
      }));

      return NextResponse.json({
        success: true,
        count: items.length,
        inventory: items,
      });
    }

    // ------------------------------------------
    // PATH 2: FIRESTORE DATA PROVIDER (Default)
    // ------------------------------------------
    if (!adminDb) {
      return NextResponse.json({ success: true, count: 0, inventory: [] });
    }

    const snap = await adminDb.collection("product_inventory").get();
    const firestoreItems = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      _source: "firestore",
    }));

    return NextResponse.json({
      success: true,
      count: firestoreItems.length,
      inventory: firestoreItems,
    });
  } catch (error: any) {
    console.error("[Admin Inventory GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch inventory: " + (error?.message || "Internal error") },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/inventory
 * Updates inventory settings (low stock threshold, preorder enabled).
 */
export async function PATCH(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { productId, lowStockThresholdGrams, preorderEnabled } = body;

    if (!productId) {
      return NextResponse.json({ success: false, error: "Product ID is required." }, { status: 400 });
    }

    // ------------------------------------------
    // PATH 1: NEON DATA PROVIDER (PostgreSQL)
    // ------------------------------------------
    if (isNeonDataProvider()) {
      const updateData: any = { updatedAt: new Date() };
      if (lowStockThresholdGrams !== undefined) {
        updateData.lowStockThresholdGrams = Number(lowStockThresholdGrams);
      }
      if (preorderEnabled !== undefined) {
        updateData.preorderEnabled = Boolean(preorderEnabled);
      }

      await db
        .update(productInventory)
        .set(updateData)
        .where(eq(productInventory.productId, productId));

      if (lowStockThresholdGrams !== undefined) {
        await db
          .update(farmerProducts)
          .set({ lowStockThresholdGrams: Number(lowStockThresholdGrams) })
          .where(eq(farmerProducts.id, productId));
      }

      return NextResponse.json({ success: true, productId, ...updateData, _source: "neon" });
    }

    // ------------------------------------------
    // PATH 2: FIRESTORE DATA PROVIDER (Default)
    // ------------------------------------------
    if (adminDb) {
      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (lowStockThresholdGrams !== undefined) {
        updatePayload.low_stock_threshold_grams = Number(lowStockThresholdGrams);
      }
      if (preorderEnabled !== undefined) {
        updatePayload.preorder_enabled = Boolean(preorderEnabled);
      }

      await adminDb.collection("product_inventory").doc(`inv_${productId}`).set(updatePayload, { merge: true });
      return NextResponse.json({ success: true, productId, ...updatePayload, _source: "firestore" });
    }

    return NextResponse.json({ success: false, error: "Database not configured." }, { status: 500 });
  } catch (error: any) {
    console.error("[Admin Inventory PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update inventory: " + (error?.message || "Internal error") },
      { status: 500 }
    );
  }
}
