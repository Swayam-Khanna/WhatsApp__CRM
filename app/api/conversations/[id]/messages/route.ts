import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppTextMessage } from "../../../../../backend/lib/whatsapp.server.ts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cleanId = id.replace(/\D/g, "");

  const feed = globalThis.__globalWhatsAppFeed || [];
  const matching = feed.filter((m) => {
    const raw = m.from || m.to || "";
    return raw.replace(/\D/g, "").endsWith(cleanId.slice(-10));
  });

  const chatMessages = matching.map((m) => ({
    id: m.id || `msg_${Date.now()}`,
    sender: m.direction === "inbound" ? "customer" : "agent",
    senderName: m.direction === "inbound" ? (m.customerName || "Customer") : "Nishant",
    text: m.text,
    timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now",
    status: m.status || "delivered",
  }));

  return NextResponse.json({ success: true, data: chatMessages });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { text, recipientPhone } = body;

    const phone = recipientPhone || id.replace(/\D/g, "");
    if (!phone || !text) {
      return NextResponse.json({ error: "Missing phone or text" }, { status: 400 });
    }

    const result = await sendWhatsAppTextMessage({ to: phone, text });

    if (!globalThis.__globalWhatsAppFeed) globalThis.__globalWhatsAppFeed = [];
    const record = {
      id: result.messageId || `msg_${Date.now()}`,
      direction: "outbound",
      to: result.recipientPhone,
      text,
      timestamp: new Date().toISOString(),
      status: "sent",
    };
    globalThis.__globalWhatsAppFeed.unshift(record);

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        sender: "agent",
        senderName: "Nishant",
        text,
        timestamp: "Just now",
        status: "sent",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
