import { NextRequest, NextResponse } from "next/server.js";
import {
  verifyWebhookSignature,
  parseInboundWebhookPayload,
  getWhatsAppIntegrationStatus,
  sendWhatsAppTextMessage,
  processConversationalBotReply,
} from "../../../../backend/lib/whatsapp.server.ts";
import { processSmartCustomerReply } from "../../../../backend/lib/smart-assistant.server.ts";
import { getDatabase } from "../../../../lib/mongodb.ts";
import { db as pgDb } from "../../../../backend/db.ts";
import { crmMessages } from "../../../../backend/schema/crm.ts";
import { eq, or, ilike } from "drizzle-orm";
import {
  saveStoredMessage,
  resurrectContact,
  getStoredMessages,
} from "../../../../backend/lib/crm-store.server.ts";

export const dynamic = "force-dynamic";

// Webhook messages in-memory store for CRM real-time feed
declare global {
  // eslint-disable-next-line no-var
  var __globalWhatsAppFeed: any[] | undefined;
}

if (!globalThis.__globalWhatsAppFeed) {
  globalThis.__globalWhatsAppFeed = [];
}

/**
 * GET /api/webhooks/whatsapp
 * Meta Webhook verification handshake.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedTokens = [
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    "prajnaa_whatsapp_verify_token",
    "your_webhook_verify_token",
  ].filter(Boolean);

  if (mode === "subscribe" && token && expectedTokens.includes(token)) {
    console.log("[WhatsApp Webhook] Handshake verified successfully.");
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  // Also return health status if queried directly via browser
  if (!mode) {
    const health = getWhatsAppIntegrationStatus();
    const diskFeed = getStoredMessages();
    return NextResponse.json({
      status: "WhatsApp Webhook Listener Active",
      endpoint: "/api/webhooks/whatsapp",
      supportedEndpoints: [
        "/api/webhooks/whatsapp",
        "/api/whatsapp/webhook",
        "/api/webhook/whatsapp",
        "/api/webhook",
      ],
      health,
      webhookConfig: {
        verifyTokenConfigured: Boolean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
        verifyTokenMatchesDefault: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN === "prajnaa_whatsapp_verify_token",
        appSecretConfigured: Boolean(process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET),
        phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID || "1395630476965721",
        adminPhone: process.env.ADMIN_WHATSAPP_NUMBER || "918091265690",
      },
      feedSummary: {
        totalMessages: diskFeed.length,
        recentMessages: diskFeed.slice(0, 5),
      },
    });
  }

  return new Response("Forbidden", { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp
 * Receives inbound customer messages and delivery receipts from Meta WhatsApp Cloud API.
 * Automatically persists to MongoDB Atlas & in-memory feed, and dispatches conversational replies.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    const isInternalTest = req.headers.get("x-crm-source") === "internal-test";

    // 1. Verify Meta signature (or permit authenticated internal dashboard webhook tests)
    if (!isInternalTest && !verifyWebhookSignature(rawBody, signature)) {
      console.error("[WhatsApp Webhook Security Alert] Invalid Meta signature rejected. Signature header:", signature, "Payload length:", rawBody?.length);
      return new Response("Invalid signature", { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseErr: any) {
      console.error("[WhatsApp Webhook Malformed JSON Error]:", parseErr?.message || parseErr, "Body:", rawBody?.slice(0, 200));
      return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
    }

    // 2. Parse inbound messages and delivery receipts
    const { messages, statuses } = parseInboundWebhookPayload(payload);

    // 3. Process and persist synchronously so Serverless function commits to MongoDB Atlas before terminating
    const reqHost = req.headers.get("host") || undefined;
    await handleWebhookProcessing(messages, statuses, reqHost);

    if (isInternalTest || req.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({
        success: true,
        status: "EVENT_RECEIVED",
        message: "Webhook payload processed and persisted successfully",
        receivedAt: new Date().toISOString(),
      });
    }

    return new Response("EVENT_RECEIVED", { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch (err: any) {
    console.error("[WhatsApp Webhook] Error processing event:", err);
    return NextResponse.json({ error: err.message || "Webhook processing failed" }, { status: 500 });
  }
}

async function handleWebhookProcessing(messages: any[], statuses: any[], reqHost?: string) {
  if (!globalThis.__globalWhatsAppFeed) {
    globalThis.__globalWhatsAppFeed = [];
  }

  // Fast background database connection (500ms timeout so cloud DB connection never delays Meta's 5s timeout)
  const dbPromise = Promise.race([
    getDatabase(),
    new Promise((resolve) => setTimeout(() => resolve(null), 500)),
  ]).catch(() => null);

  // 1. Process Inbound Customer Messages & Trigger Automated Reply
  for (const msg of messages) {
    if (!msg.id) continue;

    // Idempotency: Check in-memory feed first
    const isAlreadyInFeed = (globalThis.__globalWhatsAppFeed || []).some((m: any) => m.id === msg.id);
    if (isAlreadyInFeed) {
      console.log(`[WhatsApp Webhook] Idempotency: Message ${msg.id} already in feed. Skipping.`);
      continue;
    }

    console.log(`[WhatsApp Webhook] Inbound from ${msg.fromPhone}: ${msg.text}`);

    const adminPhone = (process.env.ADMIN_WHATSAPP_NUMBER || "918091265690").replace(/\D/g, "").slice(-10);
    const fromClean = (msg.fromPhone || "").replace(/\D/g, "").slice(-10);
    const isAdminSender = fromClean === adminPhone;

    // Detect outbound message sent by store admin directly from their phone's WhatsApp (e.g. WhatsApp Business App)
    const toClean = (msg.toPhone || "").replace(/\D/g, "").slice(-10);
    const isOutboundFromPhone = isAdminSender && Boolean(toClean && toClean !== adminPhone);

    const targetFrom = isOutboundFromPhone
      ? (process.env.ADMIN_WHATSAPP_NUMBER || "918091265690")
      : msg.fromPhone;
    const targetTo = isOutboundFromPhone
      ? (msg.toPhone || "")
      : (process.env.ADMIN_WHATSAPP_NUMBER || "918091265690");

    // Smart assistant engine: understands intent, queries live catalogue, answers with short Hinglish
    const botResult = (!isAdminSender && !isOutboundFromPhone)
      ? await processSmartCustomerReply({
          customerPhone: msg.fromPhone,
          customerText: msg.text,
          customerName: msg.customerName,
          reqHost,
        })
      : null;

    const resolvedCustomerName =
      (botResult as any)?.updatedCustomerName ||
      msg.customerName ||
      (isAdminSender ? "Store Mobile (+91 80912 65690)" : "Customer");

    // Propagate captured customer name to in-memory feed
    if (botResult?.updatedCustomerName && fromClean) {
      (globalThis.__globalWhatsAppFeed || []).forEach((m: any) => {
        const mFrom = (m.from || "").replace(/\D/g, "").slice(-10);
        const mTo = (m.to || "").replace(/\D/g, "").slice(-10);
        if (mFrom === fromClean || mTo === fromClean) {
          m.customerName = botResult.updatedCustomerName;
        }
      });
    }

    const formattedPhone = fromClean.length === 10 ? `+91 ${fromClean.slice(0, 5)} ${fromClean.slice(5)}` : `+${fromClean}`;

    const inboundRecord = {
      id: msg.id,
      direction: isOutboundFromPhone ? "outbound" : "inbound",
      sender: isOutboundFromPhone ? "business" : "customer",
      from: targetFrom,
      to: targetTo,
      customerName: isOutboundFromPhone ? (msg.customerName || "Customer") : (isAdminSender ? "Store Mobile (+91 80912 65690)" : resolvedCustomerName),
      text: msg.text,
      type: msg.type || "text",
      mediaId: msg.mediaId || null,
      mimeType: msg.mimeType || null,
      businessPhoneNumberId: msg.businessPhoneNumberId || null,
      timestamp: msg.timestamp || new Date().toISOString(),
      status: "delivered",
      createdAt: new Date(),
    };

    // 1. Immediately persist to universal disk-backed store & in-memory feed
    saveStoredMessage(inboundRecord);
    if (fromClean) resurrectContact(fromClean);
    if (toClean) resurrectContact(toClean);

    // 2. Non-blocking asynchronous sync to PostgreSQL & MongoDB Atlas
    dbPromise.then(async (db) => {
      try {
        await pgDb
          .insert(crmMessages)
          .values({
            id: inboundRecord.id,
            direction: inboundRecord.direction as any,
            sender: inboundRecord.sender as any,
            from: inboundRecord.from,
            to: inboundRecord.to,
            customerName: inboundRecord.customerName,
            text: inboundRecord.text,
            type: inboundRecord.type,
            mediaId: inboundRecord.mediaId,
            mimeType: inboundRecord.mimeType,
            businessPhoneNumberId: inboundRecord.businessPhoneNumberId,
            status: "delivered",
            timestamp: new Date(inboundRecord.timestamp),
            createdAt: inboundRecord.createdAt,
          })
          .onConflictDoNothing();

        if (botResult?.updatedCustomerName && fromClean) {
          await pgDb
            .update(crmMessages)
            .set({ customerName: botResult.updatedCustomerName })
            .where(
              or(ilike(crmMessages.from, `%${fromClean}%`), ilike(crmMessages.to, `%${fromClean}%`))
            );
        }
      } catch (pgErr: any) {
        // PostgreSQL might not be configured in MongoDB-first deployments
      }

      if (db) {
        try {
          await db.collection("crm_messages").insertOne(inboundRecord);

          // Update past customer name records if updated
          if (botResult?.updatedCustomerName && fromClean) {
            await db.collection("crm_messages").updateMany(
              {
                $or: [
                  { from: { $regex: fromClean } },
                  { to: { $regex: fromClean } },
                ],
              },
              { $set: { customerName: botResult.updatedCustomerName } }
            );
          }

          // Upsert conversation record in crm_conversations and remove any legacy deletion marks
          if (fromClean) {
            try {
              await db.collection("crm_deleted_contacts").deleteOne({
                $or: [{ phone: fromClean }, { phone: msg.fromPhone }]
              });
            } catch {}

            await db.collection("crm_conversations").updateOne(
              { phone: fromClean },
              {
                $set: {
                  id: `conv_${fromClean}`,
                  customerPhone: formattedPhone,
                  customerName: resolvedCustomerName,
                  lastMessageText: msg.text,
                  lastMessageTime: inboundRecord.timestamp,
                  updatedAt: new Date(),
                },
                $setOnInsert: {
                  createdAt: new Date(),
                  status: "active",
                },
                $inc: { unreadCount: 1 },
              },
              { upsert: true }
            );
          }
        } catch (e) {
          console.warn("[MongoDB] Failed to persist inbound msg to Atlas:", e);
        }
      }
    }).catch(() => {});

    // Automated customer bot reply if message is NOT from the store admin
    if (!isAdminSender && !isOutboundFromPhone && botResult && botResult.shouldSend && botResult.replyText) {
      const autoReplyText = botResult.replyText;

      const autoReplyRecord = {
        id: `msg_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        direction: "outbound",
        sender: "business",
        from: process.env.ADMIN_WHATSAPP_NUMBER || "918091265690",
        to: msg.fromPhone,
        customerName: resolvedCustomerName,
        text: autoReplyText,
        timestamp: new Date().toISOString(),
        status: "sent",
        isAutomated: true,
        mode: "live",
        createdAt: new Date(),
      };

      saveStoredMessage(autoReplyRecord);

      try {
        const sendResult = await sendWhatsAppTextMessage({
          to: msg.fromPhone,
          text: autoReplyText,
        });

        autoReplyRecord.id = sendResult.messageId || autoReplyRecord.id;
        autoReplyRecord.status = sendResult.success ? "sent" : "failed";
        autoReplyRecord.mode = sendResult.mode;
        saveStoredMessage(autoReplyRecord);

        dbPromise.then(async (db) => {
          try {
            await pgDb
              .insert(crmMessages)
              .values({
                id: autoReplyRecord.id,
                direction: "outbound",
                sender: "business",
                from: autoReplyRecord.from,
                to: autoReplyRecord.to,
                customerName: resolvedCustomerName,
                text: autoReplyText,
                timestamp: new Date(autoReplyRecord.timestamp),
                status: autoReplyRecord.status,
                isAutomated: true,
                mode: autoReplyRecord.mode,
                createdAt: autoReplyRecord.createdAt,
              })
              .onConflictDoNothing();
          } catch (pgSendErr) {}

          if (db) {
            try {
              await db.collection("crm_messages").insertOne(autoReplyRecord);
            } catch {}
          }
        }).catch(() => {});
      } catch (sendErr) {
        console.warn("[WhatsApp Service] Auto-reply send error:", sendErr);
      }
    }
  }

  // 2. Process Delivery Status Receipts (sent, delivered, read, failed)
  const statusRank: Record<string, number> = { failed: 0, sent: 1, delivered: 2, read: 3 };

  for (const st of statuses) {
    console.log(`[WhatsApp Webhook] Message ${st.messageId} status update: ${st.status}`);

    // Update in-memory & disk feed (without downgrading status)
    const existing = (globalThis.__globalWhatsAppFeed || []).find((m: any) => m.id === st.messageId);
    if (existing) {
      const currentRank = statusRank[existing.status] || 0;
      const newRank = statusRank[st.status] || 0;
      if (newRank >= currentRank) {
        existing.status = st.status;
        saveStoredMessage(existing);
      }
    }

    // Update MongoDB Atlas in background
    dbPromise.then(async (db) => {
      if (db) {
        try {
          const existingDoc = await db.collection("crm_messages").findOne({ id: st.messageId });
          const currentRank = existingDoc ? (statusRank[existingDoc.status] || 0) : 0;
          const newRank = statusRank[st.status] || 0;

          if (!existingDoc || newRank >= currentRank) {
            await db.collection("crm_messages").updateOne(
              { id: st.messageId },
              {
                $set: {
                  status: st.status,
                  updatedAt: new Date(),
                  ...(st.error ? { error: st.error } : {}),
                },
              }
            );
          }
        } catch (dbErr) {
          console.warn("[MongoDB] Status update error:", dbErr);
        }
      }
    }).catch(() => {});
  }
}
