import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "created_at_desc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    let query = supabase
      .from("settlements")
      .select(
        `*, farmer:farmer_profiles(id, full_name, farm_name, kyc_status, gst_number, gst_verified, region), bank_account:bank_accounts(*)`,
        { count: "exact" }
      );

    // Apply status filter
    if (status !== "all") {
      query = query.eq("status", status);
    }

    // Apply sorting
    if (sort === "created_at_asc") {
      query = query.order("created_at", { ascending: true });
    } else if (sort === "net_amount_desc") {
      query = query.order("net_payout", { ascending: false });
    } else if (sort === "net_amount_asc") {
      query = query.order("net_payout", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: rows, count, error } = await query;
    if (error) throw error;

    // Apply text search on farmer name or farm name if provided
    let filteredRows = rows || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      filteredRows = filteredRows.filter(
        (r: any) =>
          r.farmer?.full_name?.toLowerCase().includes(q) ||
          r.farmer?.farm_name?.toLowerCase().includes(q) ||
          r.utr_reference?.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
      );
    }

    // Compute aggregate summary statistics
    const { data: allSettlements } = await supabase
      .from("settlements")
      .select("status, net_payout, net_amount, farmer_id, created_at");

    const stats = (allSettlements || []).reduce(
      (acc: any, item: any) => {
        const amt = Number(item.net_payout || item.net_amount || 0);
        if (item.status === "pending" || item.status === "processing") {
          acc.totalPending += amt;
        }
        if (item.status === "paid") {
          acc.totalPaid += amt;
        }
        if (item.status !== "paid") {
          acc.farmersAwaitingSet.add(item.farmer_id);
        }
        return acc;
      },
      { totalPending: 0, totalPaid: 0, farmersAwaitingSet: new Set() }
    );

    return NextResponse.json({
      success: true,
      data: filteredRows,
      pagination: {
        page,
        pageSize,
        total: count || filteredRows.length,
        totalPages: Math.ceil((count || filteredRows.length) / pageSize),
      },
      stats: {
        totalPending: stats.totalPending,
        totalPaid: stats.totalPaid,
        farmersAwaiting: stats.farmersAwaitingSet.size,
      },
    });
  } catch (err: any) {
    console.error("[API List Settlements Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to list settlements" }, { status: 500 });
  }
}
