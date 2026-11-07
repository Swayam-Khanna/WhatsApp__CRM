import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const farmerId = searchParams.get("farmer_id");

    if (!farmerId) {
      return NextResponse.json({ error: "farmer_id is required" }, { status: 400 });
    }

    // Resolve profile and user_id aliases
    const ids = [farmerId];
    try {
      const { data: profile } = await supabase
        .from("farmer_profiles")
        .select("id, user_id, slug")
        .or(`id.eq.${farmerId},user_id.eq.${farmerId},slug.eq.${farmerId}`)
        .maybeSingle();
      if (profile) {
        if (profile.id && !ids.includes(profile.id)) ids.push(profile.id);
        if (profile.user_id && !ids.includes(profile.user_id)) ids.push(profile.user_id);
        if (profile.slug && !ids.includes(profile.slug)) ids.push(profile.slug);
      }
    } catch {}

    const orClauses = ids.map((id) => `farmer_id.eq.${id}`).concat(ids.map((id) => `sender_id.eq.${id}`));

    // Query messages for this farmer from database
    const { data, error } = await supabase
      .from("farmer_admin_messages")
      .select("*")
      .or(orClauses.join(","))
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("[API /messages/thread] Supabase notice:", error.message);
      return NextResponse.json({ messages: [], totalCount: 0 });
    }

    const messages = (data || []).map((m: any) => ({
      id: m.id,
      conversationId: m.conversation_id || `conv_${farmerId}`,
      farmerId: m.farmer_id,
      senderType: m.sender_type,
      senderId: m.sender_id,
      senderName: m.sender_name,
      departmentTag: m.department_tag || null,
      text: m.text,
      attachments: Array.isArray(m.attachments) ? m.attachments : [],
      readAt: m.read_at,
      createdAt: m.created_at,
      status: m.read_at ? "read" : "delivered",
    }));

    return NextResponse.json({
      messages,
      totalCount: messages.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
