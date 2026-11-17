import { db, isPostgresConfigured } from "../db.ts";
import { farmerProducts, productInventory } from "../schema/index.ts";
import { crmOrders, crmMessages } from "../schema/crm.ts";
import { eq, desc, or, ilike } from "drizzle-orm";
import { allProducts as staticCatalog } from "../../frontend/lib/mock/products.ts";
import { getDatabase } from "../../lib/mongodb.ts";
import { getAuthoritativeCrmProducts } from "./product-registry.ts";
import {
  normalizeCustomerMessage,
  detectMessageLanguage,
  extractEntities,
  classifyCustomerIntent,
  ExtractedEntities,
} from "./message-understanding.server.ts";
import {
  AUTOMATED_TEMPLATES,
  getAutomatedTemplateById,
  findBestAutomatedTemplate,
  renderAutomatedTemplate,
} from "./automation-templates.ts";

export type SupportedLanguage = "en" | "hinglish" | "hi";

export type CustomerIntent =
  | "first_welcome_greeting"
  | "greeting"
  | "greetings"
  | "product_enquiry"
  | "catalogue_request"
  | "price_enquiry"
  | "packaging_quantity_enquiry"
  | "product_availability"
  | "order_placement"
  | "order_status"
  | "payment_enquiry"
  | "delivery_enquiry"
  | "complaint"
  | "wholesale_enquiry"
  | "general_question"
  | "unclear_intent"
  | "human_handoff"
  | "thank_you"
  | "acknowledgement"
  | "positive_response"
  | "negative_response"
  | "casual_conversation"
  | "casual"
  | "clarification"
  | "follow_up"
  | "closing"
  | "expression"
  | "bargaining"
  | "trust"
  | "followup";

export interface LiveProductVariant {
  name: string;
  weightGrams: number;
  price: number;
  stockStatus: "in_stock" | "few_left" | "pre_order" | "out_of_stock";
}

export interface LiveCatalogueItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  variants: LiveProductVariant[];
  image: string;
  stockStatus: "in_stock" | "few_left" | "pre_order" | "out_of_stock";
  url: string;
}

export interface ConversationContext {
  phone: string;
  customerName?: string;
  language: SupportedLanguage;
  lastDiscussedProductSlug?: string;
  lastDiscussedProductName?: string;
  lastDiscussedVariant?: string;
  lastDiscussedPrice?: number;
  lastDiscussedQuantity?: number;
  lastIntent?: CustomerIntent;
  activeStage?:
    | "idle"
    | "browsing"
    | "discussing_product"
    | "awaiting_quantity"
    | "awaiting_address"
    | "order_confirmed"
    | "human_handoff";
  handoffActive?: boolean;
  handoffAgentName?: string;
  handoffAt?: number;
  updatedAt: number;
  messageCount: number;
}

// In-memory human takeover tracker: pauses automated replies when an agent takes over
declare global {
  // eslint-disable-next-line no-var
  var __crmHumanTakeoverSessions: Map<string, { agentName: string; pausedAt: number }> | undefined;
  // eslint-disable-next-line no-var
  var __crmConversationContexts: Map<string, ConversationContext> | undefined;
}

if (!globalThis.__crmHumanTakeoverSessions) {
  globalThis.__crmHumanTakeoverSessions = new Map();
}

if (!globalThis.__crmConversationContexts) {
  globalThis.__crmConversationContexts = new Map();
}

/**
 * Checks if a human agent is currently handling this conversation.
 * Handoff remains active for 4 hours unless explicitly released.
 */
export function isHumanAgentActive(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  if (!cleanPhone) return false;
  const session = globalThis.__crmHumanTakeoverSessions?.get(cleanPhone);
  if (!session) return false;
  const fourHours = 4 * 60 * 60 * 1000;
  if (Date.now() - session.pausedAt > fourHours) {
    globalThis.__crmHumanTakeoverSessions?.delete(cleanPhone);
    return false;
  }
  return true;
}

/**
 * Activates human handoff mode, pausing conflicting automated replies.
 */
export function setHumanAgentHandoff(phone: string, agentName: string = "Nishant (Store Desk)") {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  if (!cleanPhone) return;
  globalThis.__crmHumanTakeoverSessions?.set(cleanPhone, {
    agentName,
    pausedAt: Date.now(),
  });
  updateConversationContext(cleanPhone, {
    handoffActive: true,
    handoffAgentName: agentName,
    handoffAt: Date.now(),
    activeStage: "human_handoff",
  });
}

/**
 * Releases human handoff, re-enabling automated responses.
 */
export function releaseHumanAgentHandoff(phone: string) {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  if (!cleanPhone) return;
  globalThis.__crmHumanTakeoverSessions?.delete(cleanPhone);
  updateConversationContext(cleanPhone, {
    handoffActive: false,
    handoffAgentName: undefined,
    handoffAt: undefined,
    activeStage: "idle",
  });
}

/**
 * Extracts 10-digit counterparty customer phone number.
 */
export function extractCleanPhone(phone?: string): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "").slice(-10);
}

/**
 * Resolves the conversation context for a given customer.
 */
export function getConversationContext(phone: string): ConversationContext {
  const cleanPhone = extractCleanPhone(phone);
  let ctx = globalThis.__crmConversationContexts?.get(cleanPhone);
  if (!ctx) {
    ctx = {
      phone: cleanPhone,
      language: "en",
      activeStage: "idle",
      updatedAt: Date.now(),
      messageCount: 0,
    };
    if (globalThis.__crmConversationContexts && cleanPhone) {
      globalThis.__crmConversationContexts.set(cleanPhone, ctx);
    }
  }
  return ctx;
}

/**
 * Updates the conversation context for a customer.
 */
export function updateConversationContext(
  phone: string,
  updates: Partial<ConversationContext>
): ConversationContext {
  const cleanPhone = extractCleanPhone(phone);
  const current = getConversationContext(cleanPhone);
  const updated: ConversationContext = {
    ...current,
    ...updates,
    phone: cleanPhone,
    updatedAt: Date.now(),
  };
  if (globalThis.__crmConversationContexts && cleanPhone) {
    globalThis.__crmConversationContexts.set(cleanPhone, updated);
  }
  return updated;
}

/**
 * Resets the conversation context for a customer.
 */
export function resetConversationContext(phone: string): void {
  const cleanPhone = extractCleanPhone(phone);
  if (cleanPhone) {
    globalThis.__crmConversationContexts?.delete(cleanPhone);
    globalThis.__crmHumanTakeoverSessions?.delete(cleanPhone);
  }
}

/**
 * Resolves the public base URL of the application.
 */
export function getAppBaseUrl(reqHost?: string): string {
  if (reqHost) {
    const cleanHost = reqHost.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    const isLocal = cleanHost.includes("localhost") || cleanHost.includes("127.0.0.1");
    if (!isLocal) {
      return `https://${cleanHost}`;
    }
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const raw = process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, "");
    const isLocal = raw.includes("localhost") || raw.includes("127.0.0.1");
    if (!isLocal || process.env.NODE_ENV !== "production") {
      return raw.startsWith("http") ? raw : `https://${raw}`;
    }
  }
  if (reqHost) {
    const cleanHost = reqHost.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    return `http://${cleanHost}`;
  }
  if (process.env.BETTER_AUTH_URL) {
    const raw = process.env.BETTER_AUTH_URL.trim().replace(/\/+$/, "");
    const isLocal = raw.includes("localhost") || raw.includes("127.0.0.1");
    if (!isLocal || process.env.NODE_ENV !== "production") {
      return raw.startsWith("http") ? raw : `https://${raw}`;
    }
  }
  return "https://crm.prajnaa.in";
}

/**
 * Safety wrapper to prevent queries from exceeding webhook SLA.
 */
function withTimeout<T>(promise: Promise<T>, ms: number = 1500, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * Detects the language used by the customer: "en", "hinglish", or "hi".
 */
export function detectLanguage(
  text: string,
  contextLanguage?: SupportedLanguage
): SupportedLanguage {
  const clean = (text || "").trim();
  if (!clean) return contextLanguage || "en";

  // 1. Check for Devanagari script (Hindi: \u0900-\u097F)
  if (/[\u0900-\u097F]/.test(clean)) {
    return "hi";
  }

  const lower = clean.toLowerCase();

  // 2. High-confidence Hinglish phrases
  const strongHinglishPatterns = [
    /\b(?:aapke paas|kaun se|kaun-se|kya kya|kitne ka|kitne ki|kahan hai|mujhe .* chahiye|order karna hai|bata dijiye|batao|dekh lo|kar diya|mil jayega|stock mein|kab tak|aayega|kitne din|asuvidha|maafi|kharab|shikayat|kripya|dhanyavaad|shukriya|namaste|pranam)\b/i,
    /\b(?:karna hai|lena hai|khareedna hai|bhejo|bhejiye|pata|rupaye|daam|bhai|sahayata|swagat)\b/i,
    /\b(?:achha|acha|theek|sahi|badhiya|aur batao|batao ji)\b/i,
  ];

  if (strongHinglishPatterns.some((pattern) => pattern.test(lower))) {
    return "hinglish";
  }

  // 3. High-confidence English phrases
  const strongEnglishPatterns = [
    /\b(?:tell me|what products?|what do you|show me|price of|how much|i want to|where is my|i have made|talk to|can you|explore our|let me know|how can we|help you|in stock|available|delivery time)\b/i,
    /\b(?:hello|good morning|good evening|thanks|thank you|sorry|please share)\b/i,
  ];

  if (strongEnglishPatterns.some((pattern) => pattern.test(lower))) {
    return "en";
  }

  // 4. Token scoring
  const hinglishTokens = new Set([
    "aap", "aapke", "aapki", "aapka", "paas", "kaun", "kya", "hai", "hain", "ho", "hu", "hoon",
    "chahiye", "kitne", "kitna", "kitni", "kahan", "mera", "meri", "mere", "mujhe", "hum", "humein",
    "batao", "bataiye", "kripya", "karo", "karna", "karein", "ji", "shukriya", "dhanyavad", "dhanyavaad",
    "kaise", "nahi", "nahin", "dekh", "dekhein", "dikhao", "dikha", "bhejo", "bhejiye", "liya", "diya",
    "achha", "acha", "theek", "gaya", "gayi", "gaye", "milega", "mil", "jayega", "uplabdh", "pata",
    "kab", "tak", "aayega", "bhi", "toh", "aur", "wala", "wali", "wale", "bhai", "namaste", "pranam",
    "kharab", "shikayat", "khareedna", "lena", "dena", "paise", "rupaye", "daam", "baat", "karni",
    "bheja", "rakha", "rakho", "thoda", "kam", "jyada", "sahi", "badhiya", "asli", "prajnaa", "shehad",
    "shahad", "badam", "akhrot", "giri", "bilona", "chahie", "batayein", "bataen"
  ]);

  const englishTokens = new Set([
    "tell", "about", "your", "product", "products", "what", "show", "catalogue", "catalog", "price",
    "cost", "how", "much", "want", "to", "buy", "order", "place", "where", "is", "my", "have", "made",
    "payment", "paid", "talk", "person", "human", "agent", "support", "help", "can", "you", "details",
    "available", "stock", "delivery", "shipping", "tracking", "status", "hello", "hi", "hey", "good",
    "morning", "evening", "thanks", "thank", "sorry", "please", "confirm", "send", "give", "need",
    "which", "items", "sell", "options", "rate", "pack", "size", "bottle", "jar", "address", "pincode"
  ]);

  const words = lower.split(/[^a-z0-9]+/i).filter(Boolean);
  let hinglishCount = 0;
  let englishCount = 0;

  for (const w of words) {
    if (hinglishTokens.has(w)) hinglishCount++;
    if (englishTokens.has(w)) englishCount++;
  }

  if (hinglishCount > englishCount && hinglishCount > 0) {
    return "hinglish";
  }
  if (englishCount > hinglishCount && englishCount > 0) {
    return "en";
  }

  // Single word greetings
  if (/^(namaste|pranam)\b/i.test(lower)) return "hinglish";
  if (/^(hi|hello|hey|good morning|good evening)\b/i.test(lower)) return "en";

  return contextLanguage || "en";
}

/**
 * Generates authoritative variants and packaging sizes for products.
 */
function deriveProductVariants(name: string, basePrice: number, baseWeight: string = "500g"): LiveProductVariant[] {
  const nl = name.toLowerCase();
  if (nl.includes("honey") || nl.includes("shehad")) {
    return [
      { name: "500g Glass Jar", weightGrams: 500, price: basePrice, stockStatus: "in_stock" },
      { name: "250g Glass Jar", weightGrams: 250, price: Math.round(basePrice * 0.56), stockStatus: "in_stock" },
      { name: "1kg Family Pack", weightGrams: 1000, price: Math.round(basePrice * 1.73), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("almond") || nl.includes("badam") || nl.includes("mamra")) {
    return [
      { name: "500g Pack", weightGrams: 500, price: basePrice, stockStatus: "in_stock" },
      { name: "1kg Pack", weightGrams: 1000, price: Math.round(basePrice * 1.94), stockStatus: "in_stock" },
      { name: "500g Mamra Giri", weightGrams: 500, price: Math.round(basePrice * 1.74), stockStatus: "in_stock" },
      { name: "1kg Mamra Giri", weightGrams: 1000, price: Math.round(basePrice * 3.33), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("walnut") || nl.includes("akhrot")) {
    return [
      { name: "500g Giri (Kernels)", weightGrams: 500, price: basePrice, stockStatus: "in_stock" },
      { name: "500g In-Shell", weightGrams: 500, price: Math.round(basePrice * 0.7), stockStatus: "in_stock" },
      { name: "1kg In-Shell", weightGrams: 1000, price: Math.round(basePrice * 1.3), stockStatus: "in_stock" },
      { name: "1kg Giri (Kernels)", weightGrams: 1000, price: Math.round(basePrice * 1.92), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("shilajit")) {
    return [
      { name: "20g Pure Himalayan Resin", weightGrams: 20, price: basePrice, stockStatus: "in_stock" },
      { name: "50g Pure Himalayan Resin", weightGrams: 50, price: Math.round(basePrice * 2.2), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("ghee") || nl.includes("bilona")) {
    return [
      { name: "1 Litre Glass Jar", weightGrams: 1000, price: basePrice, stockStatus: "in_stock" },
      { name: "500ml Glass Jar", weightGrams: 500, price: Math.round(basePrice * 0.55), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("saffron") || nl.includes("kesar")) {
    return [
      { name: "1g Authentic Kashmiri Mongra", weightGrams: 1, price: basePrice, stockStatus: "in_stock" },
      { name: "2g Gift Wooden Box", weightGrams: 2, price: Math.round(basePrice * 1.9), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("apricot") || nl.includes("khumani") || nl.includes("khubani")) {
    return [
      { name: "500g Sun-Dried Red Apricots", weightGrams: 500, price: basePrice, stockStatus: "in_stock" },
      { name: "1kg Ladakh Mountain Pack", weightGrams: 1000, price: Math.round(basePrice * 1.9), stockStatus: "in_stock" },
    ];
  }

  return [
    { name: baseWeight, weightGrams: 500, price: basePrice, stockStatus: "in_stock" },
  ];
}

/**
 * Fetches authoritative live products from PostgreSQL with fallback to verified catalog.
 */
export async function getLiveProductCatalogue(baseUrl?: string): Promise<LiveCatalogueItem[]> {
  const host = baseUrl || getAppBaseUrl();
  const products = await getAuthoritativeCrmProducts(host);
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    description: p.description,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    variants: p.variants,
    image: p.image,
    stockStatus: p.stockStatus,
    url: p.url.startsWith("http") ? p.url : `${host}${p.url.startsWith("/") ? p.url : `/${p.url}`}`,
  }));
}

/**
 * Searches the live catalogue for a specific requested product.
 */
export function findMatchingProduct(
  query: string,
  catalogue: LiveCatalogueItem[]
): LiveCatalogueItem | null {
  const q = (query || "").toLowerCase();

  const keywordsMap: Record<string, string[]> = {
    shilajit: ["shilajit", "silajit", "shilajeet", "resin", "शिलाजीत"],
    ghee: ["badri", "bilona", "cow ghee", "desi ghee", "a2", "ghee", "घी"],
    saffron: ["saffron", "kesar", "mongra", "zafran", "केसर", "मोंगरा"],
    honey: ["honey", "shehad", "shahad", "madhu", "raw flora", "multiflora", "शहद", "मधु"],
    almond: ["almond", "almonds", "badam", "badaam", "mamra", "kagzi almond", "बादाम", "मामरा"],
    walnut: ["walnut", "walnuts", "akhrot", "akhrot giri", "kagzi akhrot", "अखरोट"],
    apricot: ["apricot", "apricots", "khumani", "khubani", "ladakh apricot", "खुबानी", "खुमानी"],
    turmeric: ["turmeric", "haldi", "lakadong", "हल्दी"],
    salt: ["salt", "namak", "sendha", "rock salt", "pahadi namak", "नमक", "सेंधा"],
    pickle: ["pickle", "achar", "linguda", "galgal", "अचार"],
    seeds: ["seed", "seeds", "flax", "chia", "pumpkin", "aliv", "बीज"],
  };

  for (const [key, synonyms] of Object.entries(keywordsMap)) {
    if (synonyms.some((syn) => q.includes(syn))) {
      const match = catalogue.find((item) => {
        const itemText = `${item.name} ${item.slug} ${item.category}`.toLowerCase();
        return synonyms.some((syn) => itemText.includes(syn)) || itemText.includes(key);
      });
      if (match) return match;
    }
  }

  // Fallback direct name/slug substring matching without generic stopwords
  const stopWords = new Set([
    "himalayan", "pure", "organic", "natural", "fresh", "mountain",
    "market", "harvest", "authentic", "patron", "product", "products",
    "item", "items", "farm", "prajnaa", "prajna", "best", "good"
  ]);

  return (
    catalogue.find((item) => {
      const itemName = item.name.toLowerCase();
      const itemSlug = item.slug.toLowerCase().replace(/-/g, " ");
      return (
        q.includes(itemName) ||
        q.includes(itemSlug) ||
        itemName
          .split(" ")
          .some((w) => w.length > 3 && !stopWords.has(w) && q.includes(w))
      );
    }) || null
  );
}

/**
 * Checks whether this is the first incoming message in this customer's conversation.
 */
export async function isFirstCustomerMessage(phone: string): Promise<boolean> {
  const cleanPhone = extractCleanPhone(phone);
  if (!cleanPhone) return false;

  // Check in-memory feed
  const feed = globalThis.__globalWhatsAppFeed || [];
  const hasHistoryInFeed = feed.some((m) => {
    const from10 = (m.from || "").replace(/\D/g, "").slice(-10);
    const to10 = (m.to || "").replace(/\D/g, "").slice(-10);
    return from10 === cleanPhone || to10 === cleanPhone;
  });
  if (hasHistoryInFeed) return false;

  // Check PostgreSQL
  try {
    const pgPast = await withTimeout(
      db
        .select({ id: crmMessages.id })
        .from(crmMessages)
        .where(or(ilike(crmMessages.from, `%${cleanPhone}%`), ilike(crmMessages.to, `%${cleanPhone}%`)))
        .limit(2),
      1000,
      []
    );
    if (pgPast && pgPast.length > 1) {
      return false;
    }
  } catch {}

  // Check MongoDB
  try {
    const mongoDb = await withTimeout(getDatabase(), 1000, null);
    if (mongoDb) {
      const count = await withTimeout(
        mongoDb.collection("crm_messages").countDocuments({
          $or: [{ from: { $regex: cleanPhone } }, { to: { $regex: cleanPhone } }],
        }),
        1000,
        0
      );
      if (count > 1) {
        return false;
      }
    }
  } catch {}

  return true;
}

/**
 * Looks up the latest verified customer order from PostgreSQL or MongoDB.
 */
export async function getCustomerLatestOrder(phone: string): Promise<any | null> {
  const cleanPhone = extractCleanPhone(phone);
  if (!cleanPhone) return null;

  // 1. PostgreSQL crmOrders table (when configured)
  if (isPostgresConfigured) {
    try {
      const orders = await withTimeout(
        db
          .select()
          .from(crmOrders)
          .where(ilike(crmOrders.customerPhone, `%${cleanPhone}%`))
          .orderBy(desc(crmOrders.createdAt))
          .limit(1),
        1000,
        []
      );

      if (orders && orders.length > 0) {
        return orders[0];
      }
    } catch {}
  }

  // 2. MongoDB Atlas fallback
  try {
    const mongoDb = await withTimeout(getDatabase(), 1000, null);
    if (mongoDb) {
      const order = await withTimeout(
        mongoDb
          .collection("crm_orders")
          .findOne(
            { customerPhone: { $regex: cleanPhone } },
            { sort: { createdAt: -1 } }
          ),
        1000,
        null
      );
      if (order) return order;
    }
  } catch {}

  return null;
}

/**
 * Intelligent Intent Detector implementing all priority rules.
 * CRITICAL RULE: A specific customer request takes precedence over greetings.
 */
export function detectCustomerIntent(
  text: string,
  context?: {
    isFirstMessage?: boolean;
    explicitProduct?: LiveCatalogueItem | null;
    conversationContext?: ConversationContext;
  }
): CustomerIntent {
  const q = (text || "").toLowerCase().trim();

  // 1. Request to speak with a human agent
  if (
    q.includes("human") ||
    q.includes("agent") ||
    q.includes("nishant") ||
    q.includes("executive") ||
    q.includes("baat karni") ||
    q.includes("baat kraye") ||
    q.includes("phone par") ||
    q.includes("call me") ||
    q.includes("call karna") ||
    q.includes("helpline") ||
    q.includes("real person") ||
    q.includes("talk to a person") ||
    q.includes("speak to someone") ||
    q.includes("support team se") ||
    q.includes("kisi se baat")
  ) {
    return "human_handoff";
  }

  // 2. Complaint or damaged parcel issue
  if (
    q.includes("kharab") ||
    q.includes("damaged") ||
    q.includes("broken") ||
    q.includes("complaint") ||
    q.includes("shikayat") ||
    q.includes("galat item") ||
    q.includes("wrong product") ||
    q.includes("leak") ||
    q.includes("bekaar") ||
    q.includes("defective") ||
    q.includes("not happy") ||
    q.includes("quality issue") ||
    q.includes("refund") ||
    q.includes("return")
  ) {
    return "complaint";
  }

  // 3. Wholesale or bulk order enquiry
  if (
    q.includes("wholesale") ||
    q.includes("bulk") ||
    q.includes("b2b") ||
    q.includes("dealer") ||
    q.includes("distributor") ||
    q.includes("vyapar") ||
    q.includes("resell") ||
    q.includes("retailer") ||
    q.includes("100kg") ||
    q.includes("50kg") ||
    q.includes("badi quantity")
  ) {
    return "wholesale_enquiry";
  }

  // 4. Existing Order Status Enquiry
  if (
    q.includes("where is my order") ||
    q.includes("order status") ||
    q.includes("mera order") ||
    q.includes("track my order") ||
    q.includes("tracking") ||
    q.includes("track") ||
    q.includes("consignment") ||
    q.includes("kahan tak pahuncha") ||
    q.includes("kahan pahuncha") ||
    q.includes("kahan hai") ||
    q.includes("order kahan") ||
    q.includes("dispatch hua") ||
    q.includes("dispatch status") ||
    q.includes("parcel status") ||
    q.includes("has it been dispatched") ||
    q.includes("is it dispatched") ||
    q.includes("dispatched")
  ) {
    return "order_status";
  }

  // 5. Payment Enquiry / UPI
  if (
    q.includes("payment status") ||
    q.includes("i have made the payment") ||
    q.includes("i have paid") ||
    q.includes("payment kar diya") ||
    q.includes("paid already") ||
    q.includes("paise bhej diye") ||
    q.includes("payment done") ||
    q.includes("payment hui") ||
    q.includes("paise mile") ||
    q.includes("payment verify") ||
    q.includes("qr code") ||
    q.includes("upi id") ||
    q.includes("how to pay") ||
    q.includes("kahan pay karein") ||
    q.includes("paise kaise bheje") ||
    q.includes("screenshot dekh lo") ||
    q.includes("screenshot bheja") ||
    q.includes("utr")
  ) {
    return "payment_enquiry";
  }

  // 6. Delivery Timeline & Dispatch Enquiry ("Kab tak aayega?" / "Kab dispatch hoga?" / "How many days?")
  if (
    q.includes("kab tak aayega") ||
    q.includes("kab aayega") ||
    q.includes("kitne din lagenge") ||
    q.includes("delivery time") ||
    q.includes("when will deliver") ||
    q.includes("when will it reach") ||
    q.includes("how many days") ||
    q.includes("reach time") ||
    q.includes("dispatch enquiry") ||
    q.includes("kab tak dispatch") ||
    q.includes("kab dispatch") ||
    q.includes("dispatch kab") ||
    q.includes("dispatch date") ||
    q.includes("dispatch time") ||
    q.includes("when will it dispatch") ||
    q.includes("when will my order dispatch") ||
    q.includes("when will you dispatch") ||
    q.includes("will be dispatched") ||
    q.includes("when is dispatch") ||
    q.includes("dispatch timeline") ||
    q.includes("parcel dispatch") ||
    q.includes("order dispatch") ||
    q.includes("डिस्पैच")
  ) {
    return "delivery_enquiry";
  }

  // 7. Order Placement Intent ("I want to place an order" / "Mujhe order karna hai" / contextual "I want two" / "मुझे दो पैक चाहिए")
  const hasQuantityWord =
    /\b(?:one|two|three|four|five|do|ek|teen|chaar|\d+)\b|(?:^|[\s,।!?.])(?:एक|दो|तीन|चार|पांच)(?:[\s,।!?.]|$)/i.test(q);
  const hasOrderOrWantWord =
    /(?:i want|want|need|give me|send me|chahiye|de do|bhejo|चाहिए|भेज|दीजिए|order|buy|पैक|pack|jar|bottle|जार|बोतल)/i.test(q);
  const isContextualQuantityOrder =
    Boolean(context?.conversationContext?.lastDiscussedProductSlug) && hasQuantityWord && hasOrderOrWantWord;

  if (
    isContextualQuantityOrder ||
    q.includes("place an order") ||
    q.includes("place order") ||
    q.includes("want to order") ||
    q.includes("want to buy") ||
    q.includes("order now") ||
    q.includes("order karna hai") ||
    q.includes("order book karna") ||
    q.includes("mujhe order") ||
    q.includes("buy karna hai") ||
    q.includes("khareedna hai") ||
    q.includes("lena chahta") ||
    q.includes("lena chahti") ||
    q.includes("lena hai") ||
    q.includes("mangwana hai") ||
    q.includes("book my order")
  ) {
    return "order_placement";
  }

  // 8. Product Price Enquiry (e.g. "What is the price of honey?", "Honey kitne ka hai?", "How much does it cost?")
  if (
    q.includes("price") ||
    q.includes("cost") ||
    q.includes("rate") ||
    q.includes("how much") ||
    q.includes("kitne ka") ||
    q.includes("kitne ki") ||
    q.includes("kya price") ||
    q.includes("price kya") ||
    q.includes("rate kya") ||
    q.includes("daam") ||
    q.includes("kitne paise") ||
    q.includes("कीमत") ||
    q.includes("दाम")
  ) {
    return "price_enquiry";
  }

  // 9. Packaging & Quantity Enquiry
  if (
    q.includes("pack size") ||
    q.includes("packaging") ||
    q.includes("quantity") ||
    q.includes("kitna gm") ||
    q.includes("what sizes") ||
    q.includes("available sizes") ||
    q.includes("250g") ||
    q.includes("500g") ||
    q.includes("1kg") ||
    q.includes("jar") ||
    q.includes("bottle")
  ) {
    return "packaging_quantity_enquiry";
  }

  // 10. Product Availability Enquiry
  if (
    q.includes("available hai") ||
    q.includes("in stock") ||
    q.includes("stock mein") ||
    q.includes("mil jayega") ||
    q.includes("milega") ||
    q.includes("hai kya") ||
    q.includes("is it available") ||
    q.includes("do you have stock")
  ) {
    return "product_availability";
  }

  // 11. GENERAL PRODUCT CATALOGUE REQUEST
  // (Critical requirement: covers "Tell me about your products", "What products do you have?", "I want to know about your products", etc.)
  const cataloguePatterns = [
    /\b(?:catalogue|catalog|menu)\b/i,
    /^\s*products?\s*[?!.]*\s*$/i,
    /\ball\s+products?\b/i,
    /\b(?:all|our|your)?\s*products?\s*(?:list|catalog|catalogue|menu|details?|info|range|collection|variety)\b/i,
    /\b(?:list|details?|info|catalog|catalogue)\s*of\s*(?:all\s*)?products?\b/i,
    /\b(?:tell\s+me|know|hear|learn|read)\s+(?:more\s+)?about\s+(?:all\s+|your\s+|the\s+)?(?:natural\s+|organic\s+|himalayan\s+)?products?\b/i,
    /\b(?:what|which)\s+(?:natural\s+|organic\s+|himalayan\s+)?(?:products?|items?)\s+(?:do\s+you\s+have|do\s+you\s+sell|are\s+available|do\s+you\s+offer|are\s+there)\b/i,
    /\b(?:what|which)\s+(?:items?|products?)\s+(?:do\s+you|are)\b/i,
    /\b(?:what\s+are\s+your\s+products?|what\s+do\s+you\s+(?:sell|have|offer|make))\b/i,
    /\b(?:what\s+are\s+(?:the\s+)?products?\s+available)\b/i,
    /\b(?:show|send|share|give)\s+(?:me\s+)?(?:your\s+|all\s+)?(?:products?|catalogue|catalog|menu|items?)\b/i,
    /\b(?:about\s+your\s+products?|product\s+details?|products?\s+available)\b/i,
    /\b(?:aapke\s+)?(?:paas\s+)?(?:kya\s+kya|kaun\s+kaun\s+se?)\s+(?:products?|items?|milta\s+hai|bechte\s+ho|hai)\b/i,
    /\b(?:aapke\s+)?products?\s+(?:ke\s+baare\s+mein\s+batao|batao|dikhao|dikha\s+dijiye|list)\b/i,
    /\b(?:kya\s+kya\s+milta\s+hai|kya\s+bechte\s+ho|aapke\s+yahan\s+kya\s+milta\s+hai)\b/i,
    /\b(?:kya\s+products?\s+hain|products?\s+kya\s+hain)\b/i,
    /(?:उत्पाद|कैटलॉग|सामान की सूची|क्या क्या उत्पाद|क्या क्या मिलता है|क्या बेचते हैं|उत्पादों की जानकारी)/i,
  ];

  if (cataloguePatterns.some((pattern) => pattern.test(q))) {
    // If a specific product is also explicitly mentioned in the query (e.g. "Tell me about honey"), route to product_enquiry
    if (context?.explicitProduct) {
      return "product_enquiry";
    }
    return "catalogue_request";
  }

  // 12. Specific Product Enquiry (Honey, Almond, Walnut, etc. explicitly mentioned in text)
  if (context?.explicitProduct) {
    return "product_enquiry";
  }

  // 13. General Purity / Himalayan Origin Questions
  if (
    q.includes("organic") ||
    q.includes("pure") ||
    q.includes("asli") ||
    q.includes("natural") ||
    q.includes("chemical") ||
    q.includes("certified") ||
    q.includes("origin") ||
    q.includes("where do products come from")
  ) {
    return "general_question";
  }

  // 14. Pure Greeting (ONLY when the message contains solely a greeting word and nothing else)
  const isPureGreeting = /^(hi|hello|hey|namaste|namaste ji|pranam|hlo|good morning|good evening)$/i.test(q);
  if (isPureGreeting) {
    return context?.isFirstMessage ? "first_welcome_greeting" : "greeting";
  }

  // 15. Thank You & Gratitude ("Thank you", "Thanks", "Shukriya", "Dhanyawad")
  if (
    /^(?:thank\s*you|thanks|thank\s*u|thx|tq|ty|shukriya|dhanyawad|dhanyavad|bahut dhanyawad|thanks a lot|thank you so much|thanks for helping|thanks for the info|thanks for info|thank you ji|okay thanks|ok thanks|shukriya ji|dhanyawad ji)[\s.!]*$/i.test(q) ||
    /\b(?:thank\s*you\s*so\s*much|thanks\s*a\s*lot|thanks\s*for\s*(?:the\s*)?(?:info|help|information|details)|bahut\s*dhanyawad|aapka\s*shukriya)\b/i.test(q)
  ) {
    return "thank_you";
  }

  // 16. Acknowledgements ("Okay", "Ok", "Achha", "Theek hai", "Sure", "Fine", "Got it")
  if (
    /^(?:ok|okay|k|okk|alright|sure|fine|got\s*it|understood|achha|acha|theek\s*hai|theek|haan\s*ji|bilkul|sahi\s*hai|noted)[\s.!]*$/i.test(q)
  ) {
    return "acknowledgement";
  }

  // 17. Positive Responses ("Yes", "Definitely", "Sounds good", "Perfect", "Haan", "Ji haan")
  if (
    /^(?:yes|yeah|yep|yup|definitely|sounds\s*good|perfect|great|nice|haan|ji\s*haan|ha\s*ji|bilkul)[\s.!]*$/i.test(q)
  ) {
    return "positive_response";
  }

  // 18. Negative Responses ("No", "No thanks", "Not interested", "Maybe later", "Nahi", "Abhi nahi")
  if (
    /^(?:no|nah|nope|no\s*thanks|not\s*interested|maybe\s*later|nahi|nahin|nahi\s*ji|abhi\s*nahi|rehne\s*dijiye|rehne\s*do|zarurat\s*nahi)[\s.!]*$/i.test(q)
  ) {
    return "negative_response";
  }

  // 19. Casual Conversation ("How are you?", "How is your day?", "What are you doing?", "Aap kaise hain?")
  if (
    /\b(?:how\s*are\s*you|how\s*is\s*your\s*day|what\s*are\s*you\s*doing|are\s*you\s*available|aap\s*kaise\s*hain|kaise\s*ho|kya\s*haal|sab\s*badhiya|kya\s*kar\s*rahe\s*ho|sb\s*thik)\b/i.test(q)
  ) {
    return "casual_conversation";
  }

  // 20. Confusion & Clarification ("What do you mean?", "I don't understand", "Samajh nahi aaya")
  if (
    /\b(?:what\s*do\s*you\s*mean|i\s*don'?t\s*understand|can\s*you\s*explain|please\s*explain\s*again|samajh\s*nahi\s*aaya|thoda\s*detail\s*mein|clear\s*karein|phir\s*se\s*batao)\b/i.test(q)
  ) {
    return "clarification";
  }

  // 21. Follow-up Messages ("Any update?", "Waiting for your response", "Koi update?")
  if (
    /^(?:any\s*update|hello\?|are\s*you\s*there|waiting\s*for\s*(?:your\s*)?response|koi\s*update|reply\s*please|bataiye\s*ji|waiting)[\s?!.]*$/i.test(q) ||
    /\b(?:any\s*update\s*on\s*my|waiting\s*for\s*(?:your\s*)?reply|koi\s*update\s*hai)\b/i.test(q)
  ) {
    return "follow_up";
  }

  // 22. Closing / Bye ("Bye", "Good bye", "Good night", "Alvida")
  if (
    /^(?:bye|good\s*bye|see\s*you|alvida|take\s*care|good\s*night|gn)[\s.!]*$/i.test(q)
  ) {
    return "closing";
  }

  // 23. Fallback
  return "unclear_intent";
}

/**
 * Extracts customer name if introduced in conversational text.
 */
export function extractCustomerNameFromText(text: string): string | null {
  const clean = (text || "").trim();
  if (!clean) return null;
  const introMatch = clean.match(
    /(?:mera\s+naam|my\s+name\s+is|this\s+is|i\s+am|iam|main|mai|naam|name\s*:?)\s+([A-Za-z\u0900-\u097F\s]{2,30})/i
  );
  if (introMatch && introMatch[1]) {
    const raw = introMatch[1].replace(/(?:hai|hu|hoon|ji|here|this side)\b.*$/i, "").trim();
    if (raw.length >= 2 && raw.length <= 30) {
      return raw
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }
  }
  return null;
}

/**
 * Multilingual, short, crisp, meaningful template bank.
 */
export const TEMPLATES = {
  welcome: {
    en: "Namaste! 🙏 Welcome to Prajnaa Farmer Market – Authentic Himalayan Pure Products.\n\nHow can we help you today?\n• 🌿 Explore Our Pure Himalayan Products: {catalogueLink}\n• 📦 Track an existing order\n• 💬 Ask any product question or pricing",
    hinglish: "Namaste ji! 🙏 Prajnaa Farmer Market mein aapka swagat hai.\n\nHum aapki kya sahayata kar sakte hain?\n• 🌿 Hamara Product Catalogue dekhein: {catalogueLink}\n• 📦 Order status check karein\n• 💬 Products ki jaankari ya price poochhein",
    hi: "नमस्ते जी! 🙏 प्रज्ञा फार्मर मार्केट में आपका स्वागत है।\n\nहम आपकी क्या सहायता कर सकते हैं?\n• 🌿 हमारा उत्पाद कैटलॉग देखें: {catalogueLink}\n• 📦 आर्डर स्टेटस चेक करें\n• 💬 उत्पादों की जानकारी या कीमत जानें",
  },
  catalogue: {
    en: "Namaste! 🙏 Welcome to Prajnaa Farmer Market. We bring 100% pure, lab-tested, and ethically harvested natural products directly from high-altitude Himalayan farmers:\n\n🌿 *Our Top Himalayan Best-Sellers:*\n1. 🍯 *Himalayan Raw Multiflora Honey* (500g Glass Jar) – ₹550\n2. 🏔️ *Pure Himalayan Shilajit Resin* (20g Lab Certified) – ₹1,450\n3. 🧈 *A2 Badri Cow Bilona Desi Ghee* (1 Litre) – ₹2,100\n4. 🌰 *Kashmiri Mamra Almonds* (500g Premium) – ₹1,250\n5. 🌸 *Pure Kashmiri Mongra Saffron* (1g Grade A) – ₹380\n6. 🥜 *Kashmiri Kagzi Walnuts / Akhrot Kernels* (500g) – ₹650\n\n📦 *Pan-India doorstep delivery* with artisan mountain packing.\nExplore our complete product catalogue here: {catalogueLink}\n\nWhich product would you like to know more about or order?",
    hinglish: "Namaste ji! 🙏 Prajnaa Farmer Market mein aapka swagat hai. Hum high-altitude Himalayas ke kisaano se 100% shuddh, natural aur lab-tested products direct aap tak pahunchate hain:\n\n🌿 *Hamare Top Himalayan Products:*\n1. 🍯 *Himalayan Raw Multiflora Honey* (500g) – ₹550\n2. 🏔️ *Pure Himalayan Shilajit Resin* (20g Lab Certified) – ₹1,450\n3. 🧈 *A2 Badri Cow Bilona Desi Ghee* (1 Litre) – ₹2,100\n4. 🌰 *Kashmiri Mamra Badam* (500g) – ₹1,250\n5. 🌸 *Pure Kashmiri Mongra Kesar* (1g) – ₹380\n6. 🥜 *Kashmiri Kagzi Akhrot Giri* (500g) – ₹650\n\n📦 *Poore Bharat mein fast home delivery* uplabdh hai.\nHamara latest product catalogue yahan dekhein: {catalogueLink}\n\nAapko kis product ke baare mein jaanna hai ya order book karna hai, bataiye ji?",
    hi: "नमस्ते जी! 🙏 प्रज्ञा फार्मर मार्केट में आपका स्वागत है। हम उच्च हिमालयी क्षेत्रों के किसानों से 100% शुद्ध, प्राकृतिक और लैब-प्रमाणित उत्पाद सीधे आप तक पहुंचाते हैं:\n\n🌿 *हमारे प्रमुख हिमालयी उत्पाद:*\n1. 🍯 *हिमालयन रॉ फ्लोरा शहद* (500g) – ₹550\n2. 🏔️ *शुद्ध हिमालयन शिलाजीत रेजिन* (20g) – ₹1,450\n3. 🧈 *A2 बद्री गाय का बिलोना देसी घी* (1L) – ₹2,100\n4. 🌰 *कश्मीरी मामरा बादाम* (500g) – ₹1,250\n5. 🌸 *कश्मीरी मोंगरा केसर* (1g) – ₹380\n6. 🥜 *कश्मीरी कागज़ी अखरोट गिरी* (500g) – ₹650\n\n📦 *पूरे भारत में सुरक्षित होम डिलीवरी* उपलब्ध है।\nजी बिल्कुल! हमारा पूरा प्रोडक्ट कैटलॉग यहाँ देखें: {catalogueLink}\n\nआप किस उत्पाद की जानकारी चाहते हैं या ऑर्डर करना चाहते हैं, कृपया बताएं?",
  },
  price: {
    en: "Our {productName} ({packaging}) is available for ₹{livePrice}. View details: {productLink}",
    hinglish: "Ji, {productName} ({packaging}) ki price ₹{livePrice} hai. Details: {productLink}",
    hi: "जी, {productName} ({packaging}) की कीमत ₹{livePrice} है। विवरण: {productLink}",
  },
  product_details: {
    en: "Our {productName} ({packaging}) is ₹{livePrice}. 100% pure Himalayan harvest: {productLink}",
    hinglish: "Ji haan! {productName} ({packaging}) available hai. Price: ₹{livePrice}. Details: {productLink}",
    hi: "जी, {productName} ({packaging}) उपलब्ध है। कीमत: ₹{livePrice}। विवरण: {productLink}",
  },
  product_out_of_stock: {
    en: "Currently {productName} is out of stock. Our team will notify you once the fresh batch arrives.",
    hinglish: "Ji, {productName} abhi stock mein uplabdh nahi hai. Fresh batch aate hi hum aapse connect karenge.",
    hi: "जी, {productName} अभी स्टॉक में उपलब्ध नहीं है। नया बैच आते ही हम आपको सूचित करेंगे।",
  },
  order_prompt: {
    en: "Please share the product and quantity you'd like to order.",
    hinglish: "Product aur quantity bata dijiye ji, hum turant book kar denge.",
    hi: "कृपया प्रोडक्ट का नाम और मात्रा बताएं, हम तुरंत ऑर्डर बुक कर देंगे।",
  },
  order_with_product_prompt: {
    en: "Please share your delivery name, full address, and pincode to confirm your order of {productName}.",
    hinglish: "Bilkul ji! Delivery ke liye apna naam, poora address aur pincode share kar dijiye, hum aapka order turant confirm kar dete hain.",
    hi: "डिलीवरी के लिए कृपया अपना नाम, पूरा पता और पिनकोड साझा करें, हम तुरंत ऑर्डर बुक कर देंगे।",
  },
  order_status_with_order: {
    en: "Your order #{orderNumber} is currently {status}.",
    hinglish: "Ji, aapka order #{orderNumber} abhi {status} hai.",
    hi: "जी, आपका ऑर्डर #{orderNumber} अभी {status} है।",
  },
  order_status_ask_number: {
    en: "Please share your order number so we can check the status.",
    hinglish: "Ji, apna order number share kar dijiye, hum check karte hain.",
    hi: "कृपया अपना ऑर्डर नंबर साझा करें, हम तुरंत स्टेटस चेक करते हैं।",
  },
  payment_confirmed: {
    en: "Your payment has been confirmed. Thank you!",
    hinglish: "Aapka payment confirm ho gaya hai ji. Dhanyavaad!",
    hi: "आपका भुगतान कन्फर्म हो गया है। धन्यवाद!",
  },
  payment_pending: {
    en: "Your payment is pending for order #{orderNumber}. Amount: ₹{amount}. Official UPI: prajnaa@upi.",
    hinglish: "Aapka payment pending hai ji. Order #{orderNumber} (₹{amount}). Official UPI: prajnaa@upi.",
    hi: "ऑर्डर #{orderNumber} के लिए ₹{amount} का भुगतान लंबित है। आधिकारिक UPI: prajnaa@upi.",
  },
  payment_instructions: {
    en: "You can pay via our official UPI ID: prajnaa@upi. Please share the screenshot once done.",
    hinglish: "Aap hamare official UPI ID `prajnaa@upi` par payment kar sakte hain. Payment ke baad screenshot yahan share karein.",
    hi: "आप हमारे आधिकारिक UPI ID `prajnaa@upi` पर भुगतान कर सकते हैं। भुगतान के बाद स्क्रीनशॉट यहाँ साझा करें।",
  },
  dispatched: {
    en: "Good news! Your order #{orderNumber} has been shipped from our Solan mountain hub. We will share live updates at each transit location.",
    hinglish: "Good news ji! Aapka Prajnaa order #{orderNumber} ship ho gaya hai. Hum aapko har transit location ki live update bhejte rahenge.",
    hi: "शुभ समाचार! आपका प्रज्ञा ऑर्डर #{orderNumber} शिप हो गया है। हम आपको हर लोकेशन की लाइव अपडेट भेजते रहेंगे।",
  },
  transit_location: {
    en: "Update on order #{orderNumber}: Your package has reached {location} and is on its way to you.",
    hinglish: "Namaste ji! Aapka order #{orderNumber} abhi {location} pahunch chuka hai aur aage transit mein hai.",
    hi: "नमस्ते जी! आपका ऑर्डर #{orderNumber} अभी {location} पहुँच चुका है और आपके पते की ओर रवाना हो रहा है।",
  },
  delivering_tomorrow: {
    en: "Delivery alert: Your order #{orderNumber} will be delivered tomorrow! Please keep your phone reachable.",
    hinglish: "Zaroori update ji: Aapka order #{orderNumber} kal deliver ho jayega. Kripya parcel receive karne ke liye phone available rakhein.",
    hi: "ज़रूरी अपडेट: आपका ऑर्डर #{orderNumber} कल डिलीवर हो जाएगा जी! कृपया पार्सल प्राप्त करने के लिए फोन उपलब्ध रखें।",
  },
  delivery_timeline: {
    en: "Artisan packing takes 2–3 days, and delivery takes 3–5 working days. We send live updates when your order is shipped, at each location, and one day before delivery.",
    hinglish: "Packing mein 2–3 din lagte hain aur delivery mein 3–5 working days lagte hain ji. Parcel ship hone par, har transit location par aur delivery se ek din pehle hum aapko live WhatsApp update bhejte hain.",
    hi: "पैकिंग में 2–3 दिन और डिलीवरी में 3–5 कार्यदिवस लगते हैं। ऑर्डर शिप होने पर, हर लोकेशन पर और डिलीवरी से एक दिन पहले हम आपको ऑटोमेटेड अपडेट भेजते हैं।",
  },
  dispatch_enquiry: {
    en: "Namaste! Your order #{orderNumber} is undergoing fresh artisan packaging at our mountain hub. Orders are typically dispatched within 2–3 days. You will receive an automated WhatsApp update as soon as your parcel ships! 🌿",
    hinglish: "Namaste ji! Aapka order #{orderNumber} hamare mountain hub par fresh packaging mein hai. Orders aamtaur par 2–3 din mein dispatch hote hain. Jaise hi parcel ship hoga, aapko yahan WhatsApp par automated update mil jayegi! 🌿",
    hi: "नमस्ते जी! आपका ऑर्डर #{orderNumber} हमारे हिमालयन हब पर ताज़ा पैकिंग में है। ऑर्डर आमतौर पर 2-3 दिनों में डिस्पैच हो जाते हैं। जैसे ही पार्सल शिप होगा, आपको यहाँ व्हाट्सएप पर तुरंत सूचना मिल जाएगी! 🌿",
  },
  dispatch_general: {
    en: "Namaste! Prajnaa Market orders undergo fresh artisan packaging at our mountain hub and are dispatched within 2–3 days. Please share your Order ID and we will check the exact status for you! 🌿",
    hinglish: "Namaste ji! Prajnaa Market ke orders hamare mountain hub par fresh pack hokar 2–3 din mein dispatch hote hain. Kripya apna Order ID share kar dijiye taaki hum turant status check karke bata sakein! 🌿",
    hi: "नमस्ते जी! प्रज्ञा मार्केट के ऑर्डर हमारे हिमालयन हब पर ताज़ा पैक होकर 2-3 दिनों में डिस्पैच होते हैं। कृपया अपना ऑर्डर नंबर साझा करें ताकि हम तुरंत स्थिति बता सकें! 🌿",
  },
  complaint: {
    en: "Sorry for the inconvenience. Our team will contact you shortly.",
    hinglish: "Asuvidha ke liye maafi chahte hain ji. Team jald connect karegi.",
    hi: "असुविधा के लिए क्षमा चाहते हैं जी। हमारी टीम जल्द ही आपसे संपर्क करेगी।",
  },
  wholesale: {
    en: "For wholesale and bulk orders, our sales team will connect with you directly.",
    hinglish: "Wholesale aur bulk orders ke liye hamari sales team aapse direct connect karegi.",
    hi: "थोक और बल्क ऑर्डर के लिए हमारी सेल्स टीम आपसे सीधे संपर्क करेगी।",
  },
  general_purity: {
    en: "All Prajnaa products are 100% natural, lab-tested, and sourced directly from high-altitude Himalayan farmers.",
    hinglish: "Ji, Prajnaa ke sabhi products 100% natural aur high-altitude Himalayan farmers se direct aate hain.",
    hi: "जी, प्रज्ञा के सभी उत्पाद 100% प्राकृतिक और हिमालयी किसानों से सीधे प्राप्त होते हैं।",
  },
  human_handoff: {
    en: "Our store admin will connect with you shortly.",
    hinglish: "Nishant ji jald hi aapse connect karenge.",
    hi: "हमारे स्टोर एडमिन जल्द ही आपसे संपर्क करेंगे।",
  },
  unclear_fallback: {
    en: "Sorry, I couldn't understand your query. Our store admin will connect with you shortly. You can also explore our authentic Himalayan products catalogue here: {catalogueLink}",
    hinglish: "Maaf kijiye ji, main aapki baat samajh nahi paaya. Nishant ji jald hi aapse connect karenge. Hamara product catalogue yahan dekhein: {catalogueLink}",
    hi: "क्षमा कीजिए, हम आपकी बात समझ नहीं पाए। हमारे स्टोर एडमिन जल्द ही आपसे संपर्क करेंगे। हमारा प्रोडक्ट कैटलॉग यहाँ देखें: {catalogueLink}",
  },
};

/**
 * Replaces dynamic variables safely without leaving any {placeholders}.
 */
function fillTemplate(
  templateString: string,
  variables: Record<string, string | number | undefined | null>
): string {
  let filled = templateString;
  for (const [key, val] of Object.entries(variables)) {
    const replacement = val !== undefined && val !== null ? String(val) : "";
    filled = filled.split(`{${key}}`).join(replacement);
  }
  // Clean up any remaining unreplaced {variable} patterns while preserving multiline formatting
  return filled.replace(/\{[a-zA-Z0-9_]+\}/g, "").replace(/[^\S\r\n]{2,}/g, " ").trim();
}

/**
 * Intelligent Smart Assistant Engine.
 * Evaluates context, queries live database, detects language, and generates short, crisp responses.
 */
export async function processSmartCustomerReply(params: {
  customerPhone: string;
  customerText: string;
  customerName?: string;
  reqHost?: string;
}): Promise<{
  replyText: string;
  intent: CustomerIntent;
  shouldSend: boolean;
  handoffRequired?: boolean;
  updatedCustomerName?: string;
  detectedLanguage: SupportedLanguage;
  templateId?: string;
}> {
  const cleanPhone = extractCleanPhone(params.customerPhone);
  const rawText = (params.customerText || "").trim();
  const normalizedText = normalizeCustomerMessage(rawText);
  const host = getAppBaseUrl(params.reqHost);
  const catalogueUrl = `${host}/catalogue`;

  // Retrieve or create conversation context
  const context = getConversationContext(cleanPhone);
  const extractedName = extractCustomerNameFromText(rawText);
  const updatedCustomerName = extractedName || params.customerName || context.customerName;

  // 1. Detect customer's language with mid-conversation switching support
  const detectedLanguage = detectMessageLanguage(normalizedText, context.language);
  updateConversationContext(cleanPhone, {
    language: detectedLanguage,
    customerName: updatedCustomerName,
    messageCount: context.messageCount + 1,
  });

  // Safeguard 1: Human Agent Takeover active check
  if (isHumanAgentActive(cleanPhone) || context.handoffActive) {
    return {
      replyText: "",
      intent: "human_handoff",
      shouldSend: false,
      handoffRequired: true,
      updatedCustomerName,
      detectedLanguage,
    };
  }

  // Fetch live catalogue from database / registry
  const catalogue = await getLiveProductCatalogue(host);

  // Extract entities (Product, Variant, Quantity, Order Number, Address, Payment Ref)
  const entities = extractEntities(normalizedText, catalogue, context);

  // Classify Customer Intent & SubIntent using semantic rules and context
  const classification = classifyCustomerIntent(normalizedText, context, entities, catalogue);

  // Determine matched product for context updating
  const matchedProduct = entities.product;
  if (matchedProduct) {
    updateConversationContext(cleanPhone, {
      lastDiscussedProductSlug: matchedProduct.slug,
      lastDiscussedProductName: matchedProduct.name,
      lastDiscussedPrice: matchedProduct.price,
      lastDiscussedVariant: entities.variantName || matchedProduct.variants[0]?.name || "500g Glass Jar",
    });
  }
  if (entities.quantity) {
    updateConversationContext(cleanPhone, {
      lastDiscussedQuantity: entities.quantity,
    });
  }

  // Look up latest verified order if needed for order/payment/shipping queries
  let latestOrder: any = null;
  const isOrderRelated =
    classification.intent === "order_status" ||
    classification.intent === "payment_enquiry" ||
    classification.intent === "delivery_enquiry";

  if (isOrderRelated) {
    latestOrder = await getCustomerLatestOrder(cleanPhone);
  }

  // Determine specific template ID
  let selectedTemplateId = classification.templateId;

  // Specific dynamic sub-routing based on verified order state
  if (classification.intent === "order_status") {
    if (latestOrder && latestOrder.orderNumber) {
      const rawStatus = (latestOrder.status || "Processing").toLowerCase();
      const stage = (latestOrder.shippingStage || latestOrder.stage || "").toLowerCase();
      const loc = latestOrder.currentLocation || latestOrder.transitLocation || latestOrder.location || "";

      if (stage === "delivering_tomorrow" || rawStatus === "delivering_tomorrow" || rawStatus.includes("tomorrow")) {
        selectedTemplateId = "auto_status_delivering_tomorrow";
      } else if (loc || stage === "in_transit" || rawStatus === "in_transit" || rawStatus === "in transit") {
        selectedTemplateId = "auto_status_in_transit";
      } else if (rawStatus === "shipped" || rawStatus === "dispatched" || latestOrder.consignmentNumber) {
        selectedTemplateId = "auto_status_dispatched";
      } else {
        selectedTemplateId = "auto_status_packing";
      }
    } else {
      selectedTemplateId = "auto_status_ask_number";
    }
  } else if (classification.intent === "payment_enquiry") {
    const isPaid = latestOrder && (latestOrder.paymentStatus === "paid" || latestOrder.paymentStatus === "collected");
    if (isPaid) {
      selectedTemplateId = "auto_pay_confirmed";
    } else if (latestOrder && latestOrder.totalPaise) {
      selectedTemplateId = "auto_pay_pending_with_amount";
    }
  } else if (classification.intent === "delivery_enquiry") {
    if (latestOrder && latestOrder.orderNumber) {
      const rawStatus = (latestOrder.status || "").toLowerCase();
      const stage = (latestOrder.shippingStage || latestOrder.stage || "").toLowerCase();
      const loc = latestOrder.currentLocation || latestOrder.transitLocation || latestOrder.location || "";

      if (stage === "delivering_tomorrow" || rawStatus === "delivering_tomorrow" || rawStatus.includes("tomorrow")) {
        selectedTemplateId = "auto_status_delivering_tomorrow";
      } else if (loc || stage === "in_transit" || rawStatus === "in_transit" || rawStatus === "in transit") {
        selectedTemplateId = "auto_status_in_transit";
      } else if (rawStatus === "shipped" || rawStatus === "dispatched" || latestOrder.consignmentNumber) {
        selectedTemplateId = "auto_status_dispatched";
      }
    }
  }

  // Handle stage transitions
  if (classification.intent === "order_placement") {
    if (entities.hasAddressIndicator) {
      updateConversationContext(cleanPhone, { activeStage: "order_confirmed" });
    } else if (entities.quantity || context.lastDiscussedQuantity) {
      updateConversationContext(cleanPhone, { activeStage: "awaiting_address" });
    } else {
      updateConversationContext(cleanPhone, { activeStage: "awaiting_quantity" });
    }
  } else if (classification.intent === "product_enquiry" || classification.intent === "price_enquiry") {
    updateConversationContext(cleanPhone, { activeStage: "discussing_product" });
  } else if (classification.intent === "catalogue_request") {
    updateConversationContext(cleanPhone, { activeStage: "browsing" });
  }

  // Handle human takeover triggers
  let handoffRequired = false;
  if (
    classification.category === "complaints_returns_refunds" ||
    classification.intent === "complaint"
  ) {
    setHumanAgentHandoff(cleanPhone, "Support Escalation");
    handoffRequired = true;
  } else if (
    classification.intent === "human_handoff" ||
    selectedTemplateId === "auto_handoff_explicit_request"
  ) {
    setHumanAgentHandoff(cleanPhone, "Nishant (Store Desk)");
    handoffRequired = true;
  }

  // Retrieve template from internal automated template library
  const matchedTemplate =
    (selectedTemplateId ? getAutomatedTemplateById(selectedTemplateId) : undefined) ||
    findBestAutomatedTemplate(classification.intent, classification.subIntent);

  // Prepare variable substitutions
  const variantName =
    entities.variantName ||
    context.lastDiscussedVariant ||
    matchedProduct?.variants[0]?.name ||
    "500g Glass Jar";

  const priceVal =
    entities.variant?.price ||
    matchedProduct?.price ||
    context.lastDiscussedPrice ||
    550;

  const orderNum =
    entities.orderNumber ||
    latestOrder?.orderNumber ||
    "PM-9021";

  const orderAmt = latestOrder?.totalPaise
    ? Math.round(latestOrder.totalPaise / 100).toLocaleString("en-IN")
    : "1,100";

  const orderLocation =
    latestOrder?.currentLocation ||
    latestOrder?.transitLocation ||
    latestOrder?.location ||
    (detectedLanguage === "en" ? "Regional Sorting Hub" : "Sorting Hub");

  const orderStatusText =
    latestOrder?.status ||
    (detectedLanguage === "en" ? "being packed at our Solan mountain hub" : "artisan packing mein hai");

  const productLinkUrl = matchedProduct?.url || catalogueUrl;

  const variables: Record<string, string | number> = {
    catalogueLink: catalogueUrl,
    productLink: productLinkUrl,
    productName: matchedProduct?.name || context.lastDiscussedProductName || "Himalayan Pure Products",
    packaging: variantName,
    livePrice: priceVal.toLocaleString("en-IN"),
    quantity: entities.quantity || context.lastDiscussedQuantity || 1,
    orderNumber: orderNum,
    amount: orderAmt,
    location: orderLocation,
    status: orderStatusText,
    phone: cleanPhone,
    customerName: updatedCustomerName || "Customer",
  };

  // Render response in customer's detected language
  const replyText = renderAutomatedTemplate(matchedTemplate, detectedLanguage, variables);

  updateConversationContext(cleanPhone, {
    lastIntent: classification.intent as CustomerIntent,
  });

  return {
    replyText,
    intent: classification.intent as CustomerIntent,
    shouldSend: true,
    handoffRequired,
    updatedCustomerName,
    detectedLanguage,
    templateId: matchedTemplate.id,
  };
}
