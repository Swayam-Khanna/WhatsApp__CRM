import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { id } = await params;

    // Fetch full settlement details
    const { data: settlement, error: setErr } = await supabase
      .from("settlements")
      .select(
        `*, farmer:farmer_profiles(*), bank_account:bank_accounts(*), cycle:settlement_cycles(*)`
      )
      .eq("id", id)
      .single();

    if (setErr || !settlement) {
      return NextResponse.json({ error: "Settlement record not found" }, { status: 404 });
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from("settlement_line_items")
      .select("*")
      .eq("settlement_id", id)
      .order("created_at", { ascending: true });

    // Fetch audit events timeline
    const { data: events } = await supabase
      .from("settlement_events")
      .select("*")
      .eq("settlement_id", id)
      .order("created_at", { ascending: true });

    // Fetch payout transactions history
    const { data: transactions } = await supabase
      .from("payout_transactions")
      .select("*")
      .eq("settlement_id", id)
      .order("initiated_at", { ascending: false });

    return NextResponse.json({
      success: true,
      data: {
        ...settlement,
        line_items: lineItems || [],
        events: events || [],
        transactions: transactions || [],
      },
    });
  } catch (err: any) {
    console.error("[API Settlement Detail Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch settlement detail" }, { status: 500 });
  }
}
