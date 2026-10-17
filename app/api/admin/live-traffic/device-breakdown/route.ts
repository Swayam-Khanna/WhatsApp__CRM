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
      const { data: events } = await supabase.from("visitor_events").select("device_type, browser");
      if (Array.isArray(events)) {
        dbEvents = events;
      }
    } catch (e) {}

    const combined = [...dbEvents, ...recentEventsStore];

    let desktopCount = 0;
    let mobileCount = 0;
    let tabletCount = 0;
    const browserCounts: Record<string, number> = {};

    combined.forEach((e: any) => {
      if (e.device_type === "mobile") mobileCount++;
      else if (e.device_type === "tablet") tabletCount++;
      else desktopCount++;

      const b = e.browser || "Chrome";
      browserCounts[b] = (browserCounts[b] || 0) + 1;
    });

    let topBrowser = "Chrome";
    let topBrowserHits = 0;
    Object.entries(browserCounts).forEach(([b, count]) => {
      if (count > topBrowserHits) {
        topBrowserHits = count;
        topBrowser = b;
      }
    });

    return NextResponse.json(
      {
        success: true,
        data: [
          { name: "Desktop", value: desktopCount, color: "#133A27" },
          { name: "Mobile", value: mobileCount + tabletCount, color: "#C68E65" },
        ],
        topBrowser: {
          name: topBrowser,
          count: topBrowserHits,
        },
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
    );
  }
}
