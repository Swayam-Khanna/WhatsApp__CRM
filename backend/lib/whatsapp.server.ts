import crypto from "crypto";

export interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  recipientPhone: string;
  mode: "cloud_api" | "direct_link_fallback";
  whatsappUrl?: string;
  error?: string;
}

export interface WhatsAppStatusUpdate {
  messageId: string;
  recipientPhone: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  error?: string;
}

export interface InboundWhatsAppMessage {
  id: string;
  fromPhone: string;
  customerName?: string;
  text: string;
  timestamp: string;
  type: "text" | "interactive" | "image" | "document";
}

/**
 * Returns current configuration status of WhatsApp Business Platform.
 */
export function getWhatsAppIntegrationStatus() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const businessPhone = process.env.WHATSAPP_BUSINESS_PHONE || process.env.ADMIN_WHATSAPP_NUMBER || "917650065690";

  const isConfigured = Boolean(token && phoneId);

  return {
    isConfigured,
    businessPhone: businessPhone.replace(/\D/g, ""),
    formattedPhone: "+91 76500 65690",
    phoneNumberId: phoneId || null,
    verifyTokenConfigured: Boolean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
    appSecretConfigured: Boolean(process.env.WHATSAPP_APP_SECRET),
    mode: isConfigured ? ("cloud_api" as const) : ("direct_link_fallback" as const),
    statusNote: isConfigured
      ? "Official WhatsApp Cloud API active & authenticated"
      : "Staging Mode: Connected via verified direct business link (+91 76500 65690) with simulated cloud webhooks",
  };
}

/**
 * Validates Meta x-hub-signature-256 header.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader?: string | null, customSecret?: string): boolean {
  const secret = customSecret || process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // In staging without app secret, permit verification

  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const signature = signatureHeader.substring(7);
  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const sigBuf = Buffer.from(signature, "hex");
    const hmacBuf = Buffer.from(hmac, "hex");
    if (sigBuf.length !== hmacBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, hmacBuf);
  } catch {
    return false;
  }
}

/**
 * Sends an outbound WhatsApp text message via Cloud API or staging fallback.
 */
export async function sendWhatsAppTextMessage(params: {
  to: string;
  text: string;
}): Promise<WhatsAppMessageResult> {
  const cleanTo = params.to.replace(/\D/g, "");
  const formattedTo = cleanTo.length === 10 ? `91${cleanTo}` : cleanTo;

  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (phoneId && token) {
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedTo,
          type: "text",
          text: { preview_url: false, body: params.text },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "WhatsApp API request failed");
      }

      const messageId = data.messages?.[0]?.id || `wamid_${Date.now()}`;
      return {
        success: true,
        messageId,
        recipientPhone: formattedTo,
        mode: "cloud_api",
      };
    } catch (err: any) {
      console.warn("[WhatsApp Service] Cloud API send failed, using fallback:", err.message);
    }
  }

  // Fallback: Generate valid pre-filled WhatsApp link
  const whatsappUrl = `https://wa.me/${formattedTo}?text=${encodeURIComponent(params.text)}`;
  return {
    success: true,
    messageId: `wamid_sim_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
    recipientPhone: formattedTo,
    mode: "direct_link_fallback",
    whatsappUrl,
  };
}

/**
 * Builds standard Prajnaa Market Order Confirmation Message.
 */
export function buildOfficialOrderConfirmationMessage(order: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: Array<{ productName: string; variantName?: string | null; quantity: number; unitPricePaise: number }>;
  subtotalPaise: number;
  shippingPaise: number;
  discountPaise: number;
  totalPaise: number;
  paymentMethod: string;
  shippingAddressSnapshot: any;
}): string {
  const formatInr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

  const itemLines = order.items.map(
    (it) =>
      `• *${it.productName}*${it.variantName ? ` (${it.variantName})` : ""} × ${it.quantity} — ${formatInr(
        it.unitPricePaise * it.quantity
      )}`
  );

  const snap = order.shippingAddressSnapshot || {};
  const addressLine = [snap.line1 || snap.addressLine1, snap.city, snap.state, snap.postalCode]
    .filter(Boolean)
    .join(", ");

  const lines = [
    `Namaste ${order.customerName} ji! 🙏`,
    `Thank you for ordering with *Prajnaa Market*.`,
    ``,
    `🌾 *Order #${order.orderNumber}*`,
    `--------------------------------`,
    ...itemLines,
    `--------------------------------`,
    `*Subtotal:* ${formatInr(order.subtotalPaise)}`,
    order.discountPaise > 0 ? `*Discount:* -${formatInr(order.discountPaise)}` : null,
    `*India Post Delivery:* ${formatInr(order.shippingPaise)}`,
    `*Total Payable:* ${formatInr(order.totalPaise)}`,
    ``,
    `*Payment Status:* Awaiting Payment Confirmation`,
    `*Delivery To:* ${addressLine}`,
    ``,
    `Ji, hum aapka order process kar rahe hain. Prajnaa Market mein pure natural produce packaging mein 2–3 din lagte hain. Packing complete hone par Speed Post tracking share ki jayegi.`,
    ``,
    `Aap payment screenshot aur order updates ke liye isi WhatsApp par reply kar sakte hain.`,
    ``,
    `Dhanyavaad ji! 🌿`,
    `*Team Prajnaa Market*`,
  ].filter((l): l is string => l !== null);

  return lines.join("\n");
}

/**
 * Builds official India Post Speed Post Dispatch notification.
 */
export function buildSpeedPostDispatchMessage(params: {
  customerName: string;
  orderNumber: string;
  trackingId: string;
  deliveryCity: string;
}): string {
  return [
    `Namaste ${params.customerName} ji! 📦`,
    ``,
    `Aapka Prajnaa Market order *${params.orderNumber}* dispatch ho gaya hai!`,
    ``,
    `🚚 *Consignment Tracking:*`,
    `• India Post Speed Post: *${params.trackingId}*`,
    `• Destination Hub: ${params.deliveryCity}`,
    `• Dispatch Center: Dehradun MDG, Uttarakhand`,
    ``,
    `Aap live tracking India Post ke official portal par dekh sakte hain:`,
    `https://www.indiapost.gov.in/_layouts/15/dpt.cptc.va/trackconsignment.aspx`,
    ``,
    `Dhanyavaad ji! 🌿`,
    `*Team Prajnaa Market*`,
  ].join("\n");
}

/**
 * Parses inbound webhook event from Meta WhatsApp Cloud API.
 */
export function parseInboundWebhookPayload(payload: any): {
  messages: InboundWhatsAppMessage[];
  statuses: WhatsAppStatusUpdate[];
} {
  const messages: InboundWhatsAppMessage[] = [];
  const statuses: WhatsAppStatusUpdate[] = [];

  try {
    const entry = payload?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) return { messages, statuses };

    // Process Inbound Messages
    if (Array.isArray(value.messages)) {
      const contacts = value.contacts || [];
      const contactName = contacts[0]?.profile?.name;

      for (const msg of value.messages) {
        let textContent = "";
        if (msg.type === "text") {
          textContent = msg.text?.body || "";
        } else if (msg.type === "interactive") {
          textContent = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "";
        } else {
          textContent = `[${msg.type.toUpperCase()} Attachment]`;
        }

        messages.push({
          id: msg.id,
          fromPhone: msg.from,
          customerName: contactName,
          text: textContent,
          timestamp: new Date(Number(msg.timestamp) * 1000).toISOString(),
          type: msg.type,
        });
      }
    }

    // Process Message Status Receipts (sent, delivered, read, failed)
    if (Array.isArray(value.statuses)) {
      for (const st of value.statuses) {
        statuses.push({
          messageId: st.id,
          recipientPhone: st.recipient_id,
          status: st.status,
          timestamp: new Date(Number(st.timestamp) * 1000).toISOString(),
          error: st.errors?.[0]?.message,
        });
      }
    }
  } catch (err) {
    console.error("[WhatsApp Webhook] Parse error:", err);
  }

  return { messages, statuses };
}
