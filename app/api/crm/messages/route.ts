import { NextRequest, NextResponse } from "next/server";
import {
  sendWhatsAppTextMessage,
  getWhatsAppIntegrationStatus,
} from "../../../../backend/lib/whatsapp.server.ts";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/messages
 * Retrieves live WhatsApp messages feed and integration health.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");

  const feed = globalThis.__globalWhatsAppFeed || [];
  const health = getWhatsAppIntegrationStatus();

  if (phone) {
    const cleanPhone = phone.replace(/\D/g, "");
    const filtered = feed.filter((m) => m.from?.replace(/\D/g, "").endsWith(cleanPhone.slice(-10)));
    return NextResponse.json({ success: true, messages: filtered, health });
  }

  return NextResponse.json({ success: true, messages: feed, health });
}

/**
 * POST /api/crm/messages
 * Sends an outbound WhatsApp message from Nishant or a CRM agent to a customer.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, text, customerId, orderNumber } = body;

    if (!to || !text) {
      return NextResponse.json({ error: "Recipient phone 'to' and message 'text' are required" }, { status: 400 });
    }

    const result = await sendWhatsAppTextMessage({ to, text });

    if (!globalThis.__globalWhatsAppFeed) {
      globalThis.__globalWhatsAppFeed = [];
    }

    const messageRecord = {
      id: result.messageId || `msg_${Date.now()}`,
      direction: "outbound",
      to: result.recipientPhone,
      text,
      timestamp: new Date().toISOString(),
      status: "sent",
      customerId,
      orderNumber,
      mode: result.mode,
      whatsappUrl: result.whatsappUrl || null,
    };

    globalThis.__globalWhatsAppFeed.unshift(messageRecord);

    return NextResponse.json({
      success: true,
      result,
      messageRecord,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send WhatsApp message" }, { status: 500 });
  }
}
