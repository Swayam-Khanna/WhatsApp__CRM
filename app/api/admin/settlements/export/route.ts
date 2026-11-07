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

    let query = supabase
      .from("settlements")
      .select("*, farmer:farmer_profiles(full_name, farm_name)")
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: settlements, error } = await query;
    if (error) throw error;

    // Build CSV content
    const headers = [
      "Settlement ID",
      "Farmer Name",
      "Period Start",
      "Period End",
      "Order Count",
      "Gross Sales (INR)",
      "Commission (INR)",
      "TDS Amount (INR)",
      "Adjustments (INR)",
      "Net Payout (INR)",
      "Status",
      "UTR Reference",
      "Block Reason",
      "Failure Reason",
      "Generated At",
      "Paid At",
    ];

    const rows = (settlements || []).map((s: any) => [
      s.id,
      `"${s.farmer?.full_name || s.farmer?.farm_name || "N/A"}"`,
      s.period_start,
      s.period_end,
      s.order_count || 0,
      s.gross_sales || s.gross_amount || 0,
      s.commission_amount || s.fee_amount || 0,
      s.tds_amount || 0,
      s.adjustments_amount || 0,
      s.net_payout || s.net_amount || 0,
      s.status,
      s.utr_reference || s.payout_provider_ref || "",
      `"${s.block_reason || ""}"`,
      `"${s.failure_reason || ""}"`,
      s.generated_at || s.created_at,
      s.paid_at || "",
    ]);

    const csvString = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");

    return new NextResponse(csvString, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="farmer_settlements_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err: any) {
    console.error("[API Export Settlements Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to export CSV" }, { status: 500 });
  }
}
