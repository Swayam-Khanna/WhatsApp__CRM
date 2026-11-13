import { NextRequest, NextResponse } from "next/server.js";
import { db } from "../../../../backend/db.ts";
import { farmerProducts, productInventory, profiles } from "../../../../backend/schema/index.ts";
import { eq, or, desc } from "drizzle-orm";
import { getDatabase } from "../../../../lib/mongodb.ts";
import { allProducts as staticCatalog } from "../../../../frontend/lib/mock/products.ts";

export const dynamic = "force-dynamic";

// Global in-memory cache for live CRM products across server requests
declare global {
  // eslint-disable-next-line no-var
  var __crmLiveProducts: Map<string, any> | undefined;
  // eslint-disable-next-line no-var
  var __crmDeletedProductIds: Set<string> | undefined;
}

if (!globalThis.__crmLiveProducts) {
  globalThis.__crmLiveProducts = new Map();
}

if (!globalThis.__crmDeletedProductIds) {
  globalThis.__crmDeletedProductIds = new Set();
}

/**
 * Normalizes a product name into a clean URL-friendly slug
 */
function createProductSlug(name: string, idSuffix: string = ""): string {
  const base = (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return idSuffix ? `${base}-${idSuffix}` : (base || "himalayan-produce");
}

/**
 * GET /api/crm/products
 * Returns all authoritative products combining PostgreSQL, MongoDB, and CRM memory updates.
 */
export async function GET(req: NextRequest) {
  try {
    const productsMap = new Map<string, any>();

    // 1. Load base static catalog first
    staticCatalog.forEach((sp: any) => {
      const id = sp.id || sp.slug;
      productsMap.set(id, {
        id,
        name: sp.name,
        slug: sp.slug,
        price: Math.round(sp.price || 999),
        stock: sp.stock === 0 ? "Out of Stock" : "In Stock",
        unitsLeft: typeof sp.stock === "number" ? sp.stock : 50,
        image: sp.image || (Array.isArray(sp.images) && sp.images[0]) || "/assets/cat-honey.jpg",
        category: sp.category || "Dry Fruits",
        origin: sp.origin || "Himalayan Farms",
        sku: `PM-${sp.slug.substring(0, 3).toUpperCase()}-500`,
        weight: sp.weight || "500g",
      });
    });

    // 2. Load PostgreSQL products (farmerProducts & productInventory)
    try {
      const rows = await db
        .select({
          product: farmerProducts,
          inventory: productInventory,
        })
        .from(farmerProducts)
        .leftJoin(productInventory, eq(farmerProducts.id, productInventory.productId))
        .orderBy(desc(farmerProducts.createdAt));

      if (rows && rows.length > 0) {
        rows.forEach(({ product, inventory }) => {
          if (!product) return;
          const currentStock = inventory?.quantity ?? product.stock ?? 10;
          let stockStatus = "In Stock";
          if (currentStock <= 0) stockStatus = "Out of Stock";
          else if (currentStock < 5) stockStatus = "Low Stock";

          const pItem = {
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: Math.round(product.price || 0),
            stock: stockStatus,
            unitsLeft: currentStock,
            image: Array.isArray(product.images) && product.images[0] ? product.images[0] : "/assets/cat-honey.jpg",
            category: product.category || "Mountain Produce",
            origin: "High Altitude Farm, Himachal Pradesh",
            sku: `PM-${product.slug.substring(0, 3).toUpperCase()}-500`,
            weight: product.unit || "500g",
          };
          productsMap.set(product.id, pItem);
          if (product.slug) productsMap.set(product.slug, pItem);
        });
      }
    } catch (pgErr) {
      // In development fallback, remote PostgreSQL might be skipped
    }

    // 3. Load MongoDB crm_products
    try {
      const mongo = await getDatabase();
      if (mongo) {
        const mongoDocs = await mongo.collection("crm_products").find({}).toArray();
        if (mongoDocs && mongoDocs.length > 0) {
          mongoDocs.forEach((doc: any) => {
            const id = doc.id || doc._id?.toString();
            productsMap.set(id, {
              id,
              name: doc.name,
              slug: doc.slug || createProductSlug(doc.name),
              price: Number(doc.price) || 0,
              stock: doc.stock || "In Stock",
              unitsLeft: typeof doc.unitsLeft === "number" ? doc.unitsLeft : 50,
              image: doc.image || "/assets/cat-honey.jpg",
              category: doc.category || "Dry Fruits",
              origin: doc.origin || "Himalayan Farms",
              sku: doc.sku || `PM-${id.substring(0, 4).toUpperCase()}`,
              weight: doc.weight || "500g",
            });
          });
        }
      }
    } catch {}

    // 4. Overlay in-memory live updates from CRM actions
    if (globalThis.__crmLiveProducts) {
      for (const [id, prod] of globalThis.__crmLiveProducts.entries()) {
        productsMap.set(id, prod);
        if (prod.slug) productsMap.set(prod.slug, prod);
      }
    }

    // 5. Filter out deleted products
    const deletedSet = globalThis.__crmDeletedProductIds || new Set();
    const finalProducts = Array.from(new Set(productsMap.values())).filter(
      (p) => !deletedSet.has(p.id) && !deletedSet.has(p.slug)
    );

    return NextResponse.json({
      success: true,
      count: finalProducts.length,
      products: finalProducts,
    });
  } catch (err: any) {
    console.error("[CRM Products GET Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch CRM products", products: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/products
 * Adds a new product or updates an existing product across live storage.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, price, stock, image, category, unitsLeft, origin, sku, weight } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Product name is required" }, { status: 400 });
    }

    const productId = id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const slug = createProductSlug(name);
    const numPrice = Number(price) || 0;
    const numUnits = typeof unitsLeft === "number" ? unitsLeft : stock === "Out of Stock" ? 0 : 50;

    const productRecord = {
      id: productId,
      name: name.trim(),
      slug,
      price: numPrice,
      stock: stock || (numUnits <= 0 ? "Out of Stock" : "In Stock"),
      unitsLeft: numUnits,
      image: image || "/assets/cat-honey.jpg",
      category: category || "Produce",
      origin: origin || "High Altitude Farm, Himachal Pradesh",
      sku: sku || `PM-${Math.floor(1000 + Math.random() * 9000)}`,
      weight: weight || "500g",
      updatedAt: new Date().toISOString(),
    };

    // 1. Store in active in-memory cache
    if (!globalThis.__crmLiveProducts) globalThis.__crmLiveProducts = new Map();
    globalThis.__crmLiveProducts.set(productId, productRecord);
    globalThis.__crmLiveProducts.set(slug, productRecord);

    // Remove from deleted set if was previously deleted
    if (globalThis.__crmDeletedProductIds) {
      globalThis.__crmDeletedProductIds.delete(productId);
      globalThis.__crmDeletedProductIds.delete(slug);
    }

    // 2. Persist to MongoDB
    try {
      const mongo = await getDatabase();
      if (mongo) {
        await mongo.collection("crm_products").updateOne(
          { $or: [{ id: productId }, { slug }] },
          { $set: productRecord },
          { upsert: true }
        );
      }
    } catch (mErr) {
      console.warn("[MongoDB] CRM product persist note:", mErr);
    }

    // 3. Persist to PostgreSQL if available
    try {
      await db.transaction(async (tx) => {
        await tx
          .insert(profiles)
          .values({ id: "admin_system", fullName: "CRM Admin" })
          .onConflictDoNothing();

        await tx
          .insert(farmerProducts)
          .values({
            id: productId,
            userId: "admin_system",
            name: name.trim(),
            slug,
            description: `${name} harvested from ${origin || "Himalayan farms"}.`,
            price: numPrice,
            stock: numUnits,
            stockGrams: numUnits * 500,
            category: category || "Produce",
            unit: weight || "500g",
            images: [image || "/assets/cat-honey.jpg"],
            status: "published",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: farmerProducts.id,
            set: {
              name: name.trim(),
              price: numPrice,
              stock: numUnits,
              stockGrams: numUnits * 500,
              category: category || "Produce",
              unit: weight || "500g",
              images: [image || "/assets/cat-honey.jpg"],
              status: "published",
              updatedAt: new Date(),
            },
          });

        await tx
          .insert(productInventory)
          .values({
            id: `inv_${productId}`,
            productId,
            variantName: "standard",
            stockGrams: numUnits * 500,
            quantity: numUnits,
            soldCount: 0,
            preorderEnabled: stock === "Pre-Order",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: productInventory.productId,
            set: {
              stockGrams: numUnits * 500,
              quantity: numUnits,
              preorderEnabled: stock === "Pre-Order",
              updatedAt: new Date(),
            },
          });
      });
    } catch (pgErr) {
      console.warn("[PostgreSQL] farmerProducts upsert note:", pgErr);
    }

    return NextResponse.json({
      success: true,
      product: productRecord,
      message: `Product "${productRecord.name}" saved and live across catalogue!`,
    });
  } catch (err: any) {
    console.error("[CRM Products POST Error]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to save product" }, { status: 500 });
  }
}

/**
 * PATCH /api/crm/products
 * Fast update for stock, price, or status changes from the CRM products table.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, stock, unitsLeft, price, name, image, category } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Product id is required" }, { status: 400 });
    }

    if (!globalThis.__crmLiveProducts) globalThis.__crmLiveProducts = new Map();
    const existing = globalThis.__crmLiveProducts.get(id) || {};

    const updated = {
      ...existing,
      id,
      name: name ?? existing.name,
      price: price !== undefined ? Number(price) : existing.price,
      stock: stock ?? existing.stock,
      unitsLeft: unitsLeft !== undefined ? Number(unitsLeft) : existing.unitsLeft,
      image: image ?? existing.image,
      category: category ?? existing.category,
      updatedAt: new Date().toISOString(),
    };

    globalThis.__crmLiveProducts.set(id, updated);
    if (updated.slug) globalThis.__crmLiveProducts.set(updated.slug, updated);

    // Persist to MongoDB
    try {
      const mongo = await getDatabase();
      if (mongo) {
        await mongo.collection("crm_products").updateOne({ id }, { $set: updated }, { upsert: true });
      }
    } catch {}

    // Persist to PostgreSQL
    try {
      if (price !== undefined || unitsLeft !== undefined || stock !== undefined) {
        const numUnits = unitsLeft !== undefined ? Number(unitsLeft) : stock === "Out of Stock" ? 0 : 50;
        await db
          .update(farmerProducts)
          .set({
            ...(price !== undefined ? { price: Number(price) } : {}),
            stock: numUnits,
            stockGrams: numUnits * 500,
            updatedAt: new Date(),
          })
          .where(or(eq(farmerProducts.id, id), eq(farmerProducts.slug, id)));
      }
    } catch {}

    return NextResponse.json({ success: true, product: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/products
 * Deletes a product from live catalog across all feeds.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: "Product id is required" }, { status: 400 });
    }

    if (!globalThis.__crmLiveProducts) globalThis.__crmLiveProducts = new Map();
    const existing = globalThis.__crmLiveProducts.get(id);
    globalThis.__crmLiveProducts.delete(id);
    if (existing?.slug) globalThis.__crmLiveProducts.delete(existing.slug);

    if (!globalThis.__crmDeletedProductIds) globalThis.__crmDeletedProductIds = new Set();
    globalThis.__crmDeletedProductIds.add(id);
    if (existing?.slug) globalThis.__crmDeletedProductIds.add(existing.slug);

    // Remove from MongoDB
    try {
      const mongo = await getDatabase();
      if (mongo) {
        await mongo.collection("crm_products").deleteOne({ id });
        await mongo.collection("crm_deleted_products").insertOne({ id, deletedAt: new Date() });
      }
    } catch {}

    // Soft delete/archive in PostgreSQL
    try {
      await db
        .update(farmerProducts)
        .set({ status: "archived", updatedAt: new Date() })
        .where(or(eq(farmerProducts.id, id), eq(farmerProducts.slug, id)));
    } catch {}

    return NextResponse.json({ success: true, message: "Product removed from live catalog successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
