import { NextRequest, NextResponse } from "next/server.js";
import {
  verifyWebhookSignature,
  parseInboundWebhookPayload,
  getWhatsAppIntegrationStatus,
  sendWhatsAppTextMessage,
  processConversationalBotReply,
} from "../../../../backend/lib/whatsapp.server.ts";
import { processSmartCustomerReply } from "../../../../backend/lib/smart-assistant.server.ts";
import { evaluateWhatsAppOrderWorkflow } from "../../../../backend/lib/whatsapp-order-service.server.ts";
import { getDatabase } from "../../../../lib/mongodb.ts";
import { db as pgDb, isPostgresAvailable } from "../../../../backend/db.ts";
import { crmMessages } from "../../../../backend/schema/crm.ts";
import { eq, or, ilike } from "drizzle-orm";
import {
  saveStoredMessage,
  resurrectContact,
  getStoredMessages,
} from "../../../../backend/lib/crm-store.server.ts";
import { safeCompare } from "../../../../backend/lib/server-auth.ts";
import { enforceRateLimit, RATE_LIMIT_TIERS } from "../../../../backend/lib/distributed-rate-limiter.ts";

export const dynamic = "force-dynamic";

// Webhook messages in-memory store for CRM real-time feed
declare global {
  // eslint-disable-next-line no-var
  var __globalWhatsAppFeed: any[] | undefined;
  // eslint-disable-next-line no-var
  var __dispatchedAutoReplyMsgIds: Set<string> | undefined;
}

if (!globalThis.__globalWhatsAppFeed) {
  globalThis.__globalWhatsAppFeed = [];
}
if (!globalThis.__dispatchedAutoReplyMsgIds) {
  globalThis.__dispatchedAutoReplyMsgIds = new Set();
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
    const rateLimitResponse = await enforceRateLimit(req, RATE_LIMIT_TIERS.webhook);
    if (rateLimitResponse) return rateLimitResponse;

    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    const isTestRunner = process.env.NODE_ENV === "test" || process.env.TEST_MODE === "true" || process.env.npm_lifecycle_event === "test";
    const isProduction = process.env.NODE_ENV === "production" && !isTestRunner;
    const internalSource = req.headers.get("x-crm-source") === "internal-test";
    const adminKey = req.headers.get("x-admin-key") || req.headers.get("x-admin-secret");
    const configuredSecret = (process.env.ADMIN_API_SECRET || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "").trim();

    // In production, internal test bypass requires verified admin authentication
    const isAuthorizedInternalTest =
      internalSource &&
      (!isProduction || (Boolean(configuredSecret) && typeof adminKey === "string" && safeCompare(adminKey, configuredSecret)));

    // 1. Verify Meta signature (or permit authenticated internal dashboard webhook tests)
    if (!isAuthorizedInternalTest && !verifyWebhookSignature(rawBody, signature)) {
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
    const startTime = Date.now();
    await handleWebhookProcessing(messages, statuses, reqHost);
    const duration = Date.now() - startTime;

    // Structured Diagnostic Log for observability
    const maskedSender = messages[0]?.fromPhone
      ? messages[0].fromPhone.slice(0, 4) + "****" + messages[0].fromPhone.slice(-3)
      : "N/A";
    console.log(JSON.stringify({
      event: "WHATSAPP_WEBHOOK_PROCESSED",
      timestamp: new Date().toISOString(),
      type: messages.length > 0 ? "inbound_message" : (statuses.length > 0 ? "delivery_status" : "other"),
      phoneId: messages[0]?.businessPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || "1395630476965721",
      senderMasked: maskedSender,
      messageId: messages[0]?.id || statuses[0]?.messageId || "N/A",
      messagesCount: messages.length,
      statusesCount: statuses.length,
      durationMs: duration,
      host: reqHost,
      status: "SUCCESS"
    }));

    // Cross-sync forwarding removed: both deployments share MongoDB Atlas, preventing duplicate webhook execution.

    if (isAuthorizedInternalTest || req.headers.get("accept")?.includes("application/json")) {
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

  // Fast background database connection (non-blocking if unavailable)
  let db: any = null;
  try {
    db = await Promise.race([
      getDatabase(),
      new Promise((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
  } catch (dbInitErr) {
    console.warn("[WhatsApp Webhook] Database init note:", dbInitErr);
  }

  // 1. Process Inbound Customer Messages & Trigger Automated Reply
  for (const msg of messages) {
    if (!msg.id) continue;

    // Idempotency: Check in-memory feed first
    const isAlreadyInFeed = (globalThis.__globalWhatsAppFeed || []).some((m: any) => m.id === msg.id);
    if (isAlreadyInFeed) {
      console.log(`[WhatsApp Webhook] Idempotency: Message ${msg.id} already in feed. Skipping.`);
      continue;
    }

    // Secondary database idempotency check to prevent duplicate processing across serverless instances
    if (db) {
      try {
        const existingDoc = await db.collection("crm_messages").findOne({ id: msg.id });
        if (existingDoc) {
          console.log(`[WhatsApp Webhook] Idempotency: Message ${msg.id} already exists in DB. Skipping duplicate processing.`);
          continue;
        }
      } catch (dbCheckErr) {
        console.warn("[WhatsApp Webhook] Idempotency DB check note:", dbCheckErr);
      }
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

    // 1. Evaluate dedicated WhatsApp Order Creation Workflow
    let orderWorkflowResult: any = null;
    if (!isAdminSender && !isOutboundFromPhone) {
      try {
        orderWorkflowResult = await evaluateWhatsAppOrderWorkflow({
          customerPhone: msg.fromPhone,
          customerText: msg.text,
          customerName: msg.customerName,
          messageId: msg.id,
          reqHost,
        });

        if (orderWorkflowResult?.isOrderWorkflow && fromClean) {
          globalThis.__crmHumanTakeoverSessions?.delete(fromClean);
        }
      } catch (orderEvalErr) {
        console.warn("[WhatsApp Webhook] Order workflow evaluation note:", orderEvalErr);
      }
    }

    // 2. Fallback to smart assistant engine if message is not an active order workflow
    const botResult = (!isAdminSender && !isOutboundFromPhone)
      ? (orderWorkflowResult?.isOrderWorkflow && orderWorkflowResult.replyText
          ? {
              replyText: orderWorkflowResult.replyText,
              shouldSend: true,
              intent: "order_placement" as any,
              updatedCustomerName: msg.customerName,
            }
          : await processSmartCustomerReply({
              customerPhone: msg.fromPhone,
              customerText: msg.text,
              customerName: msg.customerName,
              reqHost,
            }))
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

    // 2. Persist to PostgreSQL if configured & available
    if (isPostgresAvailable()) {
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
    }

    // 3. Persist to MongoDB Atlas
    if (db) {
      try {
        await db.collection("crm_messages").updateOne(
          { id: inboundRecord.id },
          { $setOnInsert: inboundRecord },
          { upsert: true }
        );

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

    // Automated customer bot reply if message is NOT from the store admin
    if (!isAdminSender && !isOutboundFromPhone && botResult && botResult.shouldSend && botResult.replyText) {
      // In-memory check: Ensure only one auto-reply per message ID in the current process
      if (globalThis.__dispatchedAutoReplyMsgIds?.has(msg.id)) {
        console.log(`[WhatsApp Webhook] In-memory auto-reply lock: Already replied to ${msg.id}. Skipping.`);
        continue;
      }

      // MongoDB atomic lock: Guarantees exactly-once execution across serverless lambdas and retries
      let isReplyLocked = false;
      if (db) {
        try {
          const lockResult = await db.collection("crm_auto_reply_locks").updateOne(
            { _id: msg.id },
            { $setOnInsert: { msgId: msg.id, createdAt: new Date() } },
            { upsert: true }
          );
          if (lockResult.matchedCount > 0) {
            isReplyLocked = true;
            console.log(`[WhatsApp Webhook] Database atomic lock: Auto-reply already dispatched for message ${msg.id}. Skipping duplicate send.`);
          }
        } catch (lockErr) {
          console.warn("[WhatsApp Webhook] Auto-reply lock check note:", lockErr);
        }
      }

      if (isReplyLocked) {
        continue;
      }

      globalThis.__dispatchedAutoReplyMsgIds?.add(msg.id);

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
        }

        if (db) {
          try {
            await db.collection("crm_messages").updateOne(
              { id: autoReplyRecord.id },
              { $setOnInsert: autoReplyRecord },
              { upsert: true }
            );
          } catch {}
        }
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

    // Update MongoDB Atlas
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
  }
}
