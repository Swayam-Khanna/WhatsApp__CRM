import { NextRequest, NextResponse } from "next/server.js";
import {
  verifyWebhookSignature,
  parseInboundWebhookPayload,
  getWhatsAppIntegrationStatus,
  sendWhatsAppTextMessage,
  generateAutomatedCustomerReply,
  processConversationalBotReply,
} from "../../../../backend/lib/whatsapp.server.ts";
import { getDatabase } from "../../../../lib/mongodb.ts";

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
    return NextResponse.json({
      status: "WhatsApp Webhook Listener Active",
      endpoint: "/api/webhooks/whatsapp",
      health,
    });
  }

  return new Response("Forbidden", { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp
 * Receives inbound customer messages and delivery receipts from Meta WhatsApp Cloud API.
 * Automatically dispatches instant, template-free replies back to the customer.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    const isInternalTest = req.headers.get("x-crm-source") === "internal-test";

    // 1. Verify Meta signature (or permit authenticated internal dashboard webhook tests)
    if (!isInternalTest && !verifyWebhookSignature(rawBody, signature)) {
      console.warn("[WhatsApp Webhook] Invalid signature rejected.");
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // 2. Parse inbound messages and delivery receipts
    const { messages, statuses } = parseInboundWebhookPayload(payload);

    // 3. Process asynchronously in background (Ack immediately to prevent Meta timeout/retries)
    void handleWebhookProcessing(messages, statuses);

    if (isInternalTest || req.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({
        success: true,
        status: "EVENT_RECEIVED",
        message: "Test webhook payload received and processed successfully",
        receivedAt: new Date().toISOString(),
      });
    }

    return new Response("EVENT_RECEIVED", { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch (err: any) {
    console.error("[WhatsApp Webhook] Error processing event:", err);
    return NextResponse.json({ error: err.message || "Webhook processing failed" }, { status: 500 });
  }
}

async function handleWebhookProcessing(messages: any[], statuses: any[]) {
  if (!globalThis.__globalWhatsAppFeed) {
    globalThis.__globalWhatsAppFeed = [];
  }

  // 1. Process inbound customer messages & trigger automated reply with 0ms in-memory latency
  for (const msg of messages) {
    if (!msg.id) continue;
    const isAlreadyInFeed = (globalThis.__globalWhatsAppFeed || []).some((m: any) => m.id === msg.id);
    if (isAlreadyInFeed) {
      console.log(`[WhatsApp Webhook] Idempotency: Message ${msg.id} already processed. Skipping duplicate.`);
      continue;
    }

    console.log(`[WhatsApp Webhook] Inbound from ${msg.fromPhone}: ${msg.text}`);

    const adminPhone = (process.env.ADMIN_WHATSAPP_NUMBER || "918091265690").replace(/\D/g, "").slice(-10);
    const fromClean = (msg.fromPhone || "").replace(/\D/g, "").slice(-10);
    const isAdminSender = fromClean === adminPhone;

    // Check conversational bot reply & detect any customer name
    const botResult = !isAdminSender
      ? processConversationalBotReply({
          senderPhone: msg.fromPhone,
          senderText: msg.text,
          existingCustomerName: msg.customerName,
        })
      : null;

    const resolvedCustomerName =
      botResult?.updatedCustomerName ||
      msg.customerName ||
      (isAdminSender ? "Store Admin" : "Customer");

    // If an updated name was captured, propagate to past messages in memory
    if (botResult?.updatedCustomerName && fromClean) {
      (globalThis.__globalWhatsAppFeed || []).forEach((m: any) => {
        const mFrom = (m.from || "").replace(/\D/g, "").slice(-10);
        const mTo = (m.to || "").replace(/\D/g, "").slice(-10);
        if (mFrom === fromClean || mTo === fromClean) {
          m.customerName = botResult.updatedCustomerName;
        }
      });
    }

    const inboundRecord = {
      id: msg.id,
      direction: "inbound",
      sender: "customer",
      from: msg.fromPhone,
      to: process.env.ADMIN_WHATSAPP_NUMBER || "918091265690",
      customerName: resolvedCustomerName,
      text: msg.text,
      timestamp: msg.timestamp || new Date().toISOString(),
      status: "delivered",
      createdAt: new Date(),
    };

    // Unshift to memory feed immediately so CRM UI picks it up without waiting for DB
    globalThis.__globalWhatsAppFeed.unshift(inboundRecord);

    // Only dispatch automated customer bot reply if message is NOT from the store admin
    if (!isAdminSender && botResult) {
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

      globalThis.__globalWhatsAppFeed.unshift(autoReplyRecord);

      // Dispatch via Meta WhatsApp Cloud API asynchronously
      void sendWhatsAppTextMessage({
        to: msg.fromPhone,
        text: autoReplyText,
      }).then(async (sendResult) => {
        autoReplyRecord.id = sendResult.messageId || autoReplyRecord.id;
        autoReplyRecord.status = sendResult.success ? "sent" : "failed";
        autoReplyRecord.mode = sendResult.mode;

        try {
          const db = await getDatabase();
          if (db) {
            await db.collection("crm_messages").insertOne(autoReplyRecord);
          }
        } catch {}
      });
    }

    // Persist inbound record to MongoDB Atlas in background without blocking
    void getDatabase().then(async (db) => {
      if (db) {
        try {
          await db.collection("crm_messages").insertOne(inboundRecord);
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
        } catch (e) {
          console.warn("[MongoDB] Failed to persist inbound msg:", e);
        }
      }
    }).catch(() => {});
  }

  // 2. Process delivery status updates (sent, delivered, read, failed)
  for (const st of statuses) {
    console.log(`[WhatsApp Webhook] Message ${st.messageId} status: ${st.status}`);
    const existing = globalThis.__globalWhatsAppFeed.find((m) => m.id === st.messageId);
    if (existing) {
      existing.status = st.status;
    }
    if (db) {
      try {
        await db.collection("crm_messages").updateOne(
          { id: st.messageId },
          { $set: { status: st.status, updatedAt: new Date() } }
        );
      } catch {}
    }
  }
}
