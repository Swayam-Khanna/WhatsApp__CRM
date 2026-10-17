import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  parseInboundWebhookPayload,
  getWhatsAppIntegrationStatus,
  sendWhatsAppTextMessage,
  generateAutomatedCustomerReply,
} from "../../../../backend/lib/whatsapp.server.ts";
import { getDatabase } from "@/lib/mongodb";

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

    // 1. Verify Meta signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[WhatsApp Webhook] Invalid signature rejected.");
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // 2. Parse inbound messages and delivery receipts
    const { messages, statuses } = parseInboundWebhookPayload(payload);

    if (!globalThis.__globalWhatsAppFeed) {
      globalThis.__globalWhatsAppFeed = [];
    }

    let db: any = null;
    try {
      db = await getDatabase();
    } catch (dbErr) {
      console.warn("[MongoDB] Note: Operating in memory fallback:", dbErr);
    }

    // 3. Process each inbound customer message & trigger instant automated response
    for (const msg of messages) {
      console.log(`[WhatsApp Webhook] Inbound from ${msg.fromPhone}: ${msg.text}`);

      const inboundRecord = {
        id: msg.id,
        direction: "inbound",
        sender: "customer",
        from: msg.fromPhone,
        to: "917650065690",
        customerName: msg.customerName || "Customer",
        text: msg.text,
        timestamp: msg.timestamp,
        status: "delivered",
        createdAt: new Date(),
      };

      globalThis.__globalWhatsAppFeed.unshift(inboundRecord);

      if (db) {
        try {
          await db.collection("crm_messages").insertOne(inboundRecord);
        } catch (e) {
          console.warn("[MongoDB] Failed to persist inbound msg:", e);
        }
      }

      // Automatically construct tailored Prajnaa automated reply (No manual typing, no template needed)
      const autoReplyText = generateAutomatedCustomerReply({
        customerName: msg.customerName,
        customerQuery: msg.text,
      });

      console.log(`[WhatsApp Webhook] Auto-replying to ${msg.fromPhone}...`);
      const sendResult = await sendWhatsAppTextMessage({
        to: msg.fromPhone,
        text: autoReplyText,
      });

      const autoReplyRecord = {
        id: sendResult.messageId || `msg_auto_${Date.now()}`,
        direction: "outbound",
        sender: "business",
        from: "917650065690",
        to: msg.fromPhone,
        customerName: msg.customerName || "Customer",
        text: autoReplyText,
        timestamp: new Date().toISOString(),
        status: "sent",
        isAutomated: true,
        mode: sendResult.mode,
        whatsappUrl: sendResult.whatsappUrl || null,
        createdAt: new Date(),
      };

      globalThis.__globalWhatsAppFeed.unshift(autoReplyRecord);

      if (db) {
        try {
          await db.collection("crm_messages").insertOne(autoReplyRecord);
        } catch (e) {
          console.warn("[MongoDB] Failed to persist auto-reply msg:", e);
        }
      }
    }

    // Process delivery status updates (sent, delivered, read, failed)
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

    // Return 200 OK immediately as required by Meta webhook contract
    return NextResponse.json({
      status: "EVENT_RECEIVED",
      processedMessages: messages.length,
      autoRepliesSent: messages.length,
    });
  } catch (err: any) {
    console.error("[WhatsApp Webhook] Error processing event:", err);
    return NextResponse.json({ error: err.message || "Webhook processing failed" }, { status: 500 });
  }
}
