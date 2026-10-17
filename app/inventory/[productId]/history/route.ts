import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/api/admin-auth.server";
import { db } from "../../../../backend/db.ts";
import { stockHistory, farmerProducts } from "../../../../backend/schema/index.ts";
import { eq, or, desc, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  // Admin authentication check
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
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
  const offset = (page - 1) * limit;

  try {
    // Find true product ID if slug or UUID
    const [prod] = await db
      .select({ id: farmerProducts.id })
      .from(farmerProducts)
      .where(or(eq(farmerProducts.id, cleanProductId), eq(farmerProducts.slug, cleanProductId)))
      .limit(1);

    const targetId = prod?.id || cleanProductId;

    const rows = await db
      .select()
      .from(stockHistory)
      .where(eq(stockHistory.productId, targetId))
      .orderBy(desc(stockHistory.createdAt))
      .limit(limit)
      .offset(offset);

    const [countRow] = await db
      .select({ count: count() })
      .from(stockHistory)
      .where(eq(stockHistory.productId, targetId));

    return NextResponse.json({
      success: true,
      product_id: targetId,
      total: Number(countRow?.count || rows.length),
      page,
      limit,
      movements: rows.map((r) => ({
        id: r.id,
        product_id: r.productId,
        type: r.type,
        grams: r.grams,
        stock_before: r.stockBefore,
        stock_after: r.stockAfter,
        change_amount: r.changeAmount,
        reason: r.reason,
        note: r.note,
        admin_id: r.adminId,
        created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      })),
      source: "neon",
    });
  } catch (err: any) {
    console.error("[Inventory History API Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
