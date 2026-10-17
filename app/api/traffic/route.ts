import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";
import { visitorEventsEmitter, resolveIpGeoLocation, pushRecentVisitorEvent } from "@/lib/admin/visitor-event-emitter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { route, visitorType, visitorName, userId, device, browser } = body;

    const rawIp = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "117.99.134.165";
    const userAgent = req.headers.get("user-agent") || "";
    const sessionId = req.cookies.get("prajnaa_session_id")?.value || `sess_${Math.random().toString(36).substring(2, 10)}`;

    let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
    if (/mobile/i.test(userAgent) || device === "Mobile") deviceType = "mobile";
    if (/tablet|ipad/i.test(userAgent) || device === "Tablet") deviceType = "tablet";

    let detectedBrowser = browser || "Chrome";
    if (/edg/i.test(userAgent)) detectedBrowser = "Edge";
    else if (/chrome/i.test(userAgent)) detectedBrowser = "Chrome";
    else if (/safari/i.test(userAgent)) detectedBrowser = "Safari";
    else if (/firefox/i.test(userAgent)) detectedBrowser = "Firefox";

    // Resolve IP geolocation
    const geo = await resolveIpGeoLocation(rawIp);

    const newEvent = {
      session_id: sessionId,
      visitor_type: visitorType === "Registered" || visitorType === "registered" ? "registered" : "guest",
      visitor_name: visitorName || null,
      user_id: userId || null,
      ip_address: rawIp,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      country_code: geo.country_code,
      isp: geo.isp,
      route: route || "/",
      device_type: deviceType,
      browser: detectedBrowser,
      created_at: new Date().toISOString(),
    };

    // Insert into visitor_events table
    let data: any = null;
    try {
      const res = await supabase.from("visitor_events").insert(newEvent).select().single();
      data = res.data;
    } catch (e) {}

    const payload = (data && data.id) ? data : { ...newEvent, id: `tmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` };

    // Push to in-memory store for serverless fallback
    pushRecentVisitorEvent(payload as any);

    // Emit live SSE event
    visitorEventsEmitter.emit("visitor_event", payload);

    const response = NextResponse.json({ success: true, event: payload });
    if (!req.cookies.has("prajnaa_session_id")) {
      response.cookies.set("prajnaa_session_id", sessionId, { path: "/", maxAge: 60 * 60 * 24 * 30 });
    }

    return response;
  } catch (err: any) {
    console.error("[Traffic Event Handler Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "1000", 10);

    const { data: logs, error } = await supabase
      .from("visitor_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ success: true, data: logs || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
