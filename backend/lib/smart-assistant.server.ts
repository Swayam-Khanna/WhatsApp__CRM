import { db } from "../db.ts";
import { farmerProducts, productInventory } from "../schema/index.ts";
import { crmOrders, crmMessages } from "../schema/crm.ts";
import { eq, desc, or, ilike } from "drizzle-orm";
import { allProducts as staticCatalog } from "../../frontend/lib/mock/products.ts";
import { getDatabase } from "../../lib/mongodb.ts";

export type CustomerIntent =
  | "first_welcome_greeting"
  | "greeting"
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
  | "human_handoff";

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

// In-memory human takeover tracker: pauses automated replies when an agent takes over
declare global {
  // eslint-disable-next-line no-var
  var __crmHumanTakeoverSessions: Map<string, { agentName: string; pausedAt: number }> | undefined;
}

if (!globalThis.__crmHumanTakeoverSessions) {
  globalThis.__crmHumanTakeoverSessions = new Map();
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
}

/**
 * Releases human handoff, re-enabling automated responses.
 */
export function releaseHumanAgentHandoff(phone: string) {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  if (!cleanPhone) return;
  globalThis.__crmHumanTakeoverSessions?.delete(cleanPhone);
}

/**
 * Resolves the public base URL of the application.
 */
export function getAppBaseUrl(reqHost?: string): string {
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  if (process.env.BETTER_AUTH_URL && !process.env.BETTER_AUTH_URL.includes("localhost")) {
    return process.env.BETTER_AUTH_URL.replace(/\/+$/, "");
  }
  if (reqHost && !reqHost.includes("localhost")) {
    const protocol = reqHost.includes("prajnaa.in") ? "https" : "http";
    return `${protocol}://${reqHost}`;
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
 * Generates authoritative variants and packaging sizes for products.
 */
function deriveProductVariants(name: string, basePrice: number, baseWeight: string = "500g"): LiveProductVariant[] {
  const nl = name.toLowerCase();
  if (nl.includes("honey") || nl.includes("shehad")) {
    return [
      { name: "250g Glass Jar", weightGrams: 250, price: Math.round(basePrice * 0.55), stockStatus: "in_stock" },
      { name: "500g Glass Jar", weightGrams: 500, price: basePrice, stockStatus: "in_stock" },
      { name: "1kg Family Pack", weightGrams: 1000, price: Math.round(basePrice * 1.8), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("almond") || nl.includes("badam") || nl.includes("mamra")) {
    return [
      { name: "250g Pouch", weightGrams: 250, price: Math.round(basePrice * 0.55), stockStatus: "in_stock" },
      { name: "500g Sealed Pack", weightGrams: 500, price: basePrice, stockStatus: "in_stock" },
      { name: "1kg Mountain Value Pack", weightGrams: 1000, price: Math.round(basePrice * 1.9), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("walnut") || nl.includes("akhrot")) {
    return [
      { name: "500g In-Shell", weightGrams: 500, price: Math.round(basePrice * 0.7), stockStatus: "in_stock" },
      { name: "500g Giri (Kernels)", weightGrams: 500, price: basePrice, stockStatus: "in_stock" },
      { name: "1kg Giri (Kernels)", weightGrams: 1000, price: Math.round(basePrice * 1.9), stockStatus: "in_stock" },
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
      { name: "500ml Glass Jar", weightGrams: 500, price: Math.round(basePrice * 0.55), stockStatus: "in_stock" },
      { name: "1 Litre Glass Jar", weightGrams: 1000, price: basePrice, stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("saffron") || nl.includes("kesar")) {
    return [
      { name: "1g Authentic Kashmiri Mongra", weightGrams: 1, price: basePrice, stockStatus: "in_stock" },
      { name: "2g Gift Wooden Box", weightGrams: 2, price: Math.round(basePrice * 1.9), stockStatus: "in_stock" },
      { name: "5g Festive Pack", weightGrams: 5, price: Math.round(basePrice * 4.5), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("apricot")) {
    return [
      { name: "500g Sun-Dried Red Apricots", weightGrams: 500, price: basePrice, stockStatus: "pre_order" },
      { name: "1kg Ladakh Mountain Pack", weightGrams: 1000, price: Math.round(basePrice * 1.9), stockStatus: "pre_order" },
    ];
  }

  // Default packaging option
  return [
    { name: baseWeight, weightGrams: 500, price: basePrice, stockStatus: "in_stock" },
  ];
}

/**
 * Fetches authoritative live products from PostgreSQL with fallback to verified catalog.
 */
export async function getLiveProductCatalogue(baseUrl?: string): Promise<LiveCatalogueItem[]> {
  const host = baseUrl || getAppBaseUrl();
  const catalogueUrl = `${host}/catalogue`;

  let dbProducts: any[] = [];
  try {
    const rows = await withTimeout(
      db
        .select({
          product: farmerProducts,
          inventory: productInventory,
        })
        .from(farmerProducts)
        .leftJoin(productInventory, eq(farmerProducts.id, productInventory.productId))
        .orderBy(desc(farmerProducts.createdAt)),
      1500,
      []
    );

    if (rows && rows.length > 0) {
      dbProducts = rows.map(({ product, inventory }) => {
        const basePrice = Math.round(product.price || 999);
        const variants = deriveProductVariants(product.name, basePrice, product.unit || "500g");
        let stockStatus: LiveCatalogueItem["stockStatus"] = "in_stock";
        const currentStock = inventory?.quantity ?? product.stock ?? 10;
        if (currentStock <= 0) stockStatus = "out_of_stock";
        else if (currentStock < 5) stockStatus = "few_left";

        const img = Array.isArray(product.images) && product.images.length > 0
          ? product.images[0]
          : "/assets/cat-honey.jpg";

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          category: product.category || "Himalayan Harvest",
          description: product.description || "100% pure Himalayan mountain harvest direct from partner farmers.",
          price: basePrice,
          compareAtPrice: product.compareAtPrice ? Math.round(product.compareAtPrice) : null,
          variants,
          image: img,
          stockStatus,
          url: `${catalogueUrl}#${product.slug}`,
        };
      });
    }
  } catch (err: any) {
    console.warn("[Smart Assistant] Database product fetch note:", err?.message || err);
  }

  // Complement with verified static items if not already present
  const existingSlugs = new Set(dbProducts.map((p) => p.slug.toLowerCase()));
  const staticItems: LiveCatalogueItem[] = staticCatalog
    .filter((sp) => !existingSlugs.has(sp.slug.toLowerCase()))
    .map((sp) => {
      const basePrice = Math.round(sp.price || 999);
      const variants = deriveProductVariants(sp.name, basePrice, (sp as any).weight || "500g");
      const img = (sp as any).image || (Array.isArray(sp.images) && sp.images[0]) || "/assets/cat-honey.jpg";

      let stockStatus: LiveCatalogueItem["stockStatus"] = "in_stock";
      if ((sp as any).stock === 0) {
        stockStatus = (sp as any).is_preorder ? "pre_order" : "out_of_stock";
      }

      return {
        id: (sp as any).id || sp.slug,
        name: sp.name,
        slug: sp.slug,
        category: sp.category || "Mountain Produce",
        description: (sp as any).description || "Pure certified organic harvest from high-altitude Himalayan valleys.",
        price: basePrice,
        compareAtPrice: (sp as any).mrp ? Math.round((sp as any).mrp) : null,
        variants,
        image: img,
        stockStatus,
        url: `${catalogueUrl}#${sp.slug}`,
      };
    });

  // Ensure flagship Himalayan products are present in catalogue
  const coreFallbackProducts: LiveCatalogueItem[] = [
    {
      id: "prod_honey",
      name: "Himalayan Raw Flora Honey",
      slug: "himalayan-multiflora-honey",
      category: "Honey",
      description: "100% pure raw multi-flora forest harvest from high-altitude Himalayan beekeepers.",
      price: 550,
      compareAtPrice: 650,
      variants: [
        { name: "250g Glass Jar", weightGrams: 250, price: 310, stockStatus: "in_stock" },
        { name: "500g Glass Jar", weightGrams: 500, price: 550, stockStatus: "in_stock" },
        { name: "1kg Family Pack", weightGrams: 1000, price: 950, stockStatus: "in_stock" },
      ],
      image: "/assets/cat-honey.jpg",
      stockStatus: "in_stock",
      url: `${catalogueUrl}#himalayan-multiflora-honey`,
    },
    {
      id: "prod_shilajit",
      name: "Pure Himalayan Shilajit Resin",
      slug: "pure-himalayan-shilajit",
      category: "Wellness & Shilajit",
      description: "Gold grade pure Himalayan Shilajit resin with 75%+ fulvic acid content.",
      price: 1450,
      compareAtPrice: 1800,
      variants: [
        { name: "20g Pure Resin", weightGrams: 20, price: 1450, stockStatus: "in_stock" },
        { name: "50g Pure Resin", weightGrams: 50, price: 3190, stockStatus: "in_stock" },
      ],
      image: "/assets/cat-herbs.jpg",
      stockStatus: "in_stock",
      url: `${catalogueUrl}#pure-himalayan-shilajit`,
    },
    {
      id: "prod_ghee",
      name: "A2 Badri Cow Bilona Ghee",
      slug: "badri-cow-a2-ghee",
      category: "Ghee & Dairy",
      description: "Cultured slow-churned wooden bilona ghee from indigenous mountain Badri cows.",
      price: 2100,
      compareAtPrice: 2400,
      variants: [
        { name: "500ml Glass Jar", weightGrams: 500, price: 1150, stockStatus: "in_stock" },
        { name: "1 Litre Glass Jar", weightGrams: 1000, price: 2100, stockStatus: "in_stock" },
      ],
      image: "/assets/cat-nuts.jpg",
      stockStatus: "in_stock",
      url: `${catalogueUrl}#badri-cow-a2-ghee`,
    },
    {
      id: "prod_saffron",
      name: "Pure Kashmiri Mongra Saffron",
      slug: "kashmiri-mongra-saffron",
      category: "Spices & Saffron",
      description: "Grade 1 Pampore Mongra saffron with intense aroma and high crocin content.",
      price: 380,
      compareAtPrice: 450,
      variants: [
        { name: "1g Authentic Kashmiri Mongra", weightGrams: 1, price: 380, stockStatus: "in_stock" },
        { name: "2g Gift Wooden Box", weightGrams: 2, price: 720, stockStatus: "in_stock" },
      ],
      image: "/assets/cat-masalas.jpg",
      stockStatus: "in_stock",
      url: `${catalogueUrl}#kashmiri-mongra-saffron`,
    },
  ];

  for (const cp of coreFallbackProducts) {
    if (!existingSlugs.has(cp.slug.toLowerCase()) && !staticItems.some((s) => s.slug === cp.slug)) {
      staticItems.push(cp);
    }
  }

  return [...dbProducts, ...staticItems];
}

/**
 * Searches the live catalogue for a specific requested product.
 */
export function findMatchingProduct(query: string, catalogue: LiveCatalogueItem[]): LiveCatalogueItem | null {
  const q = query.toLowerCase();

  const keywordsMap: Record<string, string[]> = {
    honey: ["honey", "shehad", "shahad", "flora", "madhu"],
    almond: ["almond", "badam", "badaam", "mamra", "kagzi almond", "giri"],
    walnut: ["walnut", "akhrot", "akhrot giri", "kagzi akhrot"],
    shilajit: ["shilajit", "silajit", "resin", "shilajeet"],
    ghee: ["ghee", "bilona", "cow ghee", "desi ghee", "a2"],
    apricot: ["apricot", "khumani", "khubani", "ladakh apricot"],
    saffron: ["saffron", "kesar", "mongra", "zafran"],
    turmeric: ["turmeric", "haldi", "lakadong"],
    salt: ["salt", "namak", "sendha", "rock salt", "pahadi namak"],
    pickle: ["pickle", "achar", "linguda", "galgal"],
    seeds: ["seed", "flax", "chia", "pumpkin", "aliv"],
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

  // Fallback direct name/slug substring matching
  return (
    catalogue.find((item) => {
      const itemName = item.name.toLowerCase();
      const itemSlug = item.slug.toLowerCase().replace(/-/g, " ");
      return q.includes(itemName) || q.includes(itemSlug) || itemName.split(" ").some((w) => w.length > 3 && q.includes(w));
    }) || null
  );
}

/**
 * Extracts 10-digit counterparty customer phone number.
 */
export function extractCleanPhone(phone?: string): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "").slice(-10);
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
      1500,
      []
    );
    if (pgPast && pgPast.length > 1) {
      return false;
    }
  } catch {}

  // Check MongoDB
  try {
    const mongoDb = await withTimeout(getDatabase(), 1500, null);
    if (mongoDb) {
      const count = await withTimeout(
        mongoDb.collection("crm_messages").countDocuments({
          $or: [{ from: { $regex: cleanPhone } }, { to: { $regex: cleanPhone } }],
        }),
        1500,
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

  // 1. PostgreSQL crmOrders table
  try {
    const orders = await withTimeout(
      db
        .select()
        .from(crmOrders)
        .where(ilike(crmOrders.customerPhone, `%${cleanPhone}%`))
        .orderBy(desc(crmOrders.createdAt))
        .limit(1),
      1500,
      []
    );

    if (orders && orders.length > 0) {
      return orders[0];
    }
  } catch {}

  // 2. MongoDB Atlas fallback
  try {
    const mongoDb = await withTimeout(getDatabase(), 1500, null);
    if (mongoDb) {
      const order = await withTimeout(
        mongoDb
          .collection("crm_orders")
          .findOne(
            { customerPhone: { $regex: cleanPhone } },
            { sort: { createdAt: -1 } }
          ),
        1500,
        null
      );
      if (order) return order;
    }
  } catch {}

  return null;
}

/**
 * Intelligent Intent Detector implementing all 15 customer intents.
 */
export function detectCustomerIntent(text: string, context?: { isFirstMessage?: boolean; matchedProduct?: LiveCatalogueItem | null }): CustomerIntent {
  const q = text.toLowerCase().trim();

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
    q.includes("real person")
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
    q.includes("leak") ||
    q.includes("bekaar") ||
    q.includes("defective") ||
    q.includes("not happy") ||
    q.includes("quality issue")
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
    q.includes("50kg")
  ) {
    return "wholesale_enquiry";
  }

  // 4. Existing Order Status Enquiry
  if (
    q.includes("mera order") ||
    q.includes("order status") ||
    q.includes("kahan tak pahuncha") ||
    q.includes("kahan pahuncha") ||
    q.includes("kahan hai") ||
    q.includes("dispatch hua") ||
    q.includes("tracking") ||
    q.includes("track") ||
    q.includes("consignment") ||
    q.includes("order kahan")
  ) {
    return "order_status";
  }

  // 5. Payment Enquiry / UPI
  if (
    q.includes("payment status") ||
    q.includes("payment hui") ||
    q.includes("paise mile") ||
    q.includes("payment verify") ||
    q.includes("qr code") ||
    q.includes("upi id") ||
    q.includes("how to pay") ||
    q.includes("kahan pay karein") ||
    q.includes("paise kaise bheje") ||
    q.includes("screenshot dekh lo")
  ) {
    return "payment_enquiry";
  }

  // 6. Delivery Timeline Enquiry ("Kab tak aayega?")
  if (
    q.includes("kab tak aayega") ||
    q.includes("kab aayega") ||
    q.includes("kitne din lagenge") ||
    q.includes("delivery time") ||
    q.includes("when will deliver") ||
    q.includes("reach time")
  ) {
    return "delivery_enquiry";
  }

  // 7. Order Placement Intent ("Mujhe order karna hai")
  if (
    q.includes("order karna hai") ||
    q.includes("order book karna") ||
    q.includes("mujhe order") ||
    q.includes("order place") ||
    q.includes("buy karna hai") ||
    q.includes("khareedna hai") ||
    q.includes("lena chahta") ||
    q.includes("lena chahti")
  ) {
    return "order_placement";
  }

  // 8. Product Catalogue Request
  if (
    q.includes("catalogue") ||
    q.includes("catalog") ||
    q.includes("products list") ||
    q.includes("kaun kaun se product") ||
    q.includes("kaun-kaun se product") ||
    q.includes("kya kya product") ||
    q.includes("kya kya milta hai") ||
    q.includes("all products") ||
    q.includes("menu") ||
    q.includes("product dikhao")
  ) {
    return "catalogue_request";
  }

  // 9. Price Enquiry
  if (
    q.includes("kitne ka hai") ||
    q.includes("kya price hai") ||
    q.includes("price kya hai") ||
    q.includes("price") ||
    q.includes("rate") ||
    q.includes("daam") ||
    q.includes("cost") ||
    q.includes("kitne paise")
  ) {
    return "price_enquiry";
  }

  // 10. Packaging & Quantity Enquiry
  if (
    q.includes("pack size") ||
    q.includes("packaging") ||
    q.includes("quantity") ||
    q.includes("kitna gm") ||
    q.includes("250g") ||
    q.includes("500g") ||
    q.includes("1kg") ||
    q.includes("jar") ||
    q.includes("bottle")
  ) {
    return "packaging_quantity_enquiry";
  }

  // 11. Product Availability Enquiry
  if (
    q.includes("available hai") ||
    q.includes("in stock") ||
    q.includes("stock mein") ||
    q.includes("mil jayega") ||
    q.includes("milega") ||
    q.includes("hai kya")
  ) {
    return "product_availability";
  }

  // 12. Specific Product Enquiry (if product detected in query)
  if (context?.matchedProduct) {
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
    q.includes("origin")
  ) {
    return "general_question";
  }

  // 14. Greeting
  if (
    q === "hi" ||
    q === "hello" ||
    q === "namaste" ||
    q === "hey" ||
    q === "pranam" ||
    q === "hlo" ||
    q === "namaste ji" ||
    q === "good morning" ||
    q === "good evening"
  ) {
    return context?.isFirstMessage ? "first_welcome_greeting" : "greeting";
  }

  // 15. Fallback
  return "unclear_intent";
}

/**
 * Extracts customer name if introduced in conversational text.
 */
export function extractCustomerNameFromText(text: string): string | null {
  const clean = (text || "").trim();
  if (!clean) return null;
  const introMatch = clean.match(/(?:mera\s+naam|my\s+name\s+is|this\s+is|i\s+am|iam|main|mai|naam|name\s*:?)\s+([A-Za-z\u0900-\u097F\s]{2,30})/i);
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
 * Intelligent Smart Assistant Engine.
 * Evaluates context, queries live database, and generates short, natural Hinglish replies with "...ji".
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
}> {
  const cleanPhone = extractCleanPhone(params.customerPhone);
  const text = (params.customerText || "").trim();
  const host = getAppBaseUrl(params.reqHost);
  const catalogueUrl = `${host}/catalogue`;
  const extractedName = extractCustomerNameFromText(text);
  const updatedCustomerName = extractedName || params.customerName;

  // Safeguard 1: Human Agent Handoff active check
  if (isHumanAgentActive(cleanPhone)) {
    return {
      replyText: "",
      intent: "human_handoff",
      shouldSend: false,
      handoffRequired: true,
      updatedCustomerName,
    };
  }

  // Fetch live catalogue from PostgreSQL / Storefront
  const catalogue = await getLiveProductCatalogue(host);
  const matchedProduct = findMatchingProduct(text, catalogue);

  // Safeguard 2: Check if this is the customer's very first message
  const isFirst = await isFirstCustomerMessage(cleanPhone);
  const isGreetingWord = /^(hi|hello|namaste|hey|hlo|pranam|namaste ji|good morning|good evening)$/i.test(text.toLowerCase());

  // Detect Intent
  const intent = detectCustomerIntent(text, { isFirstMessage: isFirst, matchedProduct });

  // If new customer starting a conversation or sending a greeting
  if (isGreetingWord || (isFirst && (intent === "greeting" || intent === "first_welcome_greeting" || intent === "unclear_intent"))) {
    return {
      replyText: "Namaste ji! Aapki kya sahayata kar sakte hain?",
      intent: isFirst ? "first_welcome_greeting" : "greeting",
      shouldSend: true,
      updatedCustomerName,
    };
  }

  switch (intent) {
    // 1. Greeting (repeat greeting in ongoing conversation)
    case "greeting":
    case "first_welcome_greeting":
      return {
        replyText: "Namaste ji! Aapki kya sahayata kar sakte hain?",
        intent,
        shouldSend: true,
        updatedCustomerName,
      };

    // 2. Catalogue Request (Explore products)
    case "catalogue_request":
      return {
        replyText: `Bilkul ji! Hamara latest product catalogue yahan dekhein: ${catalogueUrl}`,
        intent,
        shouldSend: true,
        updatedCustomerName,
      };

    // 3. Product Enquiry / Availability / Price / Packaging
    case "product_enquiry":
    case "product_availability":
    case "price_enquiry":
    case "packaging_quantity_enquiry": {
      if (matchedProduct) {
        if (matchedProduct.stockStatus === "out_of_stock") {
          return {
            replyText: `Ji, ${matchedProduct.name} abhi stock mein uplabdh nahi hai. Hamari team fresh batch aate hi aapse connect karegi.`,
            intent,
            shouldSend: true,
            updatedCustomerName,
          };
        }

        const defaultVariant = matchedProduct.variants[0] || { name: "500g", price: matchedProduct.price };
        const priceStr = defaultVariant.price.toLocaleString("en-IN");
        const availableSizes = matchedProduct.variants.map((v) => v.name).join(" / ");

        return {
          replyText: `Ji haan! ${matchedProduct.name} (${availableSizes}) available hai. Price: ₹${priceStr}. Details: ${matchedProduct.url}`,
          intent,
          shouldSend: true,
          updatedCustomerName,
        };
      }

      return {
        replyText: "Ji, is product ki availability abhi confirm nahi ho pa rahi. Hamari team check karke batayegi.",
        intent,
        shouldSend: true,
        updatedCustomerName,
      };
    }

    // 4. Order Placement
    case "order_placement": {
      if (matchedProduct) {
        return {
          replyText: `Bilkul ji! ${matchedProduct.name} ke liye aap kitni quantity aur delivery address batayein, hum turant book kar denge.`,
          intent,
          shouldSend: true,
          updatedCustomerName,
        };
      }
      return {
        replyText: "Bilkul ji! Aap product ka naam aur quantity bata dijiye.",
        intent,
        shouldSend: true,
        updatedCustomerName,
      };
    }

    // 5. Existing Order Status
    case "order_status": {
      const order = await getCustomerLatestOrder(cleanPhone);
      if (order && order.orderNumber) {
        let statusText = order.status || "Processing";
        if (statusText.toLowerCase() === "processing") {
          statusText = "Packaging mein hai (2–3 working days dispatch)";
        } else if (statusText.toLowerCase() === "delivered") {
          statusText = "Deliver ho chuka hai";
        }
        const trackingNote = order.consignmentNumber ? ` (Tracking: ${order.consignmentNumber})` : "";
        return {
          replyText: `Ji, aapka order #${order.orderNumber} abhi ${statusText}${trackingNote} hai.`,
          intent,
          shouldSend: true,
          updatedCustomerName,
        };
      }
      return {
        replyText: "Ji, apna order number share kar dijiye. Hum check karte hain.",
        intent,
        shouldSend: true,
        updatedCustomerName,
      };
    }

    // 6. Payment Enquiry
    case "payment_enquiry": {
      const order = await getCustomerLatestOrder(cleanPhone);
      const isPaid = order && (order.paymentStatus === "paid" || order.paymentStatus === "collected");
      if (isPaid) {
        return {
          replyText: "Thank you ji! Aapka payment confirm ho gaya hai.",
          intent,
          shouldSend: true,
          updatedCustomerName,
        };
      }
      if (order && order.totalPaise) {
        const amt = Math.round(order.totalPaise / 100).toLocaleString("en-IN");
        return {
          replyText: `Ji, aapka order #${order.orderNumber} ka ₹${amt} payment abhi pending hai. Official UPI ID: prajnaa@upi.`,
          intent,
          shouldSend: true,
          updatedCustomerName,
        };
      }
      return {
        replyText: "Ji, aap hamare official UPI ID `prajnaa@upi` par payment kar sakte hain. Payment ke baad screenshot yahan share karein.",
        intent,
        shouldSend: true,
        updatedCustomerName,
      };
    }

    // 7. Delivery Enquiry
    case "delivery_enquiry": {
      const order = await getCustomerLatestOrder(cleanPhone);
      if (order && order.consignmentNumber) {
        return {
          replyText: `Good news ji! Aapka order dispatch ho gaya hai. Tracking: https://www.indiapost.gov.in (Consignment: ${order.consignmentNumber})`,
          intent,
          shouldSend: true,
          updatedCustomerName,
        };
      }
      return {
        replyText: "Ji, aapka order processing mein hai. Dispatch mein lagbhag 2–3 din lagte hain.",
        intent,
        shouldSend: true,
        updatedCustomerName,
      };
    }

    // 8. Complaint or Issue
    case "complaint": {
      setHumanAgentHandoff(cleanPhone, "Support Escalation");
      return {
        replyText: "Ji, inconvenience ke liye maafi chahte hain. Hamari team jald aapse connect karegi.",
        intent,
        shouldSend: true,
        handoffRequired: true,
        updatedCustomerName,
      };
    }

    // 9. Wholesale / Bulk Order
    case "wholesale_enquiry":
      return {
        replyText: "Namaste ji! Wholesale aur bulk orders ke liye hamari sales team aapse direct connect karegi.",
        intent,
        shouldSend: true,
        updatedCustomerName,
      };

    // 10. General Question (Purity / Organic)
    case "general_question":
      return {
        replyText: "Ji, Prajnaa ke sabhi products 100% natural aur high-altitude Himalayan farmers se direct aate hain.",
        intent,
        shouldSend: true,
        updatedCustomerName,
      };

    // 11. Human Support / Outside Knowledge Handoff
    case "human_handoff":
    case "unclear_intent":
    default: {
      setHumanAgentHandoff(cleanPhone, "Nishant (Store Desk)");
      return {
        replyText: "Nishant ji abhi available nahi hain. Woh jald hi aapse connect karenge.",
        intent: "human_handoff",
        shouldSend: true,
        handoffRequired: true,
        updatedCustomerName,
      };
    }
  }
}
