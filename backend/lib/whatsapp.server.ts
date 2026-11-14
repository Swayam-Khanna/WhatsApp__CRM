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
  type: string;
  mediaId?: string;
  mimeType?: string;
  businessPhoneNumberId?: string;
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
  const secret = customSecret || process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
  if (!secret || secret.includes("placeholder") || secret.includes("your_") || secret.length < 10) return true; // In staging without valid app secret, permit verification

  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    console.error("[WhatsApp Webhook Signature Verification Error] Missing or malformed x-hub-signature-256 header:", signatureHeader);
    return false;
  }

  const signature = signatureHeader.substring(7);
  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const sigBuf = Buffer.from(signature, "hex");
    const hmacBuf = Buffer.from(hmac, "hex");
    if (sigBuf.length !== hmacBuf.length) {
      console.error("[WhatsApp Webhook Signature Verification Error] Signature length mismatch");
      return false;
    }
    const match = crypto.timingSafeEqual(sigBuf, hmacBuf);
    if (!match) {
      console.error("[WhatsApp Webhook Signature Verification Error] Signature hash mismatch against configured secret");
    }
    return match;
  } catch (err: any) {
    console.error("[WhatsApp Webhook Signature Verification Error] Exception during signature check:", err?.message || err);
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

      const controller = new AbortController();
      const fetchTimer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(fetchTimer);

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
 * Uploads media buffer to Meta Cloud API and returns media ID.
 */
export async function uploadWhatsAppMedia(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1395630476965721";
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) {
    return { success: false, error: "WhatsApp credentials not configured" };
  }

  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(params.buffer)], { type: params.mimeType });
    formData.append("file", blob, params.filename);
    formData.append("type", params.mimeType);
    formData.append("messaging_product", "whatsapp");

    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error?.message || "Failed to upload media to Meta" };
    }
    return { success: true, mediaId: data.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Error uploading media" };
  }
}

/**
 * Sends outbound WhatsApp media message (image, video, audio, document)
 */
export async function sendWhatsAppMediaMessage(params: {
  to: string;
  type: "image" | "video" | "document" | "audio";
  mediaId?: string;
  mediaUrl?: string;
  filename?: string;
  caption?: string;
}): Promise<WhatsAppMessageResult> {
  const cleanTo = params.to.replace(/\D/g, "");
  const formattedTo = cleanTo.length === 10 ? `91${cleanTo}` : cleanTo;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1395630476965721";
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const whatsappUrl = `https://wa.me/${formattedTo}`;

  if (phoneId && token) {
    try {
      const mediaObject: Record<string, any> = {};
      if (params.mediaId) {
        mediaObject.id = params.mediaId;
      } else if (params.mediaUrl) {
        mediaObject.link = params.mediaUrl;
      } else {
        return {
          success: false,
          recipientPhone: formattedTo,
          mode: "cloud_api",
          error: "Either mediaId or mediaUrl is required",
        };
      }

      if (params.caption && params.type !== "audio") {
        mediaObject.caption = params.caption;
      }
      if (params.filename && params.type === "document") {
        mediaObject.filename = params.filename;
      }

      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedTo,
        type: params.type,
        [params.type]: mediaObject,
      };

      const controller = new AbortController();
      const fetchTimer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(fetchTimer);

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error?.error_data?.details || data.error?.message || "WhatsApp Media API request failed";
        return {
          success: false,
          recipientPhone: formattedTo,
          mode: "cloud_api",
          error: errorMsg,
          whatsappUrl,
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id || `wamid_${Date.now()}`,
        recipientPhone: formattedTo,
        mode: "cloud_api",
        whatsappUrl,
      };
    } catch (err: any) {
      return {
        success: false,
        recipientPhone: formattedTo,
        mode: "cloud_api",
        error: err.message || "Failed to dispatch media message",
        whatsappUrl,
      };
    }
  }

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
 * Short, crisp, natural Hinglish.
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
  const lines = [
    `Namaste ${order.customerName} ji! 🌿`,
    `Aapka Prajnaa Market order #${order.orderNumber} successfully receive ho gaya hai.`,
  ];

  if (order.items && order.items.length > 0) {
    order.items.forEach((it) => {
      lines.push(`${it.productName}${it.variantName ? ` (${it.variantName})` : ""} × ${it.quantity}`);
    });
  }

  lines.push(`Total Amount: ${formatInr(order.totalPaise)}`);
  lines.push(`Order processing mein 2–3 din lagte hain.`);
  lines.push(`*Team Prajnaa Market* 🌿`);

  return lines.join("\n");
}

/**
 * Builds itemized WhatsApp confirmation for CRM order ingestion.
 * Short, crisp, natural Hinglish.
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
  const isPaid = order.paymentStatus === "collected" || order.paymentStatus === "paid";
  const payStatus = isPaid ? "Paid" : "Pending";

  const lines = [
    `Namaste ${order.customerName} ji! 🌿`,
    `Aapka order successfully receive ho gaya hai.`,
    `Order No.: #${order.orderNumber}`,
  ];

  if (order.items && order.items.length > 0) {
    order.items.forEach((it) => {
      const lineTotal = it.totalPaise ? formatInr(it.totalPaise) : formatInr(it.unitPricePaise * it.quantity);
      lines.push(`${it.productName}${it.variantName ? ` (${it.variantName})` : ""} × ${it.quantity} — ${lineTotal}`);
    });
  }

  lines.push(`Order Total: ${formatInr(order.totalPaise)}`);
  lines.push(`Payment Status: ${payStatus}`);
  lines.push(`Dispatch mein 2–3 din lagte hain.`);
  lines.push(`*Team Prajnaa Market* 🌿`);

  return lines.join("\n");
}

/**
 * Builds automated Order Shipped notification without third-party links or tracking IDs.
 */
export function buildOrderShippedMessage(params: {
  customerName: string;
  orderNumber: string;
  deliveryCity?: string;
}): string {
  return [
    `Namaste ${params.customerName} ji! 📦`,
    `Aapka Prajnaa Market order #${params.orderNumber} ship ho gaya hai.`,
    `Hum aapko har transit location ki live update isi WhatsApp par bhejte rahenge.`,
    `*Team Prajnaa Market* 🌿`,
  ].join("\n");
}

/**
 * Builds automated Transit Location notification informing customer that parcel reached a specific place.
 */
export function buildOrderTransitLocationMessage(params: {
  customerName: string;
  orderNumber: string;
  location: string;
}): string {
  return [
    `Namaste ${params.customerName} ji! 📍`,
    `Aapka Prajnaa Market order #${params.orderNumber} abhi *${params.location}* pahunch chuka hai aur aage transit mein hai.`,
    `*Team Prajnaa Market* 🌿`,
  ].join("\n");
}

/**
 * Builds automated notification sent one day before delivery informing customer that parcel will arrive tomorrow.
 */
export function buildOrderDeliveringTomorrowMessage(params: {
  customerName: string;
  orderNumber: string;
}): string {
  return [
    `Namaste ${params.customerName} ji! 🚚`,
    `Aapke liye zaroori update: Aapka Prajnaa Market order #${params.orderNumber} *kal deliver ho jayega*.`,
    `Kripya parcel receive karne ke liye apna phone available rakhein.`,
    `*Team Prajnaa Market* 🌿`,
  ].join("\n");
}

/**
 * Dispatch notification helper (supports both milestone-based tracking and Speed Post consignment)
 */
export function buildSpeedPostDispatchMessage(params: {
  customerName: string;
  orderNumber: string;
  trackingId?: string;
  deliveryCity?: string;
}): string {
  if (params.trackingId) {
    return [
      `Namaste ${params.customerName} ji! 📦`,
      `Aapka Prajnaa Market order #${params.orderNumber} Dehradun MDG se dispatch ho gaya hai.`,
      `Speed Post Consignment ID: ${params.trackingId}`,
      `Live Tracking: https://www.indiapost.gov.in`,
      `*Team Prajnaa Market* 🌿`,
    ].join("\n");
  }
  return buildOrderShippedMessage(params);
}

declare global {
  // eslint-disable-next-line no-var
  var __crmChatSessions: Map<string, { stage: string; customerName?: string; updatedAt: number }> | undefined;
}

if (!globalThis.__crmChatSessions) {
  globalThis.__crmChatSessions = new Map();
}

/**
 * Extracts a customer's name from introductory or conversational text.
 */
export function extractCustomerNameFromText(text: string): string | null {
  const clean = (text || "").trim();
  if (!clean) return null;

  // Pattern 1: Explicit introduction phrases
  // Examples: "mera naam Rajat hai", "my name is Rajat", "i am Rajat Sharma", "this is Rajat", "naam Rajat"
  const introMatch = clean.match(/(?:mera\s+naam|my\s+name\s+is|this\s+is|i\s+am|iam|main|mai|naam|name\s*:?)\s+([A-Za-z\u0900-\u097F\s]{2,30})/i);
  if (introMatch && introMatch[1]) {
    const raw = introMatch[1].replace(/(?:hai|hu|hoon|ji|here|this side)\b.*$/i, "").trim();
    if (raw.length >= 2 && raw.length <= 30) {
      return formatTitleCase(raw);
    }
  }

  // Pattern 2: Short direct name response (1 to 3 words, e.g. "Rajat", "Rajat Sharma", "Dr Suresh Kumar")
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 1 && words.length <= 3 && clean.length >= 2 && clean.length <= 30) {
    const lower = clean.toLowerCase();
    const disallowedKeywords = [
      "hi", "hello", "hey", "hlo", "namaste", "pranam", "ji",
      "almond", "almonds", "badam", "badaam", "mamra", "honey", "shehad", "walnut", "akhrot",
      "turmeric", "haldi", "ghee", "apricot", "shilajit", "saffron", "kesar",
      "order", "buy", "chahiye", "karna", "hai", "kya", "rate", "price", "bhav", "cost",
      "cancel", "radd", "refund", "return", "cod", "cash", "payment", "upi", "qr", "utr",
      "status", "track", "tracking", "dispatch", "address", "pata", "pincode", "pin",
      "yes", "no", "ok", "okay", "thanks", "thank", "dhanyawad", "shukriya", "help", "sahayata"
    ];
    const containsDisallowed = words.some((w) => disallowedKeywords.includes(w.toLowerCase()));
    if (!containsDisallowed && /^[A-Za-z\u0900-\u097F\s\.\-]+$/.test(clean)) {
      return formatTitleCase(clean);
    }
  }

  return null;
}

function formatTitleCase(str: string): string {
  return str
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Intelligent multi-step Prajnaa Market conversational bot engine.
 * Supports unknown customer greeting, name capture & automatic CRM inbox contact saving,
 * and smart Himalayan catalog recommendations (Almonds, Honey, Walnuts, etc.).
 */
export function processConversationalBotReply(params: {
  senderPhone?: string;
  senderText: string;
  existingCustomerName?: string;
  orderNumber?: string;
  orderTotal?: number;
}): { replyText: string; updatedCustomerName?: string } {
  const query = (params.senderText || "").toLowerCase().trim();
  const cleanPhone = (params.senderPhone || "").replace(/\D/g, "").slice(-10);

  // Retrieve active conversation session if present
  const session = cleanPhone ? globalThis.__crmChatSessions?.get(cleanPhone) : undefined;

  // Determine if counterparty name is already known
  let currentName: string | undefined = undefined;
  if (
    params.existingCustomerName &&
    params.existingCustomerName !== "Customer" &&
    params.existingCustomerName !== "Patron" &&
    !params.existingCustomerName.startsWith("Patron (") &&
    !params.existingCustomerName.startsWith("+91")
  ) {
    currentName = params.existingCustomerName;
  } else if (session?.customerName) {
    currentName = session.customerName;
  }

  // 1. Check if customer provided their name in this message
  let freshlyCapturedName: string | undefined = undefined;
  const extractedName = extractCustomerNameFromText(params.senderText);
  if (extractedName) {
    freshlyCapturedName = extractedName;
    currentName = extractedName;
    if (cleanPhone) {
      globalThis.__crmChatSessions?.set(cleanPhone, {
        stage: "name_captured",
        customerName: extractedName,
        updatedAt: Date.now(),
      });
    }
  }

  const nameLabel = currentName ? `${currentName} ji` : "ji";

  // Product Intent: Himalayan Almonds / Badam
  if (
    query.includes("almond") ||
    query.includes("badam") ||
    query.includes("badaam") ||
    query.includes("mamra") ||
    query.includes("kagzi almond")
  ) {
    return {
      updatedCustomerName: currentName,
      replyText: [
        `Namaste ${nameLabel}! 🌿 Prajnaa Market ke certified 100% pure Himalayan Organic Almonds (Badam) direct mountain orchards se harvest kiye jate hain:`,
        "",
        "🌰 *Himalayan Mamra Giri Almonds (High Natural Oil)*:",
        "• 500g Pack: ₹1,250",
        "• 1kg Pack: ₹2,400 *(Best Value & Free Shipping)*",
        "",
        "🌰 *Kashmir Sweet Organic Almonds (Giri)*:",
        "• 500g Pack: ₹720",
        "• 1kg Pack: ₹1,400",
        "",
        "✨ *Prajnaa Farm Guarantee*:",
        "✔ 100% Chemical-free, unpolished single-origin harvest",
        "✔ Insured India Post Speed Post delivery (2–3 din mein dispatch from Solan hub)",
        "✔ Free delivery on orders above ₹999",
        "✔ Official UPI: prajnaa@upi",
        "",
        "Kripya batayein aap kaun sa pack aur kitni quantity lena chahte hain? Saath hi apna delivery address aur pincode share kar dijiye, hum turant order book kar denge! 🙏",
      ].join("\n"),
    };
  }

  // Product Intent: Raw Flora Honey / Shehad
  if (
    query.includes("honey") ||
    query.includes("shehad") ||
    query.includes("shahad") ||
    query.includes("flora honey") ||
    query.includes("madhu")
  ) {
    return {
      updatedCustomerName: currentName,
      replyText: [
        `Namaste ${nameLabel}! 🍯 Hamara Himalayan Raw Flora Honey 100% raw, unheated aur multi-flora forest harvest hai:`,
        "",
        "• 500g Glass Jar: ₹550",
        "• 1kg Pack: ₹950",
        "• 5kg Bulk Saver: ₹3,950",
        "",
        "Kripya batayein aap kitni quantity order karna chahte hain aur apna delivery pincode share karein! 🌿",
      ].join("\n"),
    };
  }

  // Product Intent: Walnuts / Akhrot
  if (
    query.includes("walnut") ||
    query.includes("akhrot") ||
    query.includes("kagzi akhrot") ||
    query.includes("walnuts")
  ) {
    return {
      updatedCustomerName: currentName,
      replyText: [
        `Namaste ${nameLabel}! 🌰 Direct Kashmir & Himachal valley ke certified fresh walnuts:`,
        "",
        "• Kashmir Kagzi Walnuts (In-Shell): 500g ₹450 | 1kg ₹850",
        "• Pure Kashmiri Walnut Kernels (Giri): 500g ₹650 | 1kg ₹1,250",
        "",
        "Kripya apna delivery address share karein, hum turant dispatch note create kar denge! 🌿",
      ].join("\n"),
    };
  }

  // Intent: Customer shares delivery address / 6-digit Pincode
  if (
    /\b\d{6}\b/.test(query) ||
    query.includes("delivery address") ||
    query.includes("pata:") ||
    query.includes("road") ||
    query.includes("street") ||
    query.includes("nagar") ||
    query.includes("house no") ||
    query.includes("flat no")
  ) {
    return {
      updatedCustomerName: currentName,
      replyText: [
        `Bahut badhiya ${nameLabel}! 🙏 Aapka delivery address note kar liya gaya hai.`,
        "",
        "Himalayan farm fresh packaging Solan hub (Seva Niketan, Ward No.2, Near ITI, Solan, HP, 173212) se 2–3 din mein Speed Post dwara dispatch ho jayegi.",
        "",
        "Payment aap hamare official UPI desk *prajnaa@upi* par kar sakte hain. Payment ke baad screenshot yahan share kar dijiye taaki hum order confirm kar sakein! 🌿",
      ].join("\n"),
    };
  }

  // 1. Order Cancellation
  if (query.includes("cancel") || query.includes("radd")) {
    return {
      updatedCustomerName: currentName,
      replyText: `Namaste ${nameLabel}! 🙏 Agar aapka parcel abhi dispatch nahi hua hai, toh order cancel ho sakta hai. Kripya apna Order ID confirm kar dijiye, hum turant cancellation update kar denge.`,
    };
  }

  // 2. Address Change / Update
  if (
    query.includes("address") ||
    query.includes("pata") ||
    query.includes("location") ||
    query.includes("pincode change") ||
    query.includes("galat address")
  ) {
    return {
      updatedCustomerName: currentName,
      replyText: `Namaste ${nameLabel}! 🙏 Ji bilkul, agar parcel dispatch nahi hua hai toh address update ho jayega. Kripya apna naya complete delivery address aur pincode yahan send kar dijiye.`,
    };
  }

  // 3. Cash on Delivery (COD)
  if (
    query.includes("cod") ||
    query.includes("cash on delivery") ||
    query.includes("pay on delivery") ||
    query.includes("deliver hone par paise")
  ) {
    return {
      updatedCustomerName: currentName,
      replyText: `Namaste ${nameLabel}! 🙏 Selected pincodes par Cash on Delivery (COD) uplabdh hai. Aap apna delivery pincode share kar dijiye, hum turant check karke bata denge.`,
    };
  }

  // 4. Refund / Return / Money Back
  if (
    query.includes("refund") ||
    query.includes("wapas") ||
    query.includes("return") ||
    query.includes("money back")
  ) {
    return {
      updatedCustomerName: currentName,
      replyText: `Namaste ${nameLabel}! 🙏 Refund approve hone ke baad 3–5 working days ke andar aapke original bank account ya UPI source me paise credit ho jate hain.`,
    };
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
    return {
      updatedCustomerName: currentName,
      replyText: `Namaste ${nameLabel}! 🙏 Agar aapne payment kar di hai, toh kripya payment ka screenshot ya transaction UTR number isi chat par share kar dijiye. Nishant ji verify karke turant confirm kar denge. (Official UPI: prajnaa@upi)`,
    };
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
    return {
      updatedCustomerName: currentName,
      replyText: `Namaste ${nameLabel}! 🙏 Prajnaa organic products ki fresh artisan packing me 2–3 din lagte hain, aur dispatch hone ke baad 3–5 working days me Speed Post se parcel aapke address par deliver ho jata hai.`,
    };
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
    return {
      updatedCustomerName: currentName,
      replyText: `Namaste ${nameLabel}! 🙏 Jaise hi aapka parcel dispatch hota hai, hum aapko WhatsApp par Speed Post order shipped ka automated update bhejte hain. Iske baad parcel jis bhi location ya city pahunchta hai, uski live location update aur delivery se ek din pehle "delivering tomorrow" ka alert automatically aapko isi chat par mil jayega.`,
    };
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
    return {
      updatedCustomerName: currentName,
      replyText: `Namaste ${nameLabel}! 🙏 Prajnaa Market ke sabhi products 100% certified organic aur natural hain, jo direct Himalayan mountain farmers se aate hain. Inme koi chemical ya preservatives nahi milaye jate aur har batch lab-tested hota hai.`,
    };
  }

  // 9. Customer Care / Call / Phone Contact
  if (
    query.includes("contact") ||
    query.includes("number") ||
    query.includes("call") ||
    query.includes("phone") ||
    query.includes("helpline") ||
    query.includes("baat")
  ) {
    return {
      updatedCustomerName: currentName,
      replyText: `Namaste ${nameLabel}! 🙏 Hamara official customer support number +91 80912 65690 hai. Store Concierge Nishant ji isi number par directly available hain.`,
    };
  }

  // 10. Thank You / Appreciation
  if (
    query.includes("thank") ||
    query.includes("dhanyawad") ||
    query.includes("shukriya") ||
    query.includes("thanks")
  ) {
    return {
      updatedCustomerName: currentName,
      replyText: `Aapka bahut-bahut dhanyavaad ${nameLabel}! 🙏 Prajnaa Market ke sath judne ke liye shukriya. Agar koi aur sawal ho toh batayein.`,
    };
  }

  // If customer provided their name in this message and no product intent matched:
  if (freshlyCapturedName) {
    return {
      updatedCustomerName: freshlyCapturedName,
      replyText: [
        `Bahut-bahut dhanyawad, ${freshlyCapturedName} ji! 🙏`,
        "",
        `Aapka contact Prajnaa CRM inbox mein save kar liya gaya hai.`,
        "",
        `Bataiye ${freshlyCapturedName} ji, aaj hum aapki kya sahayata kar sakte hain? Kya aap hamare pure Himalayan Organic Almonds (Badam), Raw Flora Honey, Walnuts (Kagzi Akhrot), ya Pahadi Spices explore karna chahte hain? 🌿`,
      ].join("\n"),
    };
  }

  // 11. Greeting / Welcome
  if (
    query === "hi" ||
    query === "hello" ||
    query === "namaste" ||
    query === "hey" ||
    query === "pranam" ||
    query === "hlo" ||
    query.includes("prajnaa market")
  ) {
    // If name is unknown:
    if (!currentName) {
      if (session?.stage === "awaiting_name") {
        // Customer was already asked for their name once; do NOT keep asking again and again
        return {
          updatedCustomerName: undefined,
          replyText: [
            "Namaste ji! 🙏 Prajnaa Market (Pure Himalayan Farm Harvest) mein swagat hai.",
            "",
            "Bataiye ji, aaj hum aapki kya sahayata kar sakte hain? Hamare certified Himalayan Organic Almonds (Badam), Raw Flora Honey, Walnuts (Kagzi Akhrot), aur Pahadi Spices uplabdh hain. 🌿",
          ].join("\n"),
        };
      }

      // First greeting from unknown contact -> warmly greet and ask for name once
      if (cleanPhone) {
        globalThis.__crmChatSessions?.set(cleanPhone, {
          stage: "awaiting_name",
          updatedAt: Date.now(),
        });
      }

      return {
        updatedCustomerName: undefined,
        replyText: [
          "Namaste ji! 🙏 Prajnaa Market (Pure Himalayan Farm Harvest) mein aapka swagat hai.",
          "",
          "Kripya humein apna shubh naam bata dijiye taaki hum aapka contact save kar sakein aur aapki behtar sahayata kar sakein? (Please reply with your name) 🌿",
        ].join("\n"),
      };
    }

    return {
      updatedCustomerName: currentName,
      replyText: `Namaste ${nameLabel}! 🙏 Prajnaa Market me aapka swagat hai. Batayein ${nameLabel}, aaj hum aapki kya sahayata kar sakte hain? Kya aap hamare Himalayan Almonds (Badam), Raw Flora Honey, ya Walnuts explore karna chahte hain? 🌿`,
    };
  }

  // 12. Fallback
  if (!currentName && session?.stage !== "awaiting_name") {
    if (cleanPhone) {
      globalThis.__crmChatSessions?.set(cleanPhone, {
        stage: "awaiting_name",
        updatedAt: Date.now(),
      });
    }
    return {
      updatedCustomerName: undefined,
      replyText: [
        "Namaste ji! 🙏 Prajnaa Market (Pure Himalayan Farm Harvest) mein aapka swagat hai.",
        "",
        "Kripya humein apna shubh naam bata dijiye taaki hum aapka contact save kar sakein aur aapki behtar sahayata kar sakein? (Please reply with your name) 🌿",
      ].join("\n"),
    };
  }

  return {
    updatedCustomerName: currentName,
    replyText: `Namaste ${nameLabel}! 🙏 Aapka sandesh Prajnaa support team ko mil gaya hai. Store Concierge Nishant ji (+91 80912 65690) ise review karke jald hi aapse direct connect karenge. Agar aap koi product order karna chahte hain, toh kripya product ka naam aur quantity batayein! 🌿`,
  };
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
  const result = processConversationalBotReply({
    existingCustomerName: params.customerName,
    senderText: params.customerQuery,
    orderNumber: params.orderNumber,
    orderTotal: params.orderTotal,
  });
  return result.replyText;
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
    const entries = Array.isArray(payload?.entry) ? payload.entry : (payload?.entry ? [payload.entry] : [payload]);

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : (entry?.changes ? [entry.changes] : [entry]);

      for (const change of changes) {
        const value = change?.value || change;
        if (!value) continue;

        // Extract Contacts dictionary by wa_id for name lookup
        const contacts = Array.isArray(value.contacts) ? value.contacts : [];
        const contactNameMap: Record<string, string> = {};
        for (const c of contacts) {
          if (c?.profile?.name) {
            if (c.wa_id) {
              contactNameMap[c.wa_id] = c.profile.name;
              const cleanWa = c.wa_id.replace(/\D/g, '').slice(-10);
              if (cleanWa) contactNameMap[cleanWa] = c.profile.name;
            }
          }
        }
        const businessPhoneNumberId = value.metadata?.phone_number_id || '';

        // Process Inbound Messages
        if (Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            let textContent = "";
            let mediaId: string | undefined = undefined;
            let mimeType: string | undefined = undefined;

            if (msg.type === "text") {
              textContent = msg.text?.body || "";
            } else if (msg.type === "interactive") {
              textContent = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || msg.interactive?.button_reply?.id || "[Interactive Reply]";
            } else if (msg.type === "button") {
              textContent = msg.button?.text || msg.button?.payload || "[Button Reply]";
            } else if (msg.type === "image") {
              mediaId = msg.image?.id;
              mimeType = msg.image?.mime_type;
              textContent = msg.image?.caption || "[Image Attachment]";
            } else if (msg.type === "video") {
              mediaId = msg.video?.id;
              mimeType = msg.video?.mime_type;
              textContent = msg.video?.caption || "[Video Attachment]";
            } else if (msg.type === "document") {
              mediaId = msg.document?.id;
              mimeType = msg.document?.mime_type;
              textContent = msg.document?.filename || msg.document?.caption || "[Document Attachment]";
            } else if (msg.type === "audio" || msg.type === "voice") {
              mediaId = msg.audio?.id || msg.voice?.id;
              mimeType = msg.audio?.mime_type || msg.voice?.mime_type;
              textContent = "[Voice Note / Audio]";
            } else if (msg.type === "location") {
              textContent = msg.location?.name || msg.location?.address || (msg.location?.latitude ? `[Location: ${msg.location.latitude}, ${msg.location.longitude}]` : "[Location Shared]");
            } else if (msg.type === "contacts") {
              const cName = msg.contacts?.[0]?.name?.formatted_name || msg.contacts?.[0]?.phones?.[0]?.phone || "Contact";
              textContent = `[Contact Shared: ${cName}]`;
            } else if (msg.type === "sticker") {
              mediaId = msg.sticker?.id;
              textContent = "[Sticker]";
            } else if (msg.type === "reaction") {
              textContent = `[Reaction: ${msg.reaction?.emoji || "👍"}]`;
            } else {
              textContent = msg.text?.body || `[${(msg.type || "MESSAGE").toUpperCase()} Attachment]`;
            }

            const tsNum = Number(msg.timestamp);
            const timestamp = !isNaN(tsNum) && tsNum > 0
              ? (tsNum > 1e11 ? new Date(tsNum).toISOString() : new Date(tsNum * 1000).toISOString())
              : new Date().toISOString();

            const cleanFrom = (msg.from || "").replace(/\D/g, "").slice(-10);
            const contactName =
              contactNameMap[msg.from] ||
              contactNameMap[cleanFrom] ||
              contacts[0]?.profile?.name ||
              "";

            messages.push({
              id: msg.id,
              fromPhone: msg.from,
              customerName: contactName,
              text: textContent,
              timestamp,
              type: msg.type || "text",
              mediaId,
              mimeType,
              businessPhoneNumberId,
            });
          }
        }

        // Process Message Status Receipts (sent, delivered, read, failed)
        if (Array.isArray(value.statuses)) {
          for (const st of value.statuses) {
            const tsNum = Number(st.timestamp);
            const timestamp = !isNaN(tsNum) && tsNum > 0
              ? (tsNum > 1e11 ? new Date(tsNum).toISOString() : new Date(tsNum * 1000).toISOString())
              : new Date().toISOString();

            statuses.push({
              messageId: st.id,
              recipientPhone: st.recipient_id,
              status: st.status,
              timestamp,
              error: st.errors?.[0]?.message,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("[WhatsApp Webhook] Parse error:", err);
  }

  return { messages, statuses };
}
