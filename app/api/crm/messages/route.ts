import { NextRequest, NextResponse } from "next/server.js";
import {
  sendWhatsAppTextMessage,
  sendWhatsAppMediaMessage,
  getWhatsAppIntegrationStatus,
} from "../../../../backend/lib/whatsapp.server.ts";
import {
  db as pgDb,
  isPostgresConfigured,
  isPostgresAvailable,
  reportPostgresFailure,
  reportPostgresSuccess,
} from "../../../../backend/db.ts";
import { crmMessages } from "../../../../backend/schema/crm.ts";
import { desc, or, ilike, eq } from "drizzle-orm";
import { getDatabase } from "../../../../lib/mongodb.ts";
import {
  getStoredMessages,
  saveStoredMessage,
  getDeletedContacts,
  recordDeletedContact,
  resurrectContact,
  isContactDeleted,
} from "../../../../backend/lib/crm-store.server.ts";

export const dynamic = "force-dynamic";

// In-memory response cache to protect DB and reduce server CPU & RAM churn
interface MessagesCacheEntry {
  data: any;
  timestamp: number;
}
const messagesCache = new Map<string, MessagesCacheEntry>();

function invalidateMessagesCache() {
  messagesCache.clear();
}

/**
 * GET /api/crm/messages
 * Retrieves live WhatsApp messages feed combining Persistent Disk Store, PostgreSQL & MongoDB.
 * Filters out deleted contacts and returns authoritative deleted lists for universal multi-device sync.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  const cacheKey = phone ? phone.replace(/\D/g, "").slice(-10) : "all";

  // 1. Serve from in-memory cache if fresh (2.5 second TTL)
  const cached = messagesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 2500) {
    return NextResponse.json(cached.data);
  }

  const health = getWhatsAppIntegrationStatus();
  const deletedInfo = getDeletedContacts();
  const deletedPhoneSet = new Set(deletedInfo.phones.map((p) => p.replace(/\D/g, "").slice(-10)));
  const deletedCustIdSet = new Set(deletedInfo.customerIds);

  try {
    const cleanPhone = phone ? phone.replace(/\D/g, "").slice(-10) : "";
    let pgMessages: any[] = [];

    // 2. Primary relational storage: PostgreSQL via Drizzle ORM (when configured & available)
    if (isPostgresAvailable()) {
      try {
        if (cleanPhone) {
          pgMessages = await pgDb
            .select()
            .from(crmMessages)
            .where(or(ilike(crmMessages.from, `%${cleanPhone}%`), ilike(crmMessages.to, `%${cleanPhone}%`)))
            .orderBy(desc(crmMessages.createdAt))
            .limit(100);
        } else {
          pgMessages = await pgDb
            .select()
            .from(crmMessages)
            .orderBy(desc(crmMessages.createdAt))
            .limit(100);
        }
        reportPostgresSuccess();
      } catch (pgErr: any) {
        reportPostgresFailure(pgErr);
        console.warn("[PostgreSQL] Messages query note:", pgErr?.message || pgErr);
      }
    }

    // 3. Secondary fallback storage: MongoDB Atlas
    let dbMessages: any[] = [];
    try {
      const mongoDb = await getDatabase();
      if (mongoDb) {
        const query = cleanPhone
          ? {
              $or: [
                { to: { $regex: cleanPhone } },
                { from: { $regex: cleanPhone } },
              ],
            }
          : {};

        dbMessages = await mongoDb
          .collection("crm_messages")
          .find(query)
          .sort({ createdAt: -1, timestamp: -1 })
          .limit(100)
          .toArray();
      }
    } catch (mongoErr) {
      // In PostgreSQL-first or file-first deployments, MongoDB timeout/skip is handled gracefully
    }

    // 4. Base persistent store (disk-backed, survives server restarts and multi-device access)
    const storedBase = getStoredMessages();

    // Fast O(N) deduplication using Hash Sets
    const seenIds = new Set<string>();
    const seenSignatures = new Set<string>();
    const uniqueMsgs: any[] = [];

    const allMsgs = [...storedBase, ...(pgMessages || []), ...(dbMessages || [])];

    for (const m of allMsgs) {
      if (!m) continue;
      if (m.id && seenIds.has(m.id)) continue;

      const mFrom = (m.from || "").replace(/\D/g, "").slice(-10);
      const mTo = (m.to || "").replace(/\D/g, "").slice(-10);

      // Exclude messages belonging to deleted contacts
      if (mFrom && deletedPhoneSet.has(mFrom)) continue;
      if (mTo && deletedPhoneSet.has(mTo)) continue;
      if (m.customerId && deletedCustIdSet.has(m.customerId)) continue;

      // Filter by phone if specified
      if (cleanPhone && mFrom !== cleanPhone && mTo !== cleanPhone) continue;

      const textTrim = (m.text || "").trim();
      const timeMs = Math.floor(new Date(m.timestamp || m.createdAt || 0).getTime() / 4000); // 4-sec bucket
      const sig = `${mFrom}_${mTo}_${textTrim}_${timeMs}`;

      if (seenSignatures.has(sig)) continue;

      if (m.id) seenIds.add(m.id);
      seenSignatures.add(sig);
      uniqueMsgs.push(m);
      if (uniqueMsgs.length >= 200) break;
    }

    // Sanitize any malformed duplicate origin URLs
    const hostHeader = req.headers.get("host") || "";
    const isLocalEnv = !hostHeader || hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1");
    const cleanOrigin = isLocalEnv ? `http://${hostHeader || "127.0.0.1:3000"}` : `https://${hostHeader || "crm.prajnaa.in"}`;

    const cleanedMsgs = uniqueMsgs.map((m: any) => {
      if (typeof m.text === "string" && (m.text.includes("/catalogue") || m.text.includes("/customer") || m.text.includes("/catalog"))) {
        const cleanedText = m.text
          .replace(/https?:\/\/[^\s]+https?:\/\/[^\s]*\/(?:catalogue|customer|catalog)([^\s]*)/gi, `${cleanOrigin}/catalogue$1`)
          .replace(/https?:\/\/[^\s]+http\/[^\s]*\/(?:catalogue|customer|catalog)([^\s]*)/gi, `${cleanOrigin}/catalogue$1`);
        return { ...m, text: cleanedText };
      }
      return m;
    });

    const responsePayload = {
      success: true,
      messages: cleanedMsgs,
      deletedPhones: deletedInfo.phones,
      deletedCustomerIds: deletedInfo.customerIds,
      health,
      storage: "persistent_hybrid",
    };

    // Cache the compiled payload for 2.5s
    messagesCache.set(cacheKey, { data: responsePayload, timestamp: Date.now() });

    return NextResponse.json(responsePayload);
  } catch (err: any) {
    console.error("[CRM Messages GET] Error:", err?.message || err);
    const feed = getStoredMessages();
    return NextResponse.json({
      success: true,
      messages: feed,
      deletedPhones: deletedInfo.phones,
      deletedCustomerIds: deletedInfo.customerIds,
      health,
      storage: "persistent_fallback",
    });
  }
}

/**
 * POST /api/crm/messages
 * Sends a WhatsApp message.
 * If sender === "customer", records inbound message and immediately fires an automated reply.
 * Persists universally to disk, PostgreSQL, and MongoDB so every device gets the exact same state.
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

    let mongoDb: any = null;
    try {
      mongoDb = await getDatabase();
    } catch (dbErr) {
      console.warn("[MongoDB] Operating in persistent disk fallback:", dbErr);
    }

    // SCENARIO A: Inbound Customer Message (Triggers Instant Automated Reply)
    if (sender === "customer") {
      const fromClean = (to || "").replace(/\D/g, "").slice(-10);
      const { processSmartCustomerReply } = await import("../../../../backend/lib/smart-assistant.server.ts");
      const host = req.headers.get("host") || undefined;

      // Resurrect contact if customer contacts again
      if (fromClean) {
        resurrectContact(fromClean, customerId);
      }

      const botResult = await processSmartCustomerReply({
        customerPhone: to,
        customerText: text,
        customerName,
        reqHost: host,
      });

      const resolvedName = (botResult as any)?.updatedCustomerName || customerName || "Customer";

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
        createdAt: new Date().toISOString(),
      };

      // 1. Persist to shared disk store
      saveStoredMessage(customerMsgRecord);

      // 2. Persist to PostgreSQL if configured & available
      if (isPostgresAvailable()) {
        try {
          await pgDb
            .insert(crmMessages)
            .values({
              id: customerMsgRecord.id,
              direction: "inbound",
              sender: "customer",
              from: customerMsgRecord.from,
              to: customerMsgRecord.to,
              customerName: resolvedName,
              text: customerMsgRecord.text,
              type: "text",
              timestamp: new Date(customerMsgRecord.timestamp),
              status: "delivered",
              customerId: customerId || null,
              orderNumber: orderNumber || null,
              createdAt: new Date(),
            })
            .onConflictDoNothing();
          reportPostgresSuccess();
        } catch (pgErr) {
          reportPostgresFailure(pgErr);
          console.warn("[PostgreSQL] Inbound persist note:", pgErr);
        }
      }

      // 3. Persist to MongoDB if available
      if (mongoDb) {
        try {
          await mongoDb.collection("crm_messages").insertOne(customerMsgRecord);
        } catch (e) {
          console.warn("[MongoDB] Note: Failed to persist customer msg:", e);
        }
      }

      let autoReplyRecord: any = null;
      if (botResult && botResult.shouldSend && botResult.replyText) {
        const autoReplyText = botResult.replyText;
        const replyResult = await sendWhatsAppTextMessage({ to, text: autoReplyText });

        autoReplyRecord = {
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
          createdAt: new Date().toISOString(),
        };

        // Persist auto-reply universally
        saveStoredMessage(autoReplyRecord);

        if (isPostgresAvailable()) {
          try {
            await pgDb
              .insert(crmMessages)
              .values({
                id: autoReplyRecord.id,
                direction: "outbound",
                sender: "business",
                from: autoReplyRecord.from,
                to: autoReplyRecord.to,
                customerName: resolvedName,
                text: autoReplyRecord.text,
                type: "text",
                timestamp: new Date(autoReplyRecord.timestamp),
                status: "sent",
                customerId: customerId || null,
                orderNumber: orderNumber || null,
                mode: replyResult.mode,
                whatsappUrl: replyResult.whatsappUrl || null,
                createdAt: new Date(),
              })
              .onConflictDoNothing();
            reportPostgresSuccess();
          } catch (pgErr) {
            reportPostgresFailure(pgErr);
            console.warn("[PostgreSQL] Auto-reply persist note:", pgErr);
          }
        }

        if (mongoDb) {
          try {
            await mongoDb.collection("crm_messages").insertOne(autoReplyRecord);
          } catch (e) {
            console.warn("[MongoDB] Note: Failed to persist auto reply msg:", e);
          }
        }
      }

      invalidateMessagesCache();

      return NextResponse.json({
        success: true,
        inboundMessage: customerMsgRecord,
        autoReply: autoReplyRecord,
        storage: "persistent_universal",
      });
    }

    // SCENARIO B: Outbound Staff / Business Message
    const cleanTo = (to || "").replace(/\D/g, "");

    // Resurrect contact if staff sends an outbound message
    if (cleanTo) {
      resurrectContact(cleanTo, customerId);
    }

    // Human takeover safeguard: pause conflicting automated bot replies for this customer
    try {
      const { setHumanAgentHandoff } = await import("../../../../backend/lib/smart-assistant.server.ts");
      setHumanAgentHandoff(cleanTo, "CRM Staff Desk");
    } catch {}

    const storedMsgs = getStoredMessages();
    const recentDuplicate = storedMsgs.find(
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
      customerName: customerName || null,
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
      createdAt: new Date().toISOString(),
    };

    // 1. Save to persistent disk store (Primary shared resilience)
    saveStoredMessage(messageRecord);

    // 2. Save permanently to PostgreSQL (when configured & available)
    if (isPostgresAvailable()) {
      try {
        await pgDb
          .insert(crmMessages)
          .values({
            id: messageRecord.id,
            direction: "outbound",
            sender: "business",
            from: messageRecord.from,
            to: messageRecord.to,
            customerName: customerName || null,
            text: messageRecord.text,
            type: messageRecord.type || "text",
            mediaId: messageRecord.mediaId || null,
            mimeType: messageRecord.mimeType || null,
            timestamp: new Date(messageRecord.timestamp),
            status: "sent",
            customerId: customerId || null,
            orderNumber: orderNumber || null,
            mode: result.mode,
            whatsappUrl: result.whatsappUrl || null,
            createdAt: new Date(),
          })
          .onConflictDoNothing();
        reportPostgresSuccess();
      } catch (pgErr: any) {
        reportPostgresFailure(pgErr);
        console.warn("[PostgreSQL] Outbound message note:", pgErr?.message || pgErr);
      }
    }

    // 3. Save permanently to MongoDB Atlas (when available)
    if (mongoDb) {
      try {
        await mongoDb.collection("crm_messages").insertOne(messageRecord);

        const to10 = cleanTo.slice(-10);
        if (to10) {
          const formattedPhone = to10.length === 10 ? `+91 ${to10.slice(0, 5)} ${to10.slice(5)}` : `+${to10}`;
          await mongoDb.collection("crm_conversations").updateOne(
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

    invalidateMessagesCache();

    return NextResponse.json({
      success: true,
      result,
      messageRecord,
      storage: "persistent_universal",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send WhatsApp message" }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/messages
 * Permanently deletes a customer contact and all of their messages from disk store, MongoDB Atlas, and PostgreSQL.
 * Synchronizes the deletion across all devices so no device displays ghost chats.
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

    // 1. Mark permanently deleted in persistent store & purge messages/inquiries
    recordDeletedContact(cleanPhone, customerId);

    // 2. Clear active conversation session
    if (cleanPhone && globalThis.__crmChatSessions) {
      globalThis.__crmChatSessions.delete(cleanPhone);
    }

    // 3. Delete from MongoDB Atlas if available
    let deletedCount = 0;
    try {
      const mongoDb = await getDatabase();
      if (mongoDb) {
        const orClauses: any[] = [];
        if (cleanPhone) {
          orClauses.push({ from: { $regex: cleanPhone } });
          orClauses.push({ to: { $regex: cleanPhone } });
        }
        if (customerId) {
          orClauses.push({ customerId });
        }

        if (orClauses.length > 0) {
          const res = await mongoDb.collection("crm_messages").deleteMany({ $or: orClauses });
          deletedCount = res.deletedCount;
          if (cleanPhone) {
            await mongoDb.collection("crm_conversations").deleteMany({ phone: cleanPhone });
            await mongoDb.collection("crm_orders").deleteMany({
              $and: [
                { customerPhone: { $regex: cleanPhone } },
                { $or: [{ orderNumber: /INQUIRY/i }, { id: /inq_/i }, { totalPaise: 0 }] },
              ],
            });
            await mongoDb.collection("crm_deleted_contacts").updateOne(
              { phone: cleanPhone },
              { $set: { phone: cleanPhone, customerId: customerId || null, deletedAt: new Date() } },
              { upsert: true }
            );
          }
        }
      }
    } catch (dbErr) {
      console.warn("[MongoDB] Delete note:", dbErr);
    }

    // 4. Delete permanently from PostgreSQL if available
    if (isPostgresConfigured) {
      try {
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
    }

    invalidateMessagesCache();

    return NextResponse.json({
      success: true,
      message: "Contact and all messages deleted permanently across all devices",
      deletedCount,
      deletedPhones: getDeletedContacts().phones,
      deletedCustomerIds: getDeletedContacts().customerIds,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete contact messages" }, { status: 500 });
  }
}
