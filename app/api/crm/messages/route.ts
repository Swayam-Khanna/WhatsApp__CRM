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
 * Sends a WhatsApp message.
 * If sender === "customer", records inbound message and immediately fires an automated reply.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, text, customerId, orderNumber, customerName, sender = "business" } = body;

    if (!to || !text) {
      return NextResponse.json({ error: "Recipient phone 'to' and message 'text' are required" }, { status: 400 });
    }

    if (!globalThis.__globalWhatsAppFeed) {
      globalThis.__globalWhatsAppFeed = [];
    }

    let db: any = null;
    try {
      db = await getDatabase();
    } catch (dbErr) {
      console.warn("[MongoDB] Operating in memory fallback:", dbErr);
    }

    // SCENARIO A: Inbound Customer Message (Triggers Instant Automated Reply)
    if (sender === "customer") {
      const customerMsgRecord = {
        id: `msg_cust_${Date.now()}`,
        direction: "inbound",
        sender: "customer",
        from: to,
        to: "917650065690",
        customerName: customerName || "Customer",
        text,
        timestamp: new Date().toISOString(),
        status: "delivered",
        customerId,
        orderNumber,
        createdAt: new Date(),
      };

      globalThis.__globalWhatsAppFeed.unshift(customerMsgRecord);
      if (db) {
        try {
          await db.collection("crm_messages").insertOne(customerMsgRecord);
        } catch (e) {
          console.warn("[MongoDB] Note: Failed to persist customer msg:", e);
        }
      }

      // Automatically construct tailored Prajnaa automated reply without manual typing or templates
      const { generateAutomatedCustomerReply } = await import("../../../../backend/lib/whatsapp.server.ts");
      const autoReplyText = generateAutomatedCustomerReply({
        customerName: customerName || "Customer",
        customerQuery: text,
        orderNumber,
      });

      const replyResult = await sendWhatsAppTextMessage({ to, text: autoReplyText });

      const autoReplyRecord = {
        id: replyResult.messageId || `msg_auto_${Date.now()}`,
        direction: "outbound",
        sender: "business",
        from: "917650065690",
        to,
        customerName: customerName || "Customer",
        text: autoReplyText,
        timestamp: new Date().toISOString(),
        status: "sent",
        isAutomated: true,
        customerId,
        orderNumber,
        mode: replyResult.mode,
        whatsappUrl: replyResult.whatsappUrl || null,
        createdAt: new Date(),
      };

      globalThis.__globalWhatsAppFeed.unshift(autoReplyRecord);
      if (db) {
        try {
          await db.collection("crm_messages").insertOne(autoReplyRecord);
        } catch (e) {
          console.warn("[MongoDB] Note: Failed to persist auto reply msg:", e);
        }
      }

      return NextResponse.json({
        success: true,
        inboundMessage: customerMsgRecord,
        autoReply: autoReplyRecord,
        storage: db ? "mongodb" : "memory_fallback",
      });
    }

    // SCENARIO B: Outbound Staff / Business Message
    const result = await sendWhatsAppTextMessage({ to, text });

    const messageRecord = {
      id: result.messageId || `msg_${Date.now()}`,
      direction: "outbound",
      sender: "business",
      from: "917650065690",
      to: result.recipientPhone,
      text,
      timestamp: new Date().toISOString(),
      status: "sent",
      customerId,
      orderNumber,
      mode: result.mode,
      whatsappUrl: result.whatsappUrl || null,
      createdAt: new Date(),
    };

    globalThis.__globalWhatsAppFeed.unshift(messageRecord);

    // Save permanently to MongoDB Atlas
    if (db) {
      try {
        await db.collection("crm_messages").insertOne(messageRecord);
      } catch (dbErr) {
        console.warn("[MongoDB] Note: Failed to persist outbound message to Atlas:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      result,
      messageRecord,
      storage: db ? "mongodb" : "memory_fallback",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send WhatsApp message" }, { status: 500 });
  }
}
