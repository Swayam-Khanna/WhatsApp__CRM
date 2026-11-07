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
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    let dbEvents: any[] = [];
    try {
      const { data: activeEvents } = await supabase
        .from("visitor_events")
        .select("session_id, ip_address, created_at")
        .gte("created_at", fifteenMinsAgo);
      if (Array.isArray(activeEvents)) {
        dbEvents = activeEvents;
      }
    } catch (e) {}

    const inMemoryActive = recentEventsStore.filter((e) => e.created_at >= fifteenMinsAgo);
    const combined = [...dbEvents, ...inMemoryActive];

    const count = new Set(combined.map((e: any) => e.session_id || e.ip_address)).size;

    return NextResponse.json(
      {
        success: true,
        activeCount: count,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { activeCount: 0 },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
    );
  }
}
