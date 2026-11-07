import { NextRequest, NextResponse } from "next/server.js";
import {
  sendWhatsAppTextMessage,
  getWhatsAppIntegrationStatus,
  processConversationalBotReply,
} from "../../../../backend/lib/whatsapp.server.ts";
import { db } from "../../../../backend/db.ts";
import { crmMessages } from "../../../../backend/schema/crm.ts";
import { desc, or, ilike, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/messages
 * Retrieves live WhatsApp messages feed from PostgreSQL and integration health.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  const health = getWhatsAppIntegrationStatus();

  try {
    const cleanPhone = phone ? phone.replace(/\D/g, "").slice(-10) : "";
    let dbMessages: any[] = [];

    try {
      if (cleanPhone) {
        dbMessages = await db
          .select()
          .from(crmMessages)
          .where(or(ilike(crmMessages.from, `%${cleanPhone}%`), ilike(crmMessages.to, `%${cleanPhone}%`)))
          .orderBy(desc(crmMessages.createdAt))
          .limit(500);
      } else {
        dbMessages = await db
          .select()
          .from(crmMessages)
          .orderBy(desc(crmMessages.createdAt))
          .limit(500);
      }
    } catch (pgErr: any) {
      console.warn("[PostgreSQL] Messages query note:", pgErr?.message || pgErr);
    }

    const isDuplicateMessage = (m: any, o: any) => {
      if (m.id && o.id && m.id === o.id) return true;
      const sameFrom = (m.from || "").replace(/\D/g, "").slice(-10) === (o.from || "").replace(/\D/g, "").slice(-10);
      const sameTo = (m.to || "").replace(/\D/g, "").slice(-10) === (o.to || "").replace(/\D/g, "").slice(-10);
      const sameText = (m.text || "").trim() === (o.text || "").trim();
      const sameDir = (m.direction || m.sender) === (o.direction || o.sender);
      const timeDiff = Math.abs(
        new Date(m.timestamp || m.createdAt || 0).getTime() - new Date(o.timestamp || o.createdAt || 0).getTime()
      );
      return sameFrom && sameTo && sameText && sameDir && timeDiff < 4000;
    };

    const allMsgs = [...(globalThis.__globalWhatsAppFeed || []), ...(dbMessages || [])];
    const uniqueMsgs = allMsgs.filter((m, idx, arr) => idx === arr.findIndex((o) => isDuplicateMessage(m, o)));

    return NextResponse.json({
      success: true,
      messages: uniqueMsgs,
      health,
      storage: dbMessages.length > 0 ? "postgresql" : "memory_fallback",
    });
  } catch (err: any) {
    console.error("[CRM Messages GET] Error:", err?.message || err);
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

    // SCENARIO A: Inbound Customer Message
    if (sender === "customer") {
      const botResult = processConversationalBotReply({
        senderPhone: to,
        senderText: text,
        existingCustomerName: customerName,
      });

      const resolvedName = botResult.updatedCustomerName || customerName || "Customer";

      const customerMsgRecord = {
        id: `msg_cust_${Date.now()}`,
        direction: "inbound",
        sender: "customer",
        from: to,
        to: process.env.ADMIN_WHATSAPP_NUMBER || "918091265690",
        customerName: resolvedName,
        text,
        timestamp: new Date().toISOString(),
        status: "delivered",
        customerId,
        orderNumber,
        createdAt: new Date(),
      };

      globalThis.__globalWhatsAppFeed.unshift(customerMsgRecord);

      try {
        await db
          .insert(crmMessages)
          .values({
            id: customerMsgRecord.id,
            direction: "inbound",
            sender: "customer",
            from: customerMsgRecord.from,
            to: customerMsgRecord.to,
            customerName: resolvedName,
            text: customerMsgRecord.text,
            timestamp: new Date(customerMsgRecord.timestamp),
            status: "delivered",
            customerId,
            orderNumber,
            createdAt: customerMsgRecord.createdAt,
          })
          .onConflictDoNothing();
      } catch (e: any) {
        console.warn("[PostgreSQL] Note: Failed to persist customer msg:", e?.message || e);
      }

      const autoReplyText = botResult.replyText;
      const replyResult = await sendWhatsAppTextMessage({ to, text: autoReplyText });

      const autoReplyRecord = {
        id: replyResult.messageId || `msg_auto_${Date.now()}`,
        direction: "outbound",
        sender: "business",
        from: process.env.ADMIN_WHATSAPP_NUMBER || "918091265690",
        to,
        customerName: resolvedName,
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

      let persistedInPg = false;
      try {
        await db
          .insert(crmMessages)
          .values({
            id: autoReplyRecord.id,
            direction: "outbound",
            sender: "business",
            from: autoReplyRecord.from,
            to: autoReplyRecord.to,
            customerName: resolvedName,
            text: autoReplyRecord.text,
            timestamp: new Date(autoReplyRecord.timestamp),
            status: "sent",
            isAutomated: true,
            customerId,
            orderNumber,
            mode: replyResult.mode,
            whatsappUrl: replyResult.whatsappUrl || null,
            createdAt: autoReplyRecord.createdAt,
          })
          .onConflictDoNothing();
        persistedInPg = true;
      } catch (e: any) {
        console.warn("[PostgreSQL] Note: Failed to persist auto reply msg:", e?.message || e);
      }

      return NextResponse.json({
        success: true,
        inboundMessage: customerMsgRecord,
        autoReply: autoReplyRecord,
        storage: persistedInPg ? "postgresql" : "memory_fallback",
      });
    }

    // SCENARIO B: Outbound Staff / Business Message
    const cleanTo = (to || "").replace(/\D/g, "");
    const recentDuplicate = (globalThis.__globalWhatsAppFeed || []).find(
      (m: any) =>
        m.direction === "outbound" &&
        (m.to || "").replace(/\D/g, "") === cleanTo &&
        (m.text || "").trim() === text.trim() &&
        Date.now() - new Date(m.createdAt || m.timestamp || 0).getTime() < 3000
    );
    if (recentDuplicate) {
      return NextResponse.json({
        success: true,
        result: { success: true, messageId: recentDuplicate.id, mode: recentDuplicate.mode },
        messageRecord: recentDuplicate,
        storage: "deduped",
      });
    }

    const result = await sendWhatsAppTextMessage({ to, text });

    const messageRecord = {
      id: result.messageId || `msg_${Date.now()}`,
      direction: "outbound",
      sender: "business",
      from: process.env.ADMIN_WHATSAPP_NUMBER || "918091265690",
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

    let persistedInPg = false;
    try {
      await db
        .insert(crmMessages)
        .values({
          id: messageRecord.id,
          direction: "outbound",
          sender: "business",
          from: messageRecord.from,
          to: messageRecord.to,
          customerName: customerName || null,
          text: messageRecord.text,
          timestamp: new Date(messageRecord.timestamp),
          status: "sent",
          customerId,
          orderNumber,
          mode: result.mode,
          whatsappUrl: result.whatsappUrl || null,
          createdAt: messageRecord.createdAt,
        })
        .onConflictDoNothing();
      persistedInPg = true;
    } catch (dbErr: any) {
      console.warn("[PostgreSQL] Note: Failed to persist outbound message:", dbErr?.message || dbErr);
    }

    return NextResponse.json({
      success: true,
      result,
      messageRecord,
      storage: persistedInPg ? "postgresql" : "memory_fallback",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send WhatsApp message" }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/messages
 * Permanently deletes a customer contact and all of their messages from PostgreSQL and in-memory feed.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const customerId = searchParams.get("customerId");

    if (!phone && !customerId) {
      return NextResponse.json({ error: "phone or customerId required" }, { status: 400 });
    }

    const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);

    // 1. Delete from in-memory feed
    if (globalThis.__globalWhatsAppFeed) {
      globalThis.__globalWhatsAppFeed = globalThis.__globalWhatsAppFeed.filter((m: any) => {
        const mFrom = (m.from || "").replace(/\D/g, "").slice(-10);
        const mTo = (m.to || "").replace(/\D/g, "").slice(-10);
        const matchPhone = cleanPhone && (mFrom === cleanPhone || mTo === cleanPhone);
        const matchId = customerId && m.customerId === customerId;
        return !matchPhone && !matchId;
      });
    }

    // 2. Clear active conversation session
    if (cleanPhone && (globalThis as any).__crmChatSessions) {
      (globalThis as any).__crmChatSessions.delete(cleanPhone);
    }

    // 3. Delete permanently from PostgreSQL
    try {
      if (cleanPhone && customerId) {
        await db
          .delete(crmMessages)
          .where(
            or(
              ilike(crmMessages.from, `%${cleanPhone}%`),
              ilike(crmMessages.to, `%${cleanPhone}%`),
              eq(crmMessages.customerId, customerId)
            )
          );
      } else if (cleanPhone) {
        await db
          .delete(crmMessages)
          .where(or(ilike(crmMessages.from, `%${cleanPhone}%`), ilike(crmMessages.to, `%${cleanPhone}%`)));
      } else if (customerId) {
        await db.delete(crmMessages).where(eq(crmMessages.customerId, customerId));
      }
    } catch (dbErr: any) {
      console.warn("[PostgreSQL] Delete error:", dbErr?.message || dbErr);
    }

    return NextResponse.json({
      success: true,
      message: "Contact and all messages deleted permanently",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete contact messages" }, { status: 500 });
  }
}
