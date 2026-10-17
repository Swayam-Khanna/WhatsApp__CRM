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
    let dbEvents: any[] = [];
    try {
      const { data: events } = await supabase
        .from("visitor_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (Array.isArray(events)) {
        dbEvents = events;
      }
    } catch (e) {}

    const mergedMap = new Map<string, any>();
    recentEventsStore.forEach((item) => {
      if (item && item.id) mergedMap.set(item.id, item);
    });
    dbEvents.forEach((item) => {
      if (item && item.id) mergedMap.set(item.id, item);
    });

    const items = Array.from(mergedMap.values());
    const totalViews = items.length;
    const uniqueIps = new Set(items.map((i: any) => i.ip_address || "")).size;

    // Active visitors in last 15 mins
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const activeEvents = items.filter((i: any) => i.created_at >= fifteenMinsAgo);
    const activeVisitors = new Set(activeEvents.map((i: any) => i.session_id || i.ip_address)).size;

    // Route counts
    const routeCounts: Record<string, number> = {};
    items.forEach((i: any) => {
      if (i.route) {
        routeCounts[i.route] = (routeCounts[i.route] || 0) + 1;
      }
    });

    let topRoute = "/";
    let topRouteHits = 0;
    Object.entries(routeCounts).forEach(([r, count]) => {
      if (count > topRouteHits) {
        topRouteHits = count;
        topRoute = r;
      }
    });

    return NextResponse.json(
      {
        success: true,
        summary: {
          totalViews,
          uniqueIps,
          activeVisitors,
          topRoute,
          topRouteHits,
          lastHourDelta: Math.min(totalViews, 12),
        },
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch summary" },
      { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
    );
  }
}
