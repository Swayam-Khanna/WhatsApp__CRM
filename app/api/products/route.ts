import { NextRequest, NextResponse } from "next/server.js";
import { isNeonDataProvider } from "../../../backend/lib/data-provider.ts";
import { db } from "../../../backend/db.ts";
import {
  farmerProducts,
  farmerProfiles,
  productInventory,
} from "../../../backend/schema/index.ts";
import { eq, desc, and } from "drizzle-orm";
import { allProducts as staticCatalog } from "../../../frontend/lib/mock/products.ts";
import { adminDb } from "../../../frontend/lib/firebase-admin.ts";
import { getAuthoritativeCrmProducts } from "../../../backend/lib/product-registry.ts";

export const dynamic = "force-dynamic";

/**
 * Public Products API Route
 * Dual mode: reads from Neon when DATA_PROVIDER=neon, otherwise Firestore.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug")?.toLowerCase().trim();
    const category = searchParams.get("category")?.toLowerCase().trim();
    const search = searchParams.get("search")?.toLowerCase().trim();

    if (isNeonDataProvider()) {
      let dbProducts: any[] = [];
      try {
        const rows = await db
          .select({
            product: farmerProducts,
            farmer: {
              id: farmerProfiles.id,
              fullName: farmerProfiles.fullName,
              farmName: farmerProfiles.farmName,
              slug: farmerProfiles.slug,
              village: farmerProfiles.village,
              state: farmerProfiles.state,
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

        // Map rows from DB
        dbProducts = rows.map(({ product, farmer, inventory }) => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price,
          compare_at_price: product.compareAtPrice,
          price_per_kg: product.pricePerKg,
          category: product.category,
          stock: product.stock,
          stock_grams: inventory?.stockGrams ?? product.stockGrams,
          low_stock_threshold_grams: inventory?.lowStockThresholdGrams ?? product.lowStockThresholdGrams,
          unit: product.unit,
          weight_grams: product.weightGrams,
          images: product.images || [],
          featured: product.featured,
          status: product.status || "published",
          hsn_code: product.hsnCode,
          gst_applicable: product.gstApplicable,
          gst_rate: product.gstRate,
          farmer_id: product.farmerId,
          farmer_profiles: farmer || null,
          inventory: inventory || null,
          _source: "neon",
        }));
      } catch (dbErr: any) {
        console.warn("[Products API] Remote database query unavailable, attempting fetch from market.prajnaa.in:", dbErr?.message);
        try {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 4000);
          const centralRes = await fetch("https://market.prajnaa.in/api/products", {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });
          clearTimeout(t);
          if (centralRes.ok) {
            const centralData = await centralRes.json();
            if (centralData && Array.isArray(centralData.products) && centralData.products.length > 0) {
              dbProducts = centralData.products;
            }
          }
        } catch (fetchErr: any) {
          console.warn("[Products API] Remote market.prajnaa.in fetch failed, using static catalog:", fetchErr?.message);
        }
      }

      // Combine with static catalog items that might not yet be in Neon
      const existingSlugs = new Set(dbProducts.map((p) => p.slug.toLowerCase()));
      const staticItems = staticCatalog
        .filter((sp) => !existingSlugs.has(sp.slug.toLowerCase()))
        .map((sp) => ({
          id: (sp as any).id || sp.slug,
          name: sp.name,
          slug: sp.slug,
          description: (sp as any).description || "",
          price: sp.price,
          compare_at_price: (sp as any).originalPrice || null,
          price_per_kg: sp.price,
          category: sp.category,
          stock: (sp as any).stock ?? 100,
          stock_grams: typeof (sp as any).weight_gm === "number" ? (sp as any).weight_gm : 500,
          low_stock_threshold_grams: 1000,
          unit: (sp as any).weight || "500g",
          weight_grams: typeof (sp as any).weight_gm === "number" ? (sp as any).weight_gm : 500,
          images: Array.isArray(sp.images) ? sp.images : [(sp as any).image].filter(Boolean),
          featured: Boolean((sp as any).featured),
          status: "published",
          hsn_code: (sp as any).hsnCode || null,
          gst_applicable: true,
          gst_rate: 5,
          farmer_id: null,
          farmer_profiles: null,
          inventory: null, // missing inventory row = unlimited
          _source: "static_catalog",
        }));

      let all = [...dbProducts, ...staticItems];

      // Merge authoritative CRM products
      try {
        const crmProds = await getAuthoritativeCrmProducts();
        const existingIds = new Set(all.map((p) => (p.id || "").toLowerCase()));
        const existingSlugsAll = new Set(all.map((p) => (p.slug || "").toLowerCase()));
        for (const cp of crmProds) {
          if (!existingIds.has((cp.id || "").toLowerCase()) && !existingSlugsAll.has((cp.slug || "").toLowerCase())) {
            all.push({
              id: cp.id,
              name: cp.name,
              slug: cp.slug,
              description: cp.description,
              price: cp.price,
              compare_at_price: cp.compareAtPrice,
              price_per_kg: cp.price,
              category: cp.category,
              stock: cp.unitsLeft,
              stock_grams: cp.unitsLeft * 500,
              low_stock_threshold_grams: 1000,
              unit: cp.weight || "500g",
              weight_grams: 500,
              images: [cp.image],
              featured: Boolean(cp.featured),
              status: "published",
              hsn_code: null,
              gst_applicable: true,
              gst_rate: 5,
              farmer_id: null,
              farmer_profiles: null,
              inventory: null,
              _source: "crm_registry",
            });
          }
        }
      } catch {}

      // Apply query filters
      if (slug) {
        all = all.filter((p) => p.slug.toLowerCase() === slug || p.id.toLowerCase() === slug);
      }
      if (category && category !== "all") {
        all = all.filter((p) => p.category?.toLowerCase() === category);
      }
      if (search) {
        all = all.filter(
          (p) =>
            p.name.toLowerCase().includes(search) ||
            p.slug.toLowerCase().includes(search) ||
            p.category?.toLowerCase().includes(search)
        );
      }

      return NextResponse.json({
        success: true,
        count: all.length,
        products: all,
      });
    }

    // PATH 2: FIRESTORE FALLBACK
    if (!adminDb) {
      return NextResponse.json({ success: true, count: staticCatalog.length, products: staticCatalog });
    }

    const snap = await adminDb.collection("farmer_products").get();
    let items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
    items = items.filter((p: any) => !p.status || p.status === "published");
    if (slug) {
      items = items.filter((p: any) => p.slug === slug || p.id === slug);
    }
    if (category && category !== "all") {
      items = items.filter((p: any) => p.category?.toLowerCase() === category);
    }
    if (search) {
      items = items.filter(
        (p: any) =>
          p.name?.toLowerCase().includes(search) ||
          p.slug?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      count: items.length,
      products: items,
      _source: "firestore",
    });
  } catch (err: any) {
    console.error("[Products API] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch products", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
