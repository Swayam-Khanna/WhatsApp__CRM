import { NextRequest, NextResponse } from "next/server";
import { executePayout } from "@/lib/admin/settlement-service";
import { supabase } from "@/integrations/supabase/client";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { data: pendingSettlements, error } = await supabase
      .from("settlements")
      .select("id")
      .eq("status", "pending");

    if (error) throw error;
    if (!pendingSettlements || pendingSettlements.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending settlements found ready for payout.",
        processedCount: 0,
      });
    }

    let successCount = 0;
    const errors: string[] = [];

    for (const s of pendingSettlements) {
      try {
        await executePayout(s.id);
        successCount++;
      } catch (err: any) {
        errors.push(`Settlement ${s.id.substring(0, 8)}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${successCount}/${pendingSettlements.length} pending settlements.`,
      processedCount: successCount,
      errors,
    });
  } catch (err: any) {
    console.error("[API Process Pending Settlements Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to process pending settlements" }, { status: 500 });
  }
}
