import { NextRequest, NextResponse } from "next/server.js";
import { isNeonDataProvider } from "../../../backend/lib/data-provider.ts";
import { db } from "../../../backend/db.ts";
import { productInventory, farmerProducts } from "../../../backend/schema/index.ts";
import { eq, desc } from "drizzle-orm";
import { adminDb } from "../../../frontend/lib/firebase-admin.ts";

export const dynamic = "force-dynamic";

/**
 * Public Inventory API Route
 * Dual mode: reads from Neon when DATA_PROVIDER=neon, otherwise Firestore.
 */
export async function GET(req: NextRequest) {
  try {
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
        })
        .from(productInventory)
        .leftJoin(farmerProducts, eq(productInventory.productId, farmerProducts.id))
        .orderBy(desc(productInventory.updatedAt));

      const items = rows.map(({ inventory, product }) => ({
        id: inventory.id,
        product_id: inventory.productId,
        product_slug: product?.slug || inventory.productId,
        product_name: product?.name || "Product",
        variant_id: inventory.variantId || "default",
        variant_name: inventory.variantName || "Standard Pack",
        stock_grams: inventory.stockGrams,
        quantity: inventory.quantity,
        low_stock_threshold_grams: inventory.lowStockThresholdGrams,
        sold_count: inventory.soldCount,
        pledged_count: inventory.pledgedCount,
        low_stock_threshold: Math.floor(inventory.lowStockThresholdGrams / 1000),
        preorder_enabled: inventory.preorderEnabled,
        created_at: inventory.createdAt instanceof Date ? inventory.createdAt.toISOString() : String(inventory.createdAt),
        updated_at: inventory.updatedAt instanceof Date ? inventory.updatedAt.toISOString() : String(inventory.updatedAt),
        _source: "neon",
      }));

      return NextResponse.json({
        success: true,
        count: items.length,
        data: items,
      });
    }

    // PATH 2: FIRESTORE FALLBACK
    if (!adminDb) {
      return NextResponse.json({ success: true, count: 0, data: [] });
    }

    const snap = await adminDb.collection("product_inventory").get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({
      success: true,
      count: items.length,
      data: items,
      _source: "firestore",
    });
  } catch (err: any) {
    console.error("[Inventory API] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch inventory", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
