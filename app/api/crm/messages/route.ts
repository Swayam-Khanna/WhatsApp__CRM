import { NextRequest, NextResponse } from "next/server.js";
import {
  sendWhatsAppTextMessage,
  sendWhatsAppMediaMessage,
  getWhatsAppIntegrationStatus,
} from "../../../../backend/lib/whatsapp.server.ts";

import { getDatabase } from "../../../../lib/mongodb.ts";

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
    const fetchWithTimeout = async () => {
      const db = await getDatabase();
      const query = phone
        ? {
            $or: [
              { to: { $regex: phone.replace(/\D/g, "").slice(-10) } },
              { from: { $regex: phone.replace(/\D/g, "").slice(-10) } },
            ],
          }
        : {};

      return await db
        .collection("crm_messages")
        .find(query)
        .sort({ createdAt: -1, timestamp: -1 }).limit(500)
        .toArray();
    };

    const dbMessages = await Promise.race([
      fetchWithTimeout(),
      new Promise<any[]>((_, reject) =>
        setTimeout(() => reject(new Error("MongoDB query timeout")), 8000)
      ),
    ]);

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
    let uniqueMsgs = allMsgs.filter((m, idx, arr) => idx === arr.findIndex((o) => isDuplicateMessage(m, o)));

    // Exclude any messages from permanently deleted contacts
    try {
      const db = await getDatabase();
      if (db) {
        const deletedDocs = await db.collection("crm_deleted_contacts").find({}).toArray();
        if (deletedDocs && deletedDocs.length > 0) {
          const deletedPhoneSet = new Set<string>(deletedDocs.map((d: any) => (d.phone || "").replace(/\D/g, "").slice(-10)).filter(Boolean));
          uniqueMsgs = uniqueMsgs.filter((m: any) => {
            const mFrom = (m.from || "").replace(/\D/g, "").slice(-10);
            const mTo = (m.to || "").replace(/\D/g, "").slice(-10);
            return !deletedPhoneSet.has(mFrom) && !deletedPhoneSet.has(mTo);
          });
        }
      }
    } catch {}

    return NextResponse.json({
      success: true,
      messages: uniqueMsgs,
      health,
      storage: "hybrid",
    });
  } catch (err: any) {
    console.error("[CRM Messages GET] Error:", err?.message || err);
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

    const feed = globalThis.__globalWhatsAppFeed || [];
    const cleanFeed = feed.filter((m, idx, arr) => idx === arr.findIndex((o) => isDuplicateMessage(m, o)));
    return NextResponse.json({ success: true, messages: cleanFeed, health, storage: "memory_fallback" });
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
    const {
      to,
      text = "",
      customerId,
      orderNumber,
      customerName,
      sender = "business",
      type = "text",
      mediaUrl,
      mediaId,
      mimeType,
      filename,
    } = body;

    if (!to || (!text && !mediaUrl && !mediaId)) {
      return NextResponse.json({ error: "Recipient phone 'to' and message content are required" }, { status: 400 });
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
      const fromClean = (to || "").replace(/\D/g, "").slice(-10);
      const { processConversationalBotReply } = await import("../../../../backend/lib/whatsapp.server.ts");

      const botResult = processConversationalBotReply({
        senderPhone: to,
        senderText: text,
        existingCustomerName: customerName,
        orderNumber,
      });

      const resolvedName = botResult.updatedCustomerName || customerName || "Customer";

      // If updated customer name found, propagate to past messages in feed & DB
      if (botResult.updatedCustomerName && fromClean) {
        (globalThis.__globalWhatsAppFeed || []).forEach((m: any) => {
          const mFrom = (m.from || "").replace(/\D/g, "").slice(-10);
          const mTo = (m.to || "").replace(/\D/g, "").slice(-10);
          if (mFrom === fromClean || mTo === fromClean) {
            m.customerName = botResult.updatedCustomerName;
          }
        });

        if (db) {
          db.collection("crm_messages").updateMany(
            {
              $or: [
                { from: { $regex: fromClean } },
                { to: { $regex: fromClean } },
              ],
            },
            { $set: { customerName: botResult.updatedCustomerName } }
          ).catch(() => {});
        }
      }

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
      if (db) {
        try {
          await db.collection("crm_messages").insertOne(customerMsgRecord);
        } catch (e) {
          console.warn("[MongoDB] Note: Failed to persist customer msg:", e);
        }
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

    let result: any;
    const isMedia = type && type !== "text" && (mediaUrl || mediaId);
    if (isMedia) {
      result = await sendWhatsAppMediaMessage({
        to,
        type: type as any,
        mediaId,
        mediaUrl,
        filename,
        caption: text,
      });
    } else {
      result = await sendWhatsAppTextMessage({ to, text });
    }

    const messageRecord = {
      id: result.messageId || `msg_${Date.now()}`,
      direction: "outbound",
      sender: "business",
      from: process.env.ADMIN_WHATSAPP_NUMBER || "918091265690",
      to: result.recipientPhone || cleanTo,
      text,
      type: type || "text",
      mediaId: mediaId || null,
      mediaUrl: mediaUrl || null,
      mimeType: mimeType || null,
      filename: filename || null,
      timestamp: new Date().toISOString(),
      status: "sent",
      customerId,
      orderNumber,
      mode: result.mode,
      whatsappUrl: result.whatsappUrl || null,
      createdAt: new Date(),
    };

    globalThis.__globalWhatsAppFeed.unshift(messageRecord);

    // Save permanently to MongoDB Atlas & update conversation state
    if (db) {
      try {
        await db.collection("crm_messages").insertOne(messageRecord);

        const to10 = cleanTo.slice(-10);
        if (to10) {
          const formattedPhone = to10.length === 10 ? `+91 ${to10.slice(0, 5)} ${to10.slice(5)}` : `+${to10}`;
          await db.collection("crm_conversations").updateOne(
            { phone: to10 },
            {
              $set: {
                id: `conv_${to10}`,
                customerPhone: formattedPhone,
                lastMessageText: text,
                lastMessageTime: messageRecord.timestamp,
                unreadCount: 0,
                updatedAt: new Date(),
              },
              $setOnInsert: {
                createdAt: new Date(),
                status: "active",
                customerName: customerName || `Patron (${formattedPhone})`,
              },
            },
            { upsert: true }
          );
        }
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


/**
 * DELETE /api/crm/messages
 * Permanently deletes a customer contact and all of their messages from MongoDB Atlas and in-memory feed.
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
    if (cleanPhone && globalThis.__crmChatSessions) {
      globalThis.__crmChatSessions.delete(cleanPhone);
    }

    // 3. Delete permanently from MongoDB Atlas
    let deletedCount = 0;
    try {
      const db = await getDatabase();
      if (db) {
        const orClauses: any[] = [];
        if (cleanPhone) {
          orClauses.push({ from: { $regex: cleanPhone } });
          orClauses.push({ to: { $regex: cleanPhone } });
        }
        if (customerId) {
          orClauses.push({ customerId });
        }

        if (orClauses.length > 0) {
          const res = await db.collection("crm_messages").deleteMany({ $or: orClauses });
          deletedCount = res.deletedCount;
          if (cleanPhone) {
            await db.collection("crm_conversations").deleteMany({ phone: cleanPhone });
            // Remove draft/inquiry orders for this phone so order sync won't recreate the customer
            await db.collection("crm_orders").deleteMany({
              $and: [
                { customerPhone: { $regex: cleanPhone } },
                { $or: [{ orderNumber: /INQUIRY/i }, { id: /inq_/i }, { totalPaise: 0 }] }
              ]
            });
            // Record in crm_deleted_contacts so it is permanently excluded
            await db.collection("crm_deleted_contacts").updateOne(
              { phone: cleanPhone },
              { $set: { phone: cleanPhone, customerId: customerId || null, deletedAt: new Date() } },
              { upsert: true }
            );
          }
        }
      }
    } catch (dbErr) {
      console.warn("[MongoDB] Delete error:", dbErr);
    }

    // Also delete permanently from PostgreSQL if available
    try {
      const { db: pgDb } = await import("../../../../backend/db.ts");
      const { crmMessages } = await import("../../../../backend/schema/crm.ts");
      const { or, ilike, eq } = await import("drizzle-orm");
      if (cleanPhone && customerId) {
        await pgDb
          .delete(crmMessages)
          .where(
            or(
              ilike(crmMessages.from, `%${cleanPhone}%`),
              ilike(crmMessages.to, `%${cleanPhone}%`),
              eq(crmMessages.customerId, customerId)
            )
          );
      } else if (cleanPhone) {
        await pgDb
          .delete(crmMessages)
          .where(
            or(ilike(crmMessages.from, `%${cleanPhone}%`), ilike(crmMessages.to, `%${cleanPhone}%`))
          );
      } else if (customerId) {
        await pgDb.delete(crmMessages).where(eq(crmMessages.customerId, customerId));
      }
    } catch (pgErr) {}

    return NextResponse.json({
      success: true,
      message: "Contact and all messages deleted permanently",
      deletedCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete contact messages" }, { status: 500 });
  }
}
