import { NextRequest, NextResponse } from "next/server";
import { getActiveSettlementCycle } from "@/lib/admin/settlement-service";
import { supabase } from "@/integrations/supabase/client";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const cycle = await getActiveSettlementCycle();
    return NextResponse.json({ success: true, data: cycle });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch active cycle" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { cycle_start_day, cycle_end_day, cutoff_rule, tds_rate, tds_annual_threshold } = body;

    // Deactivate previous cycles
    await supabase.from("settlement_cycles").update({ active: false }).eq("active", true);

    // Insert new active cycle settings
    const { data: newCycle, error } = await supabase
      .from("settlement_cycles")
      .insert({
        cycle_start_day: cycle_start_day || 7,
        cycle_end_day: cycle_end_day || 10,
        cutoff_rule: cutoff_rule || "monthly_7th_10th",
        tds_rate: tds_rate || 0.01,
        tds_annual_threshold: tds_annual_threshold || 500000,
        active: true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Active settlement cycle parameters updated successfully.",
      data: newCycle,
    });
  } catch (err: any) {
    console.error("[API Settlement Cycle Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to update settlement cycle" }, { status: 500 });
  }
}
