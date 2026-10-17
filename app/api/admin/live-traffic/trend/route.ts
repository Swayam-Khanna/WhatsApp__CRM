import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";
import { recentEventsStore } from "@/lib/admin/visitor-event-emitter";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let dbEvents: any[] = [];
    try {
      const { data: events } = await supabase
        .from("visitor_events")
        .select("created_at")
        .gte("created_at", sevenDaysAgo);
      if (Array.isArray(events)) {
        dbEvents = events;
      }
    } catch (e) {}

    const combined = [...dbEvents, ...recentEventsStore.filter((e) => e.created_at >= sevenDaysAgo)];

    // Group views by date
    const dateCounts: Record<string, number> = {};
    combined.forEach((e: any) => {
      if (e.created_at) {
        const d = new Date(e.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        dateCounts[d] = (dateCounts[d] || 0) + 1;
      }
    });

    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const label = i === 0 ? "Today (Live)" : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const rawLabel = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      dates.push({
        date: label,
        views: dateCounts[rawLabel] || 0,
      });
    }

    return NextResponse.json(
      { success: true, data: dates },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
    );
  }
}
