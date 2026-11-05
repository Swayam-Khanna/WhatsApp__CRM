import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { farmerId, senderType, senderId, senderName, text, departmentTag, attachments = [] } = body;

    if (!farmerId || !text || !senderType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const conversationId = `conv_${farmerId}`;
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const { error } = await supabase.from("farmer_admin_messages").insert({
      id: messageId,
      conversation_id: conversationId,
      farmer_id: farmerId,
      sender_type: senderType,
      sender_id: senderId || "unknown",
      sender_name: senderName || (senderType === "admin" ? "Prajnaa Admin" : "Farmer"),
      department_tag: departmentTag || (senderType === "admin" ? "General Support" : null),
      text: text.trim(),
      attachments,
      read_at: null,
      created_at: now,
    });

    if (error) {
      console.warn("[API /messages/send] Supabase insert notice:", error.message);
    }

    const message = {
      id: messageId,
      conversationId,
      farmerId,
      senderType,
      senderId,
      senderName,
      departmentTag: departmentTag || (senderType === "admin" ? "General Support" : null),
      text: text.trim(),
      attachments,
      readAt: null,
      createdAt: now,
      status: "sent",
    };

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send message" }, { status: 500 });
  }
}
