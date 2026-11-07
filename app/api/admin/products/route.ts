import { NextRequest, NextResponse } from "next/server.js";
import { requireAdminAuth } from "../../../../frontend/lib/api/admin-auth.server.ts";
import { isNeonDataProvider } from "../../../../backend/lib/data-provider.ts";
import { db } from "../../../../backend/db.ts";
import {
  farmerProducts,
  farmerProfiles,
  productInventory,
  profiles,
} from "../../../../backend/schema/index.ts";
import { eq, desc } from "drizzle-orm";
import { adminDb } from "../../../../frontend/lib/firebase-admin.ts";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/products
 * Returns product catalog with inventory and farmer information.
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
          product: farmerProducts,
          farmer: {
            id: farmerProfiles.id,
            fullName: farmerProfiles.fullName,
            farmName: farmerProfiles.farmName,
            slug: farmerProfiles.slug,
          },
          inventory: {
            id: productInventory.id,
            stockGrams: productInventory.stockGrams,
            quantity: productInventory.quantity,
            lowStockThresholdGrams: productInventory.lowStockThresholdGrams,
            soldCount: productInventory.soldCount,
            pledgedCount: productInventory.pledgedCount,
            preorderEnabled: productInventory.preorderEnabled,
          },
        })
        .from(farmerProducts)
        .leftJoin(farmerProfiles, eq(farmerProducts.farmerId, farmerProfiles.id))
        .leftJoin(productInventory, eq(farmerProducts.id, productInventory.productId))
        .orderBy(desc(farmerProducts.createdAt));

      const formattedProducts = rows.map(({ product, farmer, inventory }) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        compare_at_price: product.compareAtPrice,
        price_per_kg: product.pricePerKg,
        category: product.category,
        stock: product.stock,
        stock_grams: product.stockGrams,
        low_stock_threshold_grams: product.lowStockThresholdGrams,
        unit: product.unit,
        weight_grams: product.weightGrams,
        images: product.images || [],
        featured: product.featured,
        status: product.status,
        hsn_code: product.hsnCode,
        gst_applicable: product.gstApplicable,
        gst_rate: product.gstRate,
        farmer_id: product.farmerId,
        user_id: product.userId,
        farmer: farmer || null,
        inventory: inventory || null,
        created_at: product.createdAt instanceof Date ? product.createdAt.toISOString() : String(product.createdAt),
        updated_at: product.updatedAt instanceof Date ? product.updatedAt.toISOString() : String(product.updatedAt),
        _source: "neon",
      }));

      return NextResponse.json({
        success: true,
        count: formattedProducts.length,
        products: formattedProducts,
      });
    }

    // ------------------------------------------
    // PATH 2: FIRESTORE DATA PROVIDER (Default)
    // ------------------------------------------
    if (!adminDb) {
      return NextResponse.json({ success: true, count: 0, products: [] });
    }

    const snap = await adminDb.collection("farmer_products").get();
    const firestoreProducts = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      _source: "firestore",
    }));

    return NextResponse.json({
      success: true,
      count: firestoreProducts.length,
      products: firestoreProducts,
    });
  } catch (error: any) {
    console.error("[Admin Products GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products: " + (error?.message || "Internal error") },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/products
 * Creates a new product and initializes inventory.
 */
export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const {
      name,
      farmerId,
      userId,
      category,
      description,
      price,
      stock,
      stockGrams,
      unit,
      images,
      hsnCode,
      gstApplicable = true,
      gstRate = 5,
      isPreorder = false,
      status = "published",
    } = body;

    if (!name || !farmerId) {
      return NextResponse.json(
        { success: false, error: "Product name and farmer ID are required." },
        { status: 400 }
      );
    }

    const resolvedUserId = userId || "admin_system";
    const productId = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${productId.slice(-5)}`;
    const numPrice = Number(price || 0);
    const numStockGrams = Number(stockGrams || (Number(stock || 0) * 1000));
    const numStock = Math.floor(numStockGrams / 1000);

    // ------------------------------------------
    // PATH 1: NEON DATA PROVIDER (PostgreSQL)
    // ------------------------------------------
    if (isNeonDataProvider()) {
      return await db.transaction(async (tx) => {
        // Ensure profile exists for user foreign key
        await tx
          .insert(profiles)
          .values({
            id: resolvedUserId,
            fullName: "Product Admin",
          })
          .onConflictDoNothing();

        // Insert farmer product
        const [newProduct] = await tx
          .insert(farmerProducts)
          .values({
            id: productId,
            userId: resolvedUserId,
            farmerId,
            name: name.trim(),
            slug,
            description: description || null,
            price: numPrice,
            stock: numStock,
            stockGrams: numStockGrams,
            category: category || "general",
            unit: unit || "500g",
            images: Array.isArray(images) ? images : [],
            status: status as any,
            hsnCode: hsnCode || null,
            gstApplicable: Boolean(gstApplicable),
            gstRate: Number(gstRate),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // Initialize inventory
        await tx.insert(productInventory).values({
          id: `inv_${productId}`,
          productId,
          variantName: "standard",
          stockGrams: numStockGrams,
          lowStockThresholdGrams: 1000,
          quantity: numStock,
          soldCount: 0,
          preorderEnabled: Boolean(isPreorder),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return NextResponse.json({
          success: true,
          product: {
            ...newProduct,
            _source: "neon",
          },
        });
      });
    }

    // ------------------------------------------
    // PATH 2: FIRESTORE DATA PROVIDER (Default)
    // ------------------------------------------
    if (adminDb) {
      const firestorePayload = {
        name: name.trim(),
        farmer_id: farmerId,
        user_id: resolvedUserId,
        slug,
        category: category || "general",
        description: description || null,
        price: numPrice,
        stock: numStock,
        stock_grams: numStockGrams,
        unit: unit || "500g",
        images: Array.isArray(images) ? images : [],
        status: status || "published",
        hsn_code: hsnCode || null,
        gst_applicable: Boolean(gstApplicable),
        gst_rate: Number(gstRate),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await adminDb.collection("farmer_products").doc(productId).set(firestorePayload);
      return NextResponse.json({
        success: true,
        product: { id: productId, ...firestorePayload, _source: "firestore" },
      });
    }

    return NextResponse.json({ success: false, error: "Database not configured." }, { status: 500 });
  } catch (error: any) {
    console.error("[Admin Products POST] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create product: " + (error?.message || "Internal error") },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/products
 * Updates product metadata, status, or stock.
 */
export async function PATCH(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { id, status, name, price, stockGrams } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Product ID is required." }, { status: 400 });
    }

    // ------------------------------------------
    // PATH 1: NEON DATA PROVIDER (PostgreSQL)
    // ------------------------------------------
    if (isNeonDataProvider()) {
      const updateData: any = { updatedAt: new Date() };
      if (status !== undefined) updateData.status = status;
      if (name !== undefined) updateData.name = name;
      if (price !== undefined) updateData.price = Number(price);
      if (stockGrams !== undefined) {
        updateData.stockGrams = Number(stockGrams);
        updateData.stock = Math.floor(Number(stockGrams) / 1000);
      }

      const [updated] = await db
        .update(farmerProducts)
        .set(updateData)
        .where(eq(farmerProducts.id, id))
        .returning();

      if (stockGrams !== undefined) {
        await db
          .update(productInventory)
          .set({
            stockGrams: Number(stockGrams),
            quantity: Math.floor(Number(stockGrams) / 1000),
            updatedAt: new Date(),
          })
          .where(eq(productInventory.productId, id));
      }

      return NextResponse.json({ success: true, product: updated, _source: "neon" });
    }

    // ------------------------------------------
    // PATH 2: FIRESTORE DATA PROVIDER (Default)
    // ------------------------------------------
    if (adminDb) {
      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (status !== undefined) updatePayload.status = status;
      if (name !== undefined) updatePayload.name = name;
      if (price !== undefined) updatePayload.price = Number(price);
      if (stockGrams !== undefined) {
        updatePayload.stock_grams = Number(stockGrams);
        updatePayload.stock = Math.floor(Number(stockGrams) / 1000);
      }

      await adminDb.collection("farmer_products").doc(id).update(updatePayload);
      return NextResponse.json({ success: true, id, ...updatePayload, _source: "firestore" });
    }

    return NextResponse.json({ success: false, error: "Database not configured." }, { status: 500 });
  } catch (error: any) {
    console.error("[Admin Products PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update product: " + (error?.message || "Internal error") },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/products
 * Deletes a product and its inventory row.
 */
export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Product ID is required." }, { status: 400 });
    }

    // ------------------------------------------
    // PATH 1: NEON DATA PROVIDER (PostgreSQL)
    // ------------------------------------------
    if (isNeonDataProvider()) {
      await db.delete(productInventory).where(eq(productInventory.productId, id));
      await db.delete(farmerProducts).where(eq(farmerProducts.id, id));
      return NextResponse.json({ success: true, deletedId: id, _source: "neon" });
    }

    // ------------------------------------------
    // PATH 2: FIRESTORE DATA PROVIDER (Default)
    // ------------------------------------------
    if (adminDb) {
      await adminDb.collection("farmer_products").doc(id).delete();
      return NextResponse.json({ success: true, deletedId: id, _source: "firestore" });
    }

    return NextResponse.json({ success: false, error: "Database not configured." }, { status: 500 });
  } catch (error: any) {
    console.error("[Admin Products DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete product: " + (error?.message || "Internal error") },
      { status: 500 }
    );
  }
}
