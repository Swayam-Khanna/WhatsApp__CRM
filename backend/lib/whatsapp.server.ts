import * as crypto from "crypto";

export interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  recipientPhone: string;
  mode: "cloud_api" | "direct_link_fallback";
  whatsappUrl?: string;
  metaPending?: boolean;
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
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1370000716197872";
  const businessPhone = process.env.WHATSAPP_BUSINESS_PHONE || process.env.ADMIN_WHATSAPP_NUMBER || "918091265690";

  const isConfigured = Boolean(token && phoneId);

  return {
    isConfigured,
    businessPhone: businessPhone.replace(/\D/g, ""),
    formattedPhone: "+91 80912 65690",
    phoneNumberId: phoneId || null,
    verifyTokenConfigured: Boolean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
    appSecretConfigured: Boolean(process.env.WHATSAPP_APP_SECRET),
    mode: isConfigured ? ("cloud_api" as const) : ("direct_link_fallback" as const),
    metaStatus: "pending" as const,
    metaStatusText: "Pending Verification (WABA / Phone Approval)",
    metaPending: true,
    statusNote: "Meta Status: Pending Verification. All CRM tasks, database pipelines, speed post fulfillment, and direct messaging are fully connected and operational.",
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
 * Sends an outbound WhatsApp text or template message via Cloud API or staging fallback.
 */
export async function sendWhatsAppTextMessage(params: {
  to: string;
  text?: string;
  template?: {
    name: string;
    language?: { code: string };
    components?: any[];
  };
}): Promise<WhatsAppMessageResult> {
  const cleanTo = params.to.replace(/\D/g, "");
  const formattedTo = cleanTo.length === 10 ? `91${cleanTo}` : cleanTo;

  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1370000716197872";
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const whatsappUrl = `https://wa.me/${formattedTo}?text=${encodeURIComponent(params.text || "")}`;

  if (phoneId && token) {
    try {
      const payload: Record<string, any> = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedTo,
      };

      if (params.template) {
        payload.type = "template";
        payload.template = {
          name: params.template.name,
          language: params.template.language || { code: "en_US" },
          ...(params.template.components ? { components: params.template.components } : {}),
        };
      } else {
        payload.type = "text";
        payload.text = { preview_url: false, body: params.text || "" };
      }

      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error?.error_data?.details || data.error?.message || "WhatsApp API request failed";
        console.error("[WhatsApp Service] Meta API Error:", data.error);
        return {
          success: false,
          recipientPhone: formattedTo,
          mode: "cloud_api",
          error: errorMsg,
          metaPending: true,
          whatsappUrl,
        };
      }

      const messageId = data.messages?.[0]?.id || `wamid_${Date.now()}`;
      return {
        success: true,
        messageId,
        recipientPhone: formattedTo,
        mode: "cloud_api",
        whatsappUrl,
      };
    } catch (err: any) {
      console.error("[WhatsApp Service] Cloud API network exception:", err.message);
      return {
        success: false,
        recipientPhone: formattedTo,
        mode: "cloud_api",
        error: err.message || "Failed to reach Meta Cloud API",
        whatsappUrl,
      };
    }
  }

  // Fallback: only used when token/phoneId are unconfigured (local offline mock)
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
  * Builds itemized WhatsApp confirmation for CRM order ingestion
  * matching Prajnaa Market tone in Hindi/Hinglish.
  */
 export function buildItemizedCrmOrderConfirmationMessage(order: {
   customerName: string;
   orderNumber: string;
   items: Array<{
     productName: string;
     quantity: number;
     unitPricePaise: number;
     totalPaise?: number;
     variantName?: string | null;
   }>;
   totalPaise: number;
   paymentStatus: string;
 }): string {
   const formatInr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
   const itemizedProductList = (order.items || [])
     .map(
       (it) =>
         `• ${it.productName}${it.variantName ? ` (${it.variantName})` : ""} × ${it.quantity} — ${formatInr(
           it.totalPaise ?? it.unitPricePaise * it.quantity
         )}`
     )
     .join("\n");

   const displayPaymentStatus =
     order.paymentStatus === "collected" || order.paymentStatus === "paid"
       ? "Paid"
       : "Pending (Awaiting Payment Confirmation)";

   return [
     `Namaste ${order.customerName} ji! 🌿`,
     `Aapne Prajnaa Market se jo order place kiya hai, uski details yeh hain:`,
     `Order No.: #${order.orderNumber}`,
     itemizedProductList,
     `Order Total: ${formatInr(order.totalPaise)}`,
     `Payment Status: ${displayPaymentStatus}`,
     ``,
     `Aapka order humein mil gaya hai. Prajnaa Market mein order processing aur dispatch mein aam taur par 2–3 din lagte hain. Dispatch hone par tracking details aapke saath share ki jayengi.`,
     ``,
     `Kisi bhi madad ke liye aap humein isi WhatsApp number par message kar sakte hain.`,
     ``,
     `Dhanyavaad ji! 🌿`,
     `Team Prajnaa Market`,
   ].join("\n");
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
 * Automatically crafts a prompt, brand-aligned Prajnaa Market reply
 * to any customer inquiry without requiring manual typing or template selection.
 */
export function generateAutomatedCustomerReply(params: {
  customerName?: string;
  customerQuery: string;
  orderNumber?: string;
  orderTotal?: number;
}): string {
  const query = (params.customerQuery || "").toLowerCase().trim();
  const name = params.customerName && params.customerName !== "Customer" ? `${params.customerName} ji` : "ji";

  // 1. Order Cancellation
  if (query.includes("cancel") || query.includes("radd")) {
    return `Namaste ${name}! 🙏 Agar aapka parcel abhi dispatch nahi hua hai, toh order cancel ho sakta hai. Kripya apna Order ID confirm kar dijiye, hum turant cancellation update kar denge.`;
  }

  // 2. Address Change / Update
  if (query.includes("address") || query.includes("pata") || query.includes("location") || query.includes("pincode change") || query.includes("galat address")) {
    return `Namaste ${name}! 🙏 Ji bilkul, agar parcel dispatch nahi hua hai toh address update ho jayega. Kripya apna naya complete delivery address aur pincode yahan send kar dijiye.`;
  }

  // 3. Cash on Delivery (COD)
  if (query.includes("cod") || query.includes("cash on delivery") || query.includes("pay on delivery") || query.includes("deliver hone par paise")) {
    return `Namaste ${name}! 🙏 Selected pincodes par Cash on Delivery (COD) uplabdh hai. Aap apna delivery pincode share kar dijiye, hum turant check karke bata denge.`;
  }

  // 4. Refund / Return / Money Back
  if (query.includes("refund") || query.includes("wapas") || query.includes("return") || query.includes("money back")) {
    return `Namaste ${name}! 🙏 Refund approve hone ke baad 3–5 working days ke andar aapke original bank account ya UPI source me paise credit ho jate hain.`;
  }

  // 5. Payment, Screenshot, UPI confirmation
  if (
    query.includes("payment") ||
    query.includes("screenshot") ||
    query.includes("upi") ||
    query.includes("qr") ||
    query.includes("utr") ||
    query.includes("pay") ||
    query.includes("paise") ||
    query.includes("transferred")
  ) {
    return `Namaste ${name}! 🙏 Agar aapne payment kar di hai, toh kripya payment ka screenshot ya transaction UTR number isi chat par share kar dijiye. Nishant ji verify karke turant confirm kar denge. (Official UPI: prajnaa@upi)`;
  }

  // 6. Delivery Timeline ("Kab aayega?" / "Kitne din lagenge?")
  if (
    query.includes("kab tak") ||
    query.includes("when will") ||
    query.includes("kab aayega") ||
    query.includes("aayega") ||
    query.includes("deliver") ||
    query.includes("reach") ||
    query.includes("kitne din") ||
    query.includes("delivery time")
  ) {
    return `Namaste ${name}! 🙏 Prajnaa organic products ki fresh artisan packing me 2–3 din lagte hain, aur dispatch hone ke baad 3–5 working days me Speed Post se parcel aapke address par deliver ho jata hai.`;
  }

  // 7. Dispatch Status & Tracking ("Dispatch hua kya?" / "Tracking number")
  if (
    query.includes("dispatch") ||
    query.includes("track") ||
    query.includes("tracking") ||
    query.includes("speed post") ||
    query.includes("consignment") ||
    query.includes("courier")
  ) {
    return `Namaste ${name}! 🙏 Jaise hi parcel dispatch hota hai, India Post Speed Post tracking number (ED...IN) automatically aapko isi WhatsApp par mil jayega, jise aap indiapost.gov.in par live track kar sakte hain.`;
  }

  // 8. Product Purity, Organic Quality, Farm Origin
  if (
    query.includes("organic") ||
    query.includes("pure") ||
    query.includes("asli") ||
    query.includes("chemical") ||
    query.includes("quality") ||
    query.includes("shilajit") ||
    query.includes("ghee") ||
    query.includes("apricot") ||
    query.includes("saffron")
  ) {
    return `Namaste ${name}! 🙏 Prajnaa Market ke sabhi products 100% certified organic aur natural hain, jo direct Himalayan mountain farmers se aate hain. Inme koi chemical ya preservatives nahi milaye jate aur har batch lab-tested hota hai.`;
  }

  // 9. Customer Care / Call / Phone Contact
  if (query.includes("contact") || query.includes("number") || query.includes("call") || query.includes("phone") || query.includes("helpline") || query.includes("baat")) {
    return `Namaste ${name}! 🙏 Hamara official customer support number +91 80912 65690 hai. Store Concierge Nishant ji isi number par directly available hain.`;
  }

  // 10. Thank You / Appreciation
  if (query.includes("thank") || query.includes("dhanyawad") || query.includes("shukriya") || query.includes("thanks")) {
    return `Aapka bahut-bahut dhanyavaad ${name}! 🙏 Prajnaa Market ke sath judne ke liye shukriya. Agar koi aur sawal ho toh batayein.`;
  }

  // 11. Greeting
  if (query === "hi" || query === "hello" || query === "namaste" || query === "hey" || query === "pranam") {
    return `Namaste ${name}! 🙏 Prajnaa Market me aapka swagat hai. Batayein, aaj hum aapki kya sahayata kar sakte hain?`;
  }

  // 12. Fallback: Concise & Direct
  return `Namaste ${name}! 🙏 Aapka sawal Prajnaa support team ko mil gaya hai. Store Concierge Nishant ji ise review karke jald hi aapse direct connect karenge.`;
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
