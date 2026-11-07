import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    let reviews: any[] | null = null;
    const { data, error } = await supabase
      .from("product_reviews")
      .select("id, status, verified");

    if (error) {
      const { data: fallbackData } = await supabase
        .from("product_reviews")
        .select("id, verified");
      reviews = fallbackData || [];
    } else {
      reviews = data || [];
    }

    const counts = {
      all: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      flagged: 0,
    };

    if (Array.isArray(reviews)) {
      counts.all = reviews.length;
      reviews.forEach((r: any) => {
        const st = r.status || (r.verified ? "approved" : "pending");
        if (st === "pending") counts.pending++;
        else if (st === "approved") counts.approved++;
        else if (st === "rejected") counts.rejected++;
        else if (st === "flagged") counts.flagged++;
      });
    }

    return NextResponse.json(
      {
        success: true,
        counts,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
    );
  } catch (err: any) {
    console.error("[API Admin Reviews Counts GET] Server Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch counts" },
      { status: 500 }
    );
  }
}
