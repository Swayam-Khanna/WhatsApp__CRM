import { NextRequest, NextResponse } from "next/server.js";
import {
  getAuthoritativeCrmProducts,
  saveProductToRegistry,
  updateProductStockInRegistry,
  deleteProductFromRegistry,
} from "../../../../backend/lib/product-registry.ts";
import { getAppBaseUrl } from "../../../../backend/lib/smart-assistant.server.ts";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/products
 * Returns all authoritative products combining PostgreSQL, MongoDB, and CRM memory updates.
 */
export async function GET(req: NextRequest) {
  try {
    const host = req.headers.get("host") || undefined;
    const baseUrl = getAppBaseUrl(host);
    const products = await getAuthoritativeCrmProducts(baseUrl);

    return NextResponse.json({
      success: true,
      count: products.length,
      products,
      generatedAt: new Date().toISOString(),
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
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, error: "Product name is required" }, { status: 400 });
    }

    const saved = await saveProductToRegistry(body);

    return NextResponse.json({
      success: true,
      product: saved,
      message: `Product "${saved.name}" saved and live across catalogue!`,
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

    const updated = await updateProductStockInRegistry(id, {
      stock,
      unitsLeft,
      price,
      name,
      image,
      category,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: updated });
  } catch (err: any) {
    console.error("[CRM Products PATCH Error]:", err);
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

    await deleteProductFromRegistry(id);

    return NextResponse.json({
      success: true,
      message: "Product removed from live catalog successfully",
    });
  } catch (err: any) {
    console.error("[CRM Products DELETE Error]:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
