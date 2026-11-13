import { NextRequest, NextResponse } from "next/server.js";
import { getLiveProductCatalogue, getAppBaseUrl } from "../../../backend/lib/smart-assistant.server.ts";

export const dynamic = "force-dynamic";

/**
 * GET /api/catalogue
 * Public API returning real-time authoritative product catalogue from CRM single-source of truth.
 * No authentication required.
 */
export async function GET(req: NextRequest) {
  try {
    const host = req.headers.get("host") || undefined;
    const baseUrl = getAppBaseUrl(host);
    const catalogue = await getLiveProductCatalogue(baseUrl);

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug")?.trim();
    const category = searchParams.get("category")?.trim();
    const search = searchParams.get("search")?.toLowerCase().trim();
    const availability = searchParams.get("availability")?.toLowerCase().trim();

    let filtered = catalogue;

    if (slug) {
      filtered = filtered.filter((p) => p.slug.toLowerCase() === slug.toLowerCase() || p.id.toLowerCase() === slug.toLowerCase());
    }

    if (category && category.toLowerCase() !== "all") {
      filtered = filtered.filter((p) => p.category.toLowerCase().includes(category.toLowerCase()));
    }

    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search) ||
          p.category.toLowerCase().includes(search)
      );
    }

    if (availability && availability !== "all") {
      if (availability === "in_stock" || availability === "in stock") {
        filtered = filtered.filter((p) => p.stockStatus === "in_stock");
      } else if (availability === "few_left" || availability === "low stock") {
        filtered = filtered.filter((p) => p.stockStatus === "few_left");
      } else if (availability === "pre_order" || availability === "pre-order") {
        filtered = filtered.filter((p) => p.stockStatus === "pre_order");
      } else if (availability === "out_of_stock" || availability === "out of stock") {
        filtered = filtered.filter((p) => p.stockStatus === "out_of_stock");
      }
    }

    const categories = Array.from(new Set(catalogue.map((p) => p.category).filter(Boolean)));

    return NextResponse.json({
      success: true,
      count: filtered.length,
      totalCount: catalogue.length,
      categories: ["All", ...categories],
      products: filtered,
      generatedAt: new Date().toISOString(),
      storePhone: process.env.ADMIN_WHATSAPP_NUMBER || "+91 80912 65690",
    });
  } catch (error: any) {
    console.error("[API Catalogue Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to load live catalogue",
        products: [],
      },
      { status: 500 }
    );
  }
}
