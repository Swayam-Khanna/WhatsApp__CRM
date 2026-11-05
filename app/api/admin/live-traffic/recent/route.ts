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
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "1000", 10);

    let dbEvents: any[] = [];
    try {
      const { data: events } = await supabase
        .from("visitor_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (Array.isArray(events)) {
        dbEvents = events;
      }
    } catch (e) {
      // Fallback to in-memory store
    }

    // Merge DB events and in-memory store, deduplicating by ID
    const mergedMap = new Map<string, any>();
    recentEventsStore.forEach((item) => {
      if (item && item.id) mergedMap.set(item.id, item);
    });
    dbEvents.forEach((item) => {
      if (item && item.id) mergedMap.set(item.id, item);
    });

    const mergedList = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    return NextResponse.json(
      { success: true, data: mergedList.slice(0, limit) },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch recent events" },
      { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
    );
  }
}
