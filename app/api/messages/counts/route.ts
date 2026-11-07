import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const farmerId = searchParams.get("farmer_id");

    let unreadForFarmer = 0;
    let unreadForAdminTotal = 0;

    if (farmerId) {
      const { count } = await supabase
        .from("farmer_admin_messages")
        .select("*", { count: "exact", head: true })
        .eq("farmer_id", farmerId)
        .eq("sender_type", "admin")
        .is("read_at", null);

      unreadForFarmer = count || 0;
    }

    const { count: adminTotal } = await supabase
      .from("farmer_admin_messages")
      .select("*", { count: "exact", head: true })
      .eq("sender_type", "farmer")
      .is("read_at", null);

    unreadForAdminTotal = adminTotal || 0;

    return NextResponse.json({
      unreadForFarmer,
      unreadForAdminTotal,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch counts" }, { status: 500 });
  }
}
