import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { farmerId, readerType } = body;

    if (!farmerId || !readerType) {
      return NextResponse.json({ error: "farmerId and readerType are required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const oppositeSenderType = readerType === "farmer" ? "admin" : "farmer";

    await supabase
      .from("farmer_admin_messages")
      .update({ read_at: now })
      .eq("farmer_id", farmerId)
      .eq("sender_type", oppositeSenderType)
      .is("read_at", null);

    return NextResponse.json({ success: true, readAt: now });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to mark as read" }, { status: 500 });
  }
}
