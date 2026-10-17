import { NextRequest, NextResponse } from "next/server";
import {
  sendWhatsAppTextMessage,
  getWhatsAppIntegrationStatus,
} from "../../../../backend/lib/whatsapp.server.ts";

import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/messages
 * Retrieves live WhatsApp messages feed from MongoDB Atlas and integration health.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  const health = getWhatsAppIntegrationStatus();

  try {
    const db = await getDatabase();
    const query = phone
      ? {
          $or: [
            { to: { $regex: phone.replace(/\D/g, "").slice(-10) } },
            { from: { $regex: phone.replace(/\D/g, "").slice(-10) } },
          ],
        }
      : {};

    const dbMessages = await db
      .collection("crm_messages")
      .find(query)
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({
      success: true,
      messages: dbMessages.length > 0 ? dbMessages : (globalThis.__globalWhatsAppFeed || []),
      health,
      storage: "mongodb",
    });
  } catch (err: any) {
    const feed = globalThis.__globalWhatsAppFeed || [];
    return NextResponse.json({ success: true, messages: feed, health, storage: "memory_fallback" });
  }
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

    // Save permanently to MongoDB Atlas
    try {
      const db = await getDatabase();
      await db.collection("crm_messages").insertOne({
        ...messageRecord,
        createdAt: new Date(),
      });
    } catch (dbErr) {
      console.warn("[MongoDB] Note: Failed to persist outbound message to Atlas:", dbErr);
    }

    return NextResponse.json({
      success: true,
      result,
      messageRecord,
      storage: "mongodb",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send WhatsApp message" }, { status: 500 });
  }
}
