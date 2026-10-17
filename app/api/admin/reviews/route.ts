import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));

    // Fetch product reviews from Supabase with user profile details
    let rawData: any[] | null = null;
    let query = supabase
      .from("product_reviews")
      .select("*, profile:profiles(full_name, email, city, state)");

    if (status && status !== "all") {
      try {
        query = query.eq("status", status);
      } catch (e) {}
    }

    const { data, error } = await query;
    if (error) {
      // Fallback query without status filter
      const { data: fallbackData } = await supabase
        .from("product_reviews")
        .select("*, profile:profiles(full_name, email, city, state)");
      rawData = fallbackData || [];
    } else {
      rawData = data || [];
    }

    let items = (rawData || []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      customer_name: r.profile?.full_name || "Verified Customer",
      customer_email: r.profile?.email || null,
      customer_location:
        r.profile?.city && r.profile?.state
          ? `${r.profile.city}, ${r.profile.state}`
          : r.profile?.city || r.profile?.state || "India",
      product_slug: r.product_slug,
      order_id: r.order_id || null,
      rating: r.rating || 5,
      title: r.title || null,
      body: r.body || "",
      images: r.images || [],
      status: r.status || (r.verified ? "approved" : "pending"),
      verified: !!r.verified,
      admin_reply_text: r.admin_reply_text || null,
      admin_reply_at: r.admin_reply_at || null,
      admin_reply_by: r.admin_reply_by || null,
      moderated_at: r.moderated_at || null,
      moderated_by: r.moderated_by || null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    // Filter by search query across customer name, product_slug, title, body, or order_id
    if (search) {
      items = items.filter((r: any) => {
        return (
          r.customer_name.toLowerCase().includes(search) ||
          (r.customer_email && r.customer_email.toLowerCase().includes(search)) ||
          r.product_slug.toLowerCase().includes(search) ||
          (r.title && r.title.toLowerCase().includes(search)) ||
          r.body.toLowerCase().includes(search) ||
          (r.order_id && r.order_id.toLowerCase().includes(search))
        );
      });
    }

    // Sort order logic:
    // Default sorting: pending reviews first (oldest first), then by submission date (newest first)
    items.sort((a: any, b: any) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;

      if (a.status === "pending" && b.status === "pending") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const filteredTotal = items.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(filteredTotal / limit) || 1;

    return NextResponse.json(
      {
        success: true,
        data: paginatedItems,
        pagination: {
          page,
          limit,
          total: filteredTotal,
          totalPages,
        },
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
    );
  } catch (err: any) {
    console.error("[API Admin Reviews GET] Server Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch reviews" }, { status: 500 });
  }
}
