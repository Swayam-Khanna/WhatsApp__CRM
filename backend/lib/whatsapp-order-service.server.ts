import { getDatabase } from "../../lib/mongodb.ts";
import {
  getStoredOrders,
  saveStoredOrder,
  saveStoredNotification,
} from "./crm-store.server.ts";
import { getAuthoritativeCrmProducts, AuthoritativeProduct } from "./product-registry.ts";
import { normalizeIndianPhone } from "./crm-sync.server.ts";
import { db as pgDb, isPostgresAvailable } from "../db.ts";
import { crmOrders as pgCrmOrders } from "../schema/crm.ts";


export interface ExtractedOrderItem {
  productId: string;
  productSlug: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sku: string;
}

export interface WhatsAppOrderDraft {
  phone: string;
  customerName?: string;
  items: ExtractedOrderItem[];
  deliveryAddress?: string;
  pincode?: string;
  paymentMethod?: string;
  stage: "awaiting_items" | "awaiting_address" | "awaiting_confirmation" | "confirmed" | "cancelled";
  lastMessageId?: string;
  updatedAt: number;
}

export interface WhatsAppOrderEvaluationResult {
  isOrderWorkflow: boolean;
  replyText?: string;
  orderCreated?: boolean;
  order?: any;
  notification?: any;
}

// In-memory singletons for draft management and idempotency locks
declare global {
  // eslint-disable-next-line no-var
  var __crmWhatsAppOrderDrafts: Map<string, WhatsAppOrderDraft> | undefined;
  // eslint-disable-next-line no-var
  var __createdWhatsAppOrderMsgIds: Set<string> | undefined;
}

if (!globalThis.__crmWhatsAppOrderDrafts) {
  globalThis.__crmWhatsAppOrderDrafts = new Map();
}
if (!globalThis.__createdWhatsAppOrderMsgIds) {
  globalThis.__createdWhatsAppOrderMsgIds = new Set();
}

/**
 * Clean phone number to 10 digits
 */
function cleanPhone(raw: string): string {
  return (raw || "").replace(/\D/g, "").slice(-10);
}

/**
 * Extracts items and quantities from incoming customer text.
 * Matches against real catalogue products and prices.
 */
export function extractOrderItemsFromText(
  text: string,
  catalogue: AuthoritativeProduct[]
): ExtractedOrderItem[] {
  const q = text.toLowerCase();
  const items: ExtractedOrderItem[] = [];

  // Product synonym dictionary mapping phrases to catalog product keys
  const productMatcher: {
    key: string;
    synonyms: string[];
    defaultVariant?: string;
  }[] = [
    {
      key: "atta",
      synonyms: ["atta", "aata", "khapli atta", "flour", "wheat", "आटा"],
      defaultVariant: "1kg Stone-Ground Pack",
    },
    {
      key: "rice",
      synonyms: ["rice", "chawal", "red rice", "pahari rice", "चावल"],
      defaultVariant: "1kg Mountain Pack",
    },
    {
      key: "mustard oil",
      synonyms: ["oil", "mustard oil", "sarson ka tel", "tel", "kachi ghani", "सरसों का तेल", "तेल"],
      defaultVariant: "1 Litre Bottle",
    },
    {
      key: "almond",
      synonyms: ["almond", "almonds", "badam", "badaam", "mamra", "बादाम", "मामरा"],
      defaultVariant: "500g Pack",
    },
    {
      key: "walnut",
      synonyms: ["walnut", "walnuts", "akhrot", "akhrot giri", "अखरोट"],
      defaultVariant: "500g Giri (Kernels)",
    },
    {
      key: "honey",
      synonyms: ["honey", "shehad", "shahad", "madhu", "शहद"],
      defaultVariant: "500g Glass Jar",
    },
    {
      key: "shilajit",
      synonyms: ["shilajit", "silajit", "shilajeet", "resin", "शिलाजीत"],
      defaultVariant: "20g Pure Resin",
    },
    {
      key: "ghee",
      synonyms: ["ghee", "badri cow ghee", "bilona ghee", "a2 ghee", "desi ghee", "घी"],
      defaultVariant: "1 Litre Glass Jar",
    },
    {
      key: "saffron",
      synonyms: ["saffron", "kesar", "zafran", "mongra", "केसर"],
      defaultVariant: "1g Authentic Kashmiri Mongra",
    },
    {
      key: "apricot",
      synonyms: ["apricot", "apricots", "khumani", "khubani", "खुबानी"],
      defaultVariant: "500g Sun-Dried Red",
    },
    {
      key: "turmeric",
      synonyms: ["turmeric", "haldi", "lakadong", "हल्दी"],
      defaultVariant: "250g Jar",
    },
    {
      key: "salt",
      synonyms: ["salt", "namak", "sendha", "rock salt", "pink salt", "kala namak", "नमक"],
      defaultVariant: "500g Pouch",
    },
    {
      key: "pickle",
      synonyms: ["pickle", "achar", "mango pickle", "lemon pickle", "अचार"],
      defaultVariant: "400g Glass Jar",
    },
    {
      key: "rajma",
      synonyms: ["rajma", "chitra rajma", "rajmah", "राजमा"],
      defaultVariant: "500g Pack",
    },
    {
      key: "tea",
      synonyms: ["tea", "chamomile tea", "chai", "चाय"],
      defaultVariant: "100g Loose Blossom Tin",
    },
  ];

  // Helper to extract quantity immediately preceding or following a matched synonym
  const extractQuantityNear = (synonym: string): number => {
    // 1. Check patterns like "2 kg atta", "1 packet rice", "2 oil", "2x badam"
    const prefixRegex = new RegExp(`(?:(\\d+|ek|do|teen|chaar|paanch|one|two|three|four|five)\\s*(?:kg|kilo|pack|packet|bottle|litre|l|jar|g|gm)?\\s*(?:x\\s*)?)${synonym}`, "i");
    const prefixMatch = q.match(prefixRegex);
    if (prefixMatch && prefixMatch[1]) {
      return parseQuantityWord(prefixMatch[1]);
    }

    // 2. Check patterns like "atta 2 kg", "rice 1 packet", "oil 2"
    const suffixRegex = new RegExp(`${synonym}\\s*(?:(\\d+|ek|do|teen|chaar|paanch|one|two|three|four|five)\\s*(?:kg|kilo|pack|packet|bottle|litre|l|jar|g|gm)?)`, "i");
    const suffixMatch = q.match(suffixRegex);
    if (suffixMatch && suffixMatch[1]) {
      return parseQuantityWord(suffixMatch[1]);
    }

    // Default quantity
    return 1;
  };

  const matchedKeys = new Set<string>();

  for (const itemDef of productMatcher) {
    for (const syn of itemDef.synonyms) {
      if (q.includes(syn) && !matchedKeys.has(itemDef.key)) {
        // Find matching product in catalogue
        const product = catalogue.find((p) => {
          const pName = p.name.toLowerCase();
          const pSlug = p.slug.toLowerCase();
          return itemDef.synonyms.some((s) => pName.includes(s) || pSlug.includes(s));
        });

        if (product) {
          matchedKeys.add(itemDef.key);
          const quantity = extractQuantityNear(syn);

          // Find variant price if variant requested
          let unitPrice = product.price;
          let variantName = itemDef.defaultVariant || product.variants[0]?.name;

          if (q.includes("2 kg") || q.includes("2kg")) {
            const v2kg = product.variants.find((v) => v.name.includes("2kg") || v.name.includes("2 kg"));
            if (v2kg) {
              unitPrice = v2kg.price;
              variantName = v2kg.name;
            } else {
              unitPrice = product.price;
            }
          } else if (q.includes("1kg") || q.includes("1 kg")) {
            const v1kg = product.variants.find((v) => v.name.includes("1kg") || v.name.includes("1 kg") || v.name.includes("1 Litre"));
            if (v1kg) {
              unitPrice = v1kg.price;
              variantName = v1kg.name;
            }
          }

          items.push({
            productId: product.id,
            productSlug: product.slug,
            productName: product.name,
            variantName,
            quantity: Math.max(1, quantity),
            unitPrice,
            totalPrice: unitPrice * Math.max(1, quantity),
            sku: product.sku || `PM-${product.slug.substring(0, 3).toUpperCase()}-500`,
          });
          break;
        }
      }
    }
  }

  return items;
}

function parseQuantityWord(raw: string): number {
  const map: Record<string, number> = {
    ek: 1, one: 1, "एक": 1,
    do: 2, two: 2, "दो": 2,
    teen: 3, three: 3, "तीन": 3,
    chaar: 4, four: 4, "चार": 4,
    paanch: 5, five: 5, "पांच": 5,
  };
  const lower = raw.toLowerCase().trim();
  if (map[lower]) return map[lower];
  const num = parseInt(lower, 10);
  return isNaN(num) || num <= 0 ? 1 : num;
}

/**
 * Extracts delivery address & PIN code from message text.
 */
export function extractAddressFromText(text: string): { address?: string; pincode?: string } {
  const q = text.trim();

  // 6-digit Indian PIN code
  const pinMatch = q.match(/\b[1-9][0-9]{5}\b/);
  const pincode = pinMatch ? pinMatch[0] : undefined;

  // Address indicators
  const hasAddr =
    Boolean(pincode) ||
    /\b(?:flat|house|apartment|h\.no|lane|road|street|nagar|colony|sector|city|state|dist|district|landmark|pata|address|delhi|mumbai|bangalore|pune|dehradun|noida|gurugram|jaipur|lucknow|hyderabad|chennai|kolkata|solan|shimla|chandigarh|panipat|karnal|ambala)\b/i.test(q);

  if (hasAddr && q.length >= 8) {
    return { address: q, pincode };
  }

  return { pincode };
}

/**
 * Retrieve or restore customer order draft (memory + MongoDB backup)
 */
export async function getCustomerOrderDraft(phone: string): Promise<WhatsAppOrderDraft | null> {
  const p = cleanPhone(phone);
  if (!p) return null;

  // 1. In-memory
  const memoryDraft = globalThis.__crmWhatsAppOrderDrafts?.get(p);
  if (memoryDraft && Date.now() - memoryDraft.updatedAt < 24 * 60 * 60 * 1000) {
    return memoryDraft;
  }

  // 2. MongoDB
  try {
    const db = await getDatabase();
    if (db) {
      const doc = await db.collection("crm_order_drafts").findOne({ phone: p });
      if (doc && doc.stage !== "confirmed" && doc.stage !== "cancelled") {
        const restored: WhatsAppOrderDraft = {
          phone: doc.phone,
          customerName: doc.customerName,
          items: doc.items || [],
          deliveryAddress: doc.deliveryAddress,
          pincode: doc.pincode,
          paymentMethod: doc.paymentMethod || "WhatsApp (COD / UPI)",
          stage: doc.stage,
          lastMessageId: doc.lastMessageId,
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt).getTime() : Date.now(),
        };
        globalThis.__crmWhatsAppOrderDrafts?.set(p, restored);
        return restored;
      }
    }
  } catch (err) {
    console.warn("[WhatsApp Order Service] Draft restore error:", err);
  }

  return null;
}

/**
 * Persist or clear customer order draft
 */
export async function saveCustomerOrderDraft(
  phone: string,
  draft: WhatsAppOrderDraft | null
): Promise<void> {
  const p = cleanPhone(phone);
  if (!p) return;

  if (!draft) {
    globalThis.__crmWhatsAppOrderDrafts?.delete(p);
    try {
      const db = await getDatabase();
      if (db) {
        await db.collection("crm_order_drafts").deleteOne({ phone: p });
      }
    } catch {}
    return;
  }

  draft.updatedAt = Date.now();
  globalThis.__crmWhatsAppOrderDrafts?.set(p, draft);

  try {
    const db = await getDatabase();
    if (db) {
      await db.collection("crm_order_drafts").updateOne(
        { phone: p },
        { $set: { ...draft, updatedAt: new Date() } },
        { upsert: true }
      );
    }
  } catch (err) {
    console.warn("[WhatsApp Order Service] Draft save error:", err);
  }
}

/**
 * Creates the order in CRM Orders and creates a Notification.
 * Idempotent: One message/draft creates strictly ONE order and ONE notification.
 */
export async function createOrderAndNotification(params: {
  draft: WhatsAppOrderDraft;
  customerPhone: string;
  customerName?: string;
  messageId: string;
  conversationId?: string;
}): Promise<{ success: boolean; order?: any; notification?: any; error?: string }> {
  const { draft, customerPhone, messageId, conversationId } = params;
  const p = cleanPhone(customerPhone);
  const resolvedName = params.customerName || draft.customerName || "Customer";

  // 1. Idempotency check: in-memory
  if (messageId && globalThis.__createdWhatsAppOrderMsgIds?.has(messageId)) {
    console.log(`[WhatsApp Order Service] Idempotency: Message ${messageId} already created an order. Skipping duplicate.`);
    const existingOrder = getStoredOrders().find((o) => o.whatsappMessageId === messageId);
    return { success: true, order: existingOrder };
  }

  // 2. Idempotency check: MongoDB atomic lock
  let db: any = null;
  try {
    db = await getDatabase();
    if (db && messageId) {
      const lockResult = await db.collection("crm_order_creations").updateOne(
        { _id: messageId },
        { $setOnInsert: { messageId, phone: p, createdAt: new Date() } },
        { upsert: true }
      );
      if (lockResult.matchedCount > 0) {
        console.log(`[WhatsApp Order Service] Database lock: Order already created for message ${messageId}.`);
        const existingOrder = await db.collection("crm_orders").findOne({ whatsappMessageId: messageId });
        return { success: true, order: existingOrder };
      }
    }
  } catch (lockErr) {
    console.warn("[WhatsApp Order Service] DB order lock note:", lockErr);
  }

  // 3. Generate unique order number: ORD-2026-XXXX
  const currentYear = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `ORD-${currentYear}-${randomSuffix}`;

  // 4. Calculate total amount & totalPaise
  const items = draft.items && draft.items.length > 0 ? draft.items : [];
  const orderTotal = items.reduce((sum, it) => sum + (it.totalPrice || it.unitPrice * it.quantity), 0);
  const totalPaise = Math.round(orderTotal * 100);

  const formattedPhone = normalizeIndianPhone(customerPhone) || `+91 ${p.slice(0, 5)} ${p.slice(5)}`;
  const deliveryAddress = draft.deliveryAddress || "Address provided via WhatsApp conversation";

  const orderRecord: any = {
    id: orderNumber,
    orderNumber,
    customerName: resolvedName,
    customerPhone: formattedPhone,
    deliveryAddress,
    pincode: draft.pincode || "",
    items: items.map((it) => ({
      productId: it.productId,
      productSlug: it.productSlug,
      name: it.productName,
      sku: it.sku,
      quantity: it.quantity,
      price: it.unitPrice,
      unitPricePaise: Math.round(it.unitPrice * 100),
      total: it.totalPrice,
      totalPaise: Math.round(it.totalPrice * 100),
      weight: it.variantName || "Standard Pack",
    })),
    amount: orderTotal,
    totalPaise,
    status: "Processing",
    orderStatus: "Processing",
    paymentStatus: "pending",
    paymentMethod: draft.paymentMethod || "WhatsApp (COD / UPI)",
    source: "WhatsApp",
    channel: "whatsapp_inbox",
    whatsappConversationId: conversationId || p,
    whatsappMessageId: messageId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 5. Persist to Disk & Memory Store
  saveStoredOrder(orderRecord);

  // 6. Persist to MongoDB
  if (db) {
    try {
      await db.collection("crm_orders").updateOne(
        { orderNumber },
        { $set: orderRecord },
        { upsert: true }
      );
    } catch (mErr) {
      console.warn("[WhatsApp Order Service] MongoDB order insert error:", mErr);
    }
  }

  // 7. Persist to PostgreSQL if available
  if (isPostgresAvailable()) {
    try {
      await pgDb
        .insert(pgCrmOrders)
        .values({
          id: orderNumber,
          orderNumber,
          customerName: resolvedName,
          customerPhone: formattedPhone,
          totalPaise,
          status: "Processing",
          paymentStatus: "pending",
          items: orderRecord.items,
          source: "WhatsApp",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();
    } catch (pgErr) {
      console.warn("[WhatsApp Order Service] PostgreSQL insert note:", pgErr);
    }
  }

  // 8. Generate CRM Notification
  const itemsSummary = items.map((it) => `${it.quantity}x ${it.productName}`).join(", ");
  const notificationRecord = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: "whatsapp_order",
    title: "New WhatsApp Order Received",
    customerName: resolvedName,
    customerPhone: formattedPhone,
    orderNumber,
    orderId: orderNumber,
    itemsSummary,
    totalAmount: orderTotal,
    source: "WhatsApp Inbox",
    status: "New Order",
    description: "A new order has been automatically created from a WhatsApp customer conversation.",
    read: false,
    createdAt: new Date().toISOString(),
  };

  // Persist notification to memory/disk and MongoDB
  saveStoredNotification(notificationRecord);

  if (db) {
    try {
      await db.collection("crm_notifications").updateOne(
        { id: notificationRecord.id },
        { $set: notificationRecord },
        { upsert: true }
      );
    } catch (notifErr) {
      console.warn("[WhatsApp Order Service] MongoDB notification insert error:", notifErr);
    }
  }

  // Mark messageId as created in memory lock
  if (messageId) {
    globalThis.__createdWhatsAppOrderMsgIds?.add(messageId);
  }

  // Clear draft
  await saveCustomerOrderDraft(p, null);

  return {
    success: true,
    order: orderRecord,
    notification: notificationRecord,
  };
}

/**
 * Master workflow evaluator for incoming WhatsApp messages.
 * Evaluates:
 * 1. Is this a genuine order intent vs. pure price/stock enquiry?
 * 2. Has the customer provided products & quantities?
 * 3. Has the customer provided a delivery address?
 * 4. Has the customer confirmed the order?
 * 5. Handles quantity updates, cancellations, and confirmations.
 */
export async function evaluateWhatsAppOrderWorkflow(params: {
  customerPhone: string;
  customerText: string;
  customerName?: string;
  messageId?: string;
  reqHost?: string;
}): Promise<WhatsAppOrderEvaluationResult> {
  const p = cleanPhone(params.customerPhone);
  const rawText = (params.customerText || "").trim();
  const q = rawText.toLowerCase();

  if (!rawText || !p) {
    return { isOrderWorkflow: false };
  }

  // 0. Idempotent check: If this exact messageId already created an order, return it immediately
  if (params.messageId) {
    const existingOrder = getStoredOrders().find((o) => o.whatsappMessageId === params.messageId);
    if (existingOrder) {
      console.log(`[WhatsApp Order Service] Replay/duplicate webhook detected for message ${params.messageId}. Returning existing order.`);
      return {
        isOrderWorkflow: true,
        orderCreated: true,
        order: existingOrder,
        replyText: `Aapka order *${existingOrder.orderNumber}* already confirm ho chuka hai. 🌿`,
      };
    }
  }

  // 1. Check for cancellation
  const isCancellation =
    /\b(?:cancel\s*order|order\s*cancel|cancel\s*kar\s*do|nahi\s*chahiye|nahin\s*chahiye|rehne\s*do|don't\s*want|dont\s*want|cancel)\b/i.test(q) ||
    /(?:कैंसिल|ऑर्डर कैंसिल|नहीं चाहिए|रहने दो)/i.test(q);

  const existingDraft = await getCustomerOrderDraft(p);


  if (isCancellation) {
    if (existingDraft) {
      await saveCustomerOrderDraft(p, null);
      return {
        isOrderWorkflow: true,
        replyText: `Ji ${params.customerName || "Customer"} ji! 🙏 Aapka pending order cancel kar diya gaya hai. Agar aapko koi aur jankari chahiye toh zaroor batayein. 🌿`,
      };
    }
    return { isOrderWorkflow: false };
  }

  // 2. Check for pure price / availability enquiry
  // e.g. "What is the price of almond?", "Badam kitne ka hai?", "Available hai kya?", "Stock mein hai?"
  const isEnquiryKeyword =
    /\b(?:price|cost|rate|kitne\s*ka|kitne\s*ki|kya\s*rate|rate\s*kya|daam|available|in\s*stock|stock\s*mein|milega|hai\s*kya)\b/i.test(q) ||
    /(?:कीमत|दाम|कितने का|उपलब्ध|स्टॉक)/i.test(q);

  const isExplicitOrderVerb =
    /\b(?:order\s*karna|order\s*kardo|order\s*kijiye|book\s*karna|book\s*kardo|book\s*my\s*order|bhej\s*dena|bhej\s*do|bhejo|chahiye|lena\s*hai|mangwana\s*hai|pack\s*kardo|note\s*kar\s*lo|saman\s*order)\b/i.test(q) ||
    /(?:ऑर्डर करना है|ऑर्डर कर दो|भेज देना|भेज दो|चाहिए|बुक करो|बुक कर दो|मंगाना है)/i.test(q);

  // If it's purely an enquiry with no order verbs and no existing confirmation flow -> NOT an order workflow
  if (isEnquiryKeyword && !isExplicitOrderVerb && !existingDraft) {
    return { isOrderWorkflow: false };
  }

  // 3. Load live catalogue
  const catalogue = await getAuthoritativeCrmProducts();

  // 4. Extract any products & items in the current message
  const extractedItems = extractOrderItemsFromText(rawText, catalogue);

  // 5. Extract address if provided
  const { address, pincode } = extractAddressFromText(rawText);

  // 6. Check for confirmation response
  // e.g. "Haan ji", "Ha ji", "Ji haan", "Yes", "Confirm", "Confirm kar do", "Please book it", "Bhej do", "Theek hai"
  const isConfirmation =
    /^(?:haan\s*ji|ha\s*ji|hanji|ji\s*haan|yes|confirm(?:\s*kar\s*do|\s*kardo|\s*kijiye)?|please\s*book|book(?:\s*kar\s*do|\s*kardo)?|theek\s*hai(?:\s*ji)?|thik\s*hai(?:\s*ji)?|ok\s*confirm|haan|ha|yes\s*please|bhej\s*do)[\s.!?]*$/i.test(q) ||
    /\b(?:confirm\s*kar\s*do|confirm\s*kardo|confirm\s*kijiye|order\s*confirm|haan\s*ji|confirm\s*please)\b/i.test(q) ||
    /^(?:हाँ जी|जी हाँ|कन्फर्म|कन्फर्म कर दो|बुक कर दो|ठीक है जी)[\s.!?]*$/i.test(q);


  // =========================================================================
  // SCENARIO 1: EXISTING DRAFT + CUSTOMER CONFIRMATION
  // =========================================================================
  if (existingDraft && isConfirmation) {
    // If address is missing, prompt for address first
    if (!existingDraft.deliveryAddress && !address) {
      return {
        isOrderWorkflow: true,
        replyText: `Ji ${params.customerName || existingDraft.customerName || "Customer"} ji! 🙏 Order confirm karne ke liye kripya apna *delivery address aur 6-digit PIN code* share kar dijiye. 🌿`,
      };
    }

    if (address) {
      existingDraft.deliveryAddress = address;
      if (pincode) existingDraft.pincode = pincode;
    }

    // CREATE THE ORDER!
    const creationResult = await createOrderAndNotification({
      draft: existingDraft,
      customerPhone: p,
      customerName: params.customerName || existingDraft.customerName,
      messageId: params.messageId || `wamid_conf_${Date.now()}`,
    });

    if (creationResult.success && creationResult.order) {
      const order = creationResult.order;
      const itemsListText = order.items
        .map((it: any) => `• ${it.quantity}x ${it.name} (₹${(it.total || it.price * it.quantity).toLocaleString("en-IN")})`)
        .join("\n");

      return {
        isOrderWorkflow: true,
        orderCreated: true,
        order,
        notification: creationResult.notification,
        replyText:
          `Namaste ${params.customerName || existingDraft.customerName || "Customer"} ji! 🙏\n\n` +
          `Aapka order *${order.orderNumber}* confirm ho gaya hai aur CRM Orders mein note kar liya gaya hai. 🌿\n\n` +
          `*Order Summary:*\n${itemsListText}\n` +
          `*Total Amount:* ₹${order.amount.toLocaleString("en-IN")}\n` +
          `*Delivery Address:* ${order.deliveryAddress}\n` +
          `*Payment:* UPI / Cash on Delivery\n\n` +
          `Hamaari team ise jaldi hi pack karke dispatch karegi. Dhanyawad! 🌿`,
      };
    }
  }

  // =========================================================================
  // SCENARIO 2: EXISTING DRAFT + QUANTITY / ITEM UPDATE
  // =========================================================================
  if (existingDraft && extractedItems.length > 0) {
    // Customer updated items or quantities
    existingDraft.items = extractedItems;
    if (address) {
      existingDraft.deliveryAddress = address;
      if (pincode) existingDraft.pincode = pincode;
    }
    await saveCustomerOrderDraft(p, existingDraft);

    const total = existingDraft.items.reduce((sum, it) => sum + it.totalPrice, 0);
    const summary = existingDraft.items.map((it) => `• ${it.quantity}x ${it.productName} (₹${it.totalPrice.toLocaleString("en-IN")})`).join("\n");

    if (!existingDraft.deliveryAddress) {
      return {
        isOrderWorkflow: true,
        replyText:
          `Ji ${params.customerName || "Customer"} ji! 🌿 Aapka order update kar diya gaya hai:\n\n${summary}\n*Total:* ₹${total.toLocaleString("en-IN")}\n\n` +
          `Kripya apna *delivery address aur pincode* bata dijiye taaki hum order confirm kar sakein.`,
      };
    }

    return {
      isOrderWorkflow: true,
      replyText:
        `Ji! Updated details note kar li gayi hain:\n\n${summary}\n*Total:* ₹${total.toLocaleString("en-IN")}\n📍 *Address:* ${existingDraft.deliveryAddress}\n\n` +
        `Kya main aapka yeh order confirm kar doon? (Reply *Haan ji* ya *Confirm* karein)`,
    };
  }

  // =========================================================================
  // SCENARIO 3: EXISTING DRAFT + CUSTOMER SENDS ADDRESS
  // =========================================================================
  if (existingDraft && address) {
    existingDraft.deliveryAddress = address;
    if (pincode) existingDraft.pincode = pincode;
    existingDraft.stage = "awaiting_confirmation";
    await saveCustomerOrderDraft(p, existingDraft);

    const total = existingDraft.items.reduce((sum, it) => sum + it.totalPrice, 0);
    const summary = existingDraft.items.map((it) => `• ${it.quantity}x ${it.productName} (₹${it.totalPrice.toLocaleString("en-IN")})`).join("\n");

    return {
      isOrderWorkflow: true,
      replyText:
        `Dhanyawad ${params.customerName || existingDraft.customerName || "Customer"} ji! 🌿 Aapka delivery address note kar liya gaya hai:\n📍 *${address}*\n\n` +
        `*Order Details:*\n${summary}\n*Total Amount:* ₹${total.toLocaleString("en-IN")}\n\n` +
        `Kya main aapka yeh order confirm kar doon? (Reply *Haan ji* ya *Confirm* karein)`,
    };
  }

  // =========================================================================
  // SCENARIO 4: NEW ORDER INTENT DETECTED
  // =========================================================================
  if (extractedItems.length > 0 && (isExplicitOrderVerb || rawText.length < 50)) {
    const draft: WhatsAppOrderDraft = {
      phone: p,
      customerName: params.customerName,
      items: extractedItems,
      deliveryAddress: address,
      pincode,
      stage: address ? "awaiting_confirmation" : "awaiting_address",
      lastMessageId: params.messageId,
      updatedAt: Date.now(),
    };

    await saveCustomerOrderDraft(p, draft);

    const total = extractedItems.reduce((sum, it) => sum + it.totalPrice, 0);
    const summary = extractedItems.map((it) => `• ${it.quantity}x ${it.productName} (₹${it.totalPrice.toLocaleString("en-IN")})`).join("\n");

    if (!address) {
      return {
        isOrderWorkflow: true,
        draft,
        replyText:
          `Ji ${params.customerName || "Customer"} ji! 🌿 Aapki pasand note kar li gayi hai:\n\n${summary}\n*Total Amount:* ₹${total.toLocaleString("en-IN")}\n\n` +
          `Kripya apna *delivery address aur pincode* bata dijiye taaki hum aapka order book kar sakein. 🙏`,
      };
    }

    return {
      isOrderWorkflow: true,
      draft,
      replyText:
        `Ji ${params.customerName || "Customer"} ji! 🌿 Aapka order details note kar liya gaya hai:\n\n${summary}\n*Total Amount:* ₹${total.toLocaleString("en-IN")}\n📍 *Delivery Address:* ${address}\n\n` +
        `Kya main aapka yeh order confirm kar doon? (Reply *Haan ji* ya *Confirm* karein)`,
    };
  }

  // =========================================================================
  // SCENARIO 5: ORDER VERB WITHOUT ITEMS ("I want to order", "Book my order")
  // =========================================================================
  if (isExplicitOrderVerb) {
    return {
      isOrderWorkflow: true,
      replyText:
        `Namaste ${params.customerName || "Customer"} ji! 🙏 Ji bilkul, aapko kaunse Himalayan produce ka order karna hai? (Jaise Mamra Badam, Raw Honey, A2 Ghee, Khapli Atta, ya Walnuts).\n\nKripya products aur quantity bata dijiye. 🌿`,
    };
  }

  return { isOrderWorkflow: false };
}
