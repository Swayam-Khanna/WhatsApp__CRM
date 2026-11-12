import { NextRequest, NextResponse } from "next/server.js";
import { getLiveProductCatalogue, getAppBaseUrl } from "../../../backend/lib/smart-assistant.server.ts";

export const dynamic = "force-dynamic";

/**
 * GET /api/catalogue
 * Public API returning real-time authoritative product catalogue from PostgreSQL/CRM database.
 * No authentication required.
 */
export async function GET(req: NextRequest) {
  try {
    const host = req.headers.get("host") || undefined;
    const baseUrl = getAppBaseUrl(host);
    const catalogue = await getLiveProductCatalogue(baseUrl);

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const category = searchParams.get("category");

    let filtered = catalogue;
    if (slug) {
      filtered = catalogue.filter((p) => p.slug === slug || p.id === slug);
    } else if (category && category.toLowerCase() !== "all") {
      filtered = catalogue.filter((p) => p.category.toLowerCase().includes(category.toLowerCase()));
    }

    return NextResponse.json({
      success: true,
      count: filtered.length,
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
