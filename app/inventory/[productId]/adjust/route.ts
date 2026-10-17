import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/api/admin-auth.server";
import { isNeonDataProvider } from "../../../../backend/lib/data-provider.ts";
import { db } from "../../../../backend/db.ts";
import { farmerProducts, productInventory, stockHistory } from "../../../../backend/schema/index.ts";
import { eq, or, sql } from "drizzle-orm";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  // 1. Admin Authorization Guard
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: auth.error || "Forbidden. Admin privileges required." },
      { status: auth.statusCode || 401 }
    );
  }

  const { productId } = await params;
  if (!productId || productId.trim() === "") {
    return NextResponse.json(
      { success: false, error: "Product ID is required." },
      { status: 400 }
    );
  }

  const cleanProductId = decodeURIComponent(productId).trim();

  try {
    const body = await req.json();
    const { mode, grams, reason, note } = body;

    // 2. Strict Input Validations
    if (!mode || !["add", "remove", "set"].includes(mode)) {
      return NextResponse.json(
        { success: false, error: "Invalid mode. Must be 'add', 'remove', or 'set'." },
        { status: 400 }
      );
    }

    if (typeof grams !== "number" || !Number.isInteger(grams) || isNaN(grams) || grams < 0) {
      return NextResponse.json(
        { success: false, error: "Grams must be a non-negative integer." },
        { status: 400 }
      );
    }

    if ((mode === "add" || mode === "remove") && grams <= 0) {
      return NextResponse.json(
        { success: false, error: `Grams to ${mode} must be greater than zero.` },
        { status: 400 }
      );
    }

    const cleanReason =
      (reason && typeof reason === "string" ? reason.trim() : "") ||
      (mode === "add"
        ? "Warehouse replenishment"
        : mode === "remove"
        ? "Damaged / expired"
        : "Physical stock count");
    const cleanNote = note && typeof note === "string" ? note.trim() : null;
    const adminUser = auth.user?.email || auth.user?.uid || "admin";

    // Atomic execution on Neon PostgreSQL via Drizzle
    return await db.transaction(async (tx: any) => {
      // 1. Resolve product ID from slug or ID
      const [product] = await tx
        .select({ id: farmerProducts.id, slug: farmerProducts.slug, name: farmerProducts.name })
        .from(farmerProducts)
        .where(or(eq(farmerProducts.id, cleanProductId), eq(farmerProducts.slug, cleanProductId)))
        .limit(1);

      const targetProductId = product?.id || cleanProductId;

      // 2. Lock product_inventory (single source of truth for stock)
      const [inv] = await tx
        .select()
        .from(productInventory)
        .where(eq(productInventory.productId, targetProductId))
        .for("update")
        .limit(1);

      if (!inv && !product) {
        return NextResponse.json(
          { success: false, error: `Product not found: "${cleanProductId}"` },
          { status: 404 }
        );
      }

      const stockBefore = inv ? inv.stockGrams : 0;
      let stockAfter = stockBefore;
      let delta = grams;

      if (mode === "add") {
        stockAfter = stockBefore + grams;
      } else if (mode === "remove") {
        if (stockBefore < grams) {
          return NextResponse.json(
            {
              success: false,
              error: `Cannot remove ${grams}g from available stock of ${stockBefore}g.`,
              availableGrams: stockBefore,
            },
            { status: 400 }
          );
        }
        stockAfter = stockBefore - grams;
        delta = -grams;
      } else if (mode === "set") {
        delta = grams - stockBefore;
        stockAfter = grams;
      }

      // 3. Update ONLY product_inventory
      if (inv) {
        await tx
          .update(productInventory)
          .set({
            stockGrams: stockAfter,
            quantity: Math.floor(stockAfter / 1000),
            updatedAt: new Date(),
            updatedBy: adminUser,
          })
          .where(eq(productInventory.productId, targetProductId));
      } else {
        await tx.insert(productInventory).values({
          productId: targetProductId,
          stockGrams: stockAfter,
          quantity: Math.floor(stockAfter / 1000),
          updatedBy: adminUser,
        });
      }

      // Insert audit log in stock_history
      await tx.insert(stockHistory).values({
        id: `sh_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        productId: product?.id || targetProductId,
        type: mode,
        grams: Math.abs(delta),
        stockBefore,
        stockAfter,
        changeAmount: delta,
        reason: cleanReason,
        note: cleanNote,
        adminId: adminUser,
        createdAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        product_id: product?.id || targetProductId,
        slug: product?.slug || cleanProductId,
        product_name: product?.name || cleanProductId,
        stock_before: stockBefore,
        stock_after: stockAfter,
        delta,
        mode,
        unit: "grams",
        storage: "neon",
      });
    });
  } catch (err: any) {
    console.error("[Adjust API Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
