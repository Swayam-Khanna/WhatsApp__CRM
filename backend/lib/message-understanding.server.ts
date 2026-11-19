/**
 * PRAJNAA FARMER MARKET — INTELLIGENT CUSTOMER MESSAGE UNDERSTANDING ENGINE
 *
 * Core architectural module for processing incoming WhatsApp messages:
 * 1. Message normalization & WhatsApp slang cleaning
 * 2. Trilingual language detection (English, Hindi, Hinglish) with mid-conversation switching
 * 3. Robust entity extraction (Products, Variants, Quantities, Order IDs, Addresses)
 * 4. Contextual intent classification across all 13 categories + natural human conversation
 * 5. Conversational context & multi-turn memory resolution
 */

import { LiveCatalogueItem, LiveProductVariant, ConversationContext } from "./smart-assistant.server";

export type SupportedLanguage = "en" | "hinglish" | "hi";

export interface ExtractedEntities {
  product?: LiveCatalogueItem | null;
  productName?: string;
  variant?: LiveProductVariant | null;
  variantName?: string;
  quantity?: number;
  orderNumber?: string;
  pincode?: string;
  hasAddressIndicator?: boolean;
  addressText?: string;
  paymentReference?: string;
}

export interface IntentClassificationResult {
  intent: string;
  subIntent: string;
  category: string;
  confidence: number;
  templateId?: string;
  entities: ExtractedEntities;
  detectedLanguage: SupportedLanguage;
  requiresContextualContinuation?: boolean;
}

/**
 * Common WhatsApp abbreviations, colloquialisms and phonetic spelling normalizations
 */
const SLANG_MAP: Record<string, string> = {
  // Gratitude
  "tq": "thank you",
  "ty": "thank you",
  "thx": "thanks",
  "thnx": "thanks",
  "thanx": "thanks",
  "tysm": "thank you so much",
  "tqsm": "thank you so much",
  "dhnyawad": "dhanyawad",
  "dhanyavaad": "dhanyawad",
  "shukriyaa": "shukriya",

  // Acknowledgements
  "k": "ok",
  "kk": "ok",
  "okk": "ok",
  "okies": "ok",
  "okee": "ok",
  "okie": "ok",
  "thik": "theek",
  "tik": "theek",
  "thek": "theek",
  "acha": "achha",
  "achaa": "achha",
  "accha": "achha",
  "achha ji": "achha ji",

  // Greetings
  "hlo": "hello",
  "hlw": "hello",
  "helo": "hello",
  "heyy": "hey",
  "heyyy": "hey",
  "gm": "good morning",
  "ge": "good evening",
  "gn": "good night",
  "namasthe": "namaste",
  "nmste": "namaste",

  // Inquiries / Slang
  "plz": "please",
  "pls": "please",
  "plzz": "please",
  "ktna": "kitna",
  "ktne": "kitne",
  "btao": "batao",
  "btado": "bata do",
  "btaye": "bataiye",
  "btayein": "bataiye",
  "chahye": "chahiye",
  "chahie": "chahiye",
  "chaheye": "chahiye",
  "kese": "kaise",
  "kaise ho": "kaise ho",
  "r u": "are you",
  "u": "you",
  "ur": "your",
  "urs": "yours",
  "wid": "with",
  "deliwer": "deliver",
  "delivry": "delivery",
  "delvry": "delivery",
  "ordr": "order",
  "prodct": "product",
  "prodcts": "products",
  "shilajit": "shilajit",
  "silajit": "shilajit",
  "shilajeet": "shilajit",
  "badam": "badam",
  "badaam": "badam",
  "shehad": "shehad",
  "shahad": "shehad",
  "akhrot": "akhrot",
  "kesar": "kesar",
};

/**
 * Normalizes customer messages by:
 * - Handling slang and contractions
 * - Collapsing elongated repeated letters (e.g. "heyyyy" -> "hey", "pleaaase" -> "please")
 * - Removing erratic whitespace and excessive punctuation noise
 */
export function normalizeCustomerMessage(rawText: string): string {
  if (!rawText) return "";

  let cleaned = rawText.trim();

  // Remove excessive punctuation repetitions (e.g. "???!!" -> "?")
  cleaned = cleaned.replace(/([?!.,]){2,}/g, "$1");

  // Collapse 3+ repeating characters down to 1 or 2 (e.g. "heyyyy" -> "hey", "okkkk" -> "okk")
  cleaned = cleaned.replace(/([a-zA-Z])\1{2,}/g, "$1");

  // Tokenize and replace slang
  const tokens = cleaned.split(/\s+/);
  const normalizedTokens = tokens.map((token) => {
    const lower = token.toLowerCase().replace(/[^\w\u0900-\u097F]/g, "");
    if (SLANG_MAP[lower]) {
      return SLANG_MAP[lower];
    }
    return token;
  });

  return normalizedTokens.join(" ").trim();
}

/**
 * Robust Trilingual Language Detector:
 * 1. Checks for Devanagari script (\u0900-\u097F) -> "hi"
 * 2. Checks for Hinglish lexical markers and Roman Hindi vocabulary -> "hinglish"
 * 3. Checks for English patterns -> "en"
 * 4. Respects contextual language if ambiguous
 */
export function detectMessageLanguage(
  text: string,
  contextLanguage?: SupportedLanguage
): SupportedLanguage {
  const clean = (text || "").trim();
  if (!clean) return contextLanguage || "en";

  // 1. Devanagari script is strictly Hindi
  if (/[\u0900-\u097F]/.test(clean)) {
    return "hi";
  }

  const lower = clean.toLowerCase();

  // 2. High-confidence Hinglish phrases & word combinations
  const strongHinglishPatterns = [
    /\b(?:aapke paas|kaun se|kaun-se|kya kya|kitne ka|kitne ki|kahan hai|mujhe .* chahiye|order karna hai|bata dijiye|batao|dekh lo|kar diya|mil jayega|stock mein|kab tak|aayega|kitne din|asuvidha|maafi|kharab|shikayat|kripya|dhanyavaad|dhanyawad|shukriya|namaste|pranam)\b/i,
    /\b(?:karna hai|lena hai|khareedna hai|bhejo|bhejiye|pata|rupaye|daam|bhai|sahayata|swagat|swagat hai)\b/i,
    /\b(?:achha|acha|theek|theek hai|sahi|badhiya|aur batao|batao ji|haan ji|nahi ji|bilkul|koi baat nahi|kripya|madad)\b/i,
    /\b(?:kaise ho|kya kar rahe|sab badhiya|kya haal|kya rate|kya price|kitna hua|bataiye|paise bheje)\b/i,
  ];

  if (strongHinglishPatterns.some((pattern) => pattern.test(lower))) {
    return "hinglish";
  }

  // 3. High-confidence English phrases
  const strongEnglishPatterns = [
    /\b(?:tell me|what products?|what do you|show me|price of|how much|i want to|where is my|i have made|talk to|can you|explore our|let me know|how can we|help you|in stock|available|delivery time|thank you|thanks a lot|you are welcome|happy to help|sounds good|not interested)\b/i,
    /\b(?:hello|good morning|good evening|thanks|sorry|please share|any update|how are you|what do you mean)\b/i,
  ];

  if (strongEnglishPatterns.some((pattern) => pattern.test(lower))) {
    return "en";
  }

  // 4. Token scoring
  const hinglishTokens = new Set([
    "aap", "aapke", "aapki", "aapka", "paas", "kaun", "kya", "hai", "hain", "ho", "hu", "hoon",
    "chahiye", "kitne", "kitna", "kitni", "kahan", "mera", "meri", "mere", "mujhe", "hum", "humein",
    "batao", "bataiye", "kripya", "karo", "karna", "karein", "ji", "shukriya", "dhanyavad", "dhanyavaad", "dhanyawad",
    "kaise", "nahi", "nahin", "dekh", "dekhein", "dikhao", "dikha", "bhejo", "bhejiye", "liya", "diya",
    "achha", "acha", "theek", "gaya", "gayi", "gaye", "milega", "mil", "jayega", "uplabdh", "pata",
    "kab", "tak", "aayega", "bhi", "toh", "aur", "wala", "wali", "wale", "bhai", "namaste", "pranam",
    "kharab", "shikayat", "khareedna", "lena", "dena", "paise", "rupaye", "daam", "baat", "karni",
    "bheja", "rakha", "rakho", "thoda", "kam", "jyada", "sahi", "badhiya", "asli", "prajnaa", "shehad",
    "shahad", "badam", "akhrot", "giri", "bilona", "chahie", "batayein", "bataen", "haan", "bilkul"
  ]);

  const englishTokens = new Set([
    "tell", "about", "your", "product", "products", "what", "show", "catalogue", "catalog", "price",
    "cost", "how", "much", "want", "to", "buy", "order", "place", "where", "is", "my", "have", "made",
    "payment", "paid", "talk", "person", "human", "agent", "support", "help", "can", "you", "details",
    "available", "stock", "delivery", "shipping", "tracking", "status", "hello", "hi", "hey", "good",
    "morning", "evening", "thanks", "thank", "sorry", "please", "confirm", "send", "give", "need",
    "which", "items", "sell", "options", "rate", "pack", "size", "bottle", "jar", "address", "pincode",
    "fine", "sure", "great", "perfect", "okay", "alright", "welcome", "update"
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

  // Common single-word markers
  if (/^(namaste|pranam|dhanyawad|shukriya|achha|theek|haan|bilkul|ji haan)\b/i.test(lower)) return "hinglish";
  if (/^(hi|hello|hey|good morning|good evening|thanks|ok|okay|sure|fine)\b/i.test(lower)) return "en";

  return contextLanguage || "en";
}

/**
 * Extracts entities: Products, Variants, Quantities, Order IDs, PIN code, and Address indicators
 */
export function extractEntities(
  text: string,
  catalogue: LiveCatalogueItem[],
  context?: ConversationContext
): ExtractedEntities {
  const q = text.toLowerCase();
  const entities: ExtractedEntities = {};

  // 1. Product extraction
  const productSynonyms: Record<string, string[]> = {
    honey: ["honey", "shehad", "shahad", "raw flora", "flora", "मधु", "शहद"],
    almond: ["almond", "almonds", "badam", "badaam", "mamra", "kagzi almond", "बादाम", "मामरा"],
    walnut: ["walnut", "walnuts", "akhrot", "kagzi akhrot", "akhrot giri", "अखरोट"],
    shilajit: ["shilajit", "silajit", "shilajeet", "resin", "शिलाजीत"],
    ghee: ["ghee", "bilona", "badri", "cow ghee", "desi ghee", "a2", "घी"],
    apricot: ["apricot", "apricots", "khumani", "khubani", "खुबानी", "खुमानी"],
    saffron: ["saffron", "kesar", "mongra", "zafran", "केसर"],
    turmeric: ["turmeric", "haldi", "lakadong", "हल्दी"],
    salt: ["salt", "namak", "sendha", "rock salt", "pahadi namak", "नमक"],
    pickle: ["pickle", "achar", "linguda", "galgal", "अचार"],
  };

  let matchedProduct: LiveCatalogueItem | null = null;

  for (const [key, synonyms] of Object.entries(productSynonyms)) {
    if (synonyms.some((syn) => q.includes(syn))) {
      matchedProduct = catalogue.find((item) => {
        const itemText = `${item.name} ${item.slug} ${item.category}`.toLowerCase();
        return synonyms.some((syn) => itemText.includes(syn)) || itemText.includes(key);
      }) || null;
      if (matchedProduct) break;
    }
  }

  // Fallback to substring matching in catalogue
  if (!matchedProduct) {
    matchedProduct = catalogue.find((item) => {
      const itemName = item.name.toLowerCase();
      const itemSlug = item.slug.toLowerCase().replace(/-/g, " ");
      return q.includes(itemName) || q.includes(itemSlug);
    }) || null;
  }

  // Contextual fallback: if pronoun used ("how much is it?", "I want two", "is it available?")
  if (!matchedProduct && context?.lastDiscussedProductSlug) {
    const isPronounQuery =
      /\b(?:it|this|that|product|item|ye|yeh|iska|iski|inke|vo|voh)\b/i.test(q) ||
      /\b(?:how much|rate|price|cost|available|order|chahiye|want|need|two|three|pack)\b/i.test(q);
    if (isPronounQuery) {
      matchedProduct =
        catalogue.find((p) => p.slug.toLowerCase() === context.lastDiscussedProductSlug?.toLowerCase()) ||
        null;
    }
  }

  if (matchedProduct) {
    entities.product = matchedProduct;
    entities.productName = matchedProduct.name;

    // 2. Packaging / Variant extraction
    if (q.includes("250g") || q.includes("250 gm")) {
      entities.variant = matchedProduct.variants.find((v) => v.name.includes("250g")) || null;
    } else if (q.includes("500g") || q.includes("500 gm") || q.includes("500ml")) {
      entities.variant = matchedProduct.variants.find((v) => v.name.includes("500g") || v.name.includes("500ml")) || null;
    } else if (q.includes("1kg") || q.includes("1 kg") || q.includes("1 litre") || q.includes("1l")) {
      entities.variant = matchedProduct.variants.find((v) => v.name.includes("1kg") || v.name.includes("1 Litre")) || null;
    } else if (q.includes("20g")) {
      entities.variant = matchedProduct.variants.find((v) => v.name.includes("20g")) || null;
    } else if (q.includes("50g")) {
      entities.variant = matchedProduct.variants.find((v) => v.name.includes("50g")) || null;
    } else if (q.includes("1g")) {
      entities.variant = matchedProduct.variants.find((v) => v.name.includes("1g")) || null;
    }

    if (entities.variant) {
      entities.variantName = entities.variant.name;
    }
  }

  // 3. Numeric / Word Quantity extraction
  const qtyWordMatch = text.match(/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|ek|do|teen|chaar|paanch|\d+)\b|(?:^|[\s,।!?.])(?:एक|दो|तीन|चार|पांच)(?:[\s,।!?.]|$)/i);
  if (qtyWordMatch) {
    const rawVal = qtyWordMatch[0].trim().toLowerCase();
    const wordMap: Record<string, number> = {
      one: 1, ek: 1, "एक": 1,
      two: 2, do: 2, "दो": 2,
      three: 3, teen: 3, "तीन": 3,
      four: 4, chaar: 4, "चार": 4,
      five: 5, paanch: 5, "पांच": 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    };
    const parsed = wordMap[rawVal] || parseInt(rawVal, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      entities.quantity = parsed;
    }
  }

  // 4. Order Number extraction
  // Must match legitimate order identifiers:
  // - Explicit order prefix: ORD-2026-..., PM-..., PJ-OD-..., etc.
  // - Hash with letters/digits: #PJ-OD-2404, #PM-9021, #12345
  // - "order #..." or "order no. ..." MUST contain digits and cannot be stop words like confirm/status/some/details/karna/book/etc.
  const invalidOrderWords = new Set([
    "confirm", "some", "status", "details", "karna", "kardo", "number", "create",
    "placement", "cancel", "book", "items", "chahiye", "products", "hai", "batao",
    "kijiye", "bhejo", "bhejiye", "wala", "wali"
  ]);

  let resolvedOrderNumber: string | undefined = undefined;

  const prefixMatch = text.match(/\b((?:ORD|PM|PJ|OD)-\d{4,8}(?:-[A-Za-z0-9]+)?)\b/i);
  if (prefixMatch) {
    resolvedOrderNumber = prefixMatch[1];
  } else {
    const hashMatch = text.match(/#([A-Za-z0-9_-]{3,20})/);
    if (hashMatch && !invalidOrderWords.has(hashMatch[1].toLowerCase()) && !/^[a-z]+$/i.test(hashMatch[1])) {
      resolvedOrderNumber = hashMatch[1];
    } else {
      const orderMatch = text.match(/\border\s*(?:#|no\.?|id|num)?\s*([A-Za-z0-9_-]*\d+[A-Za-z0-9_-]*)\b/i);
      if (orderMatch && !invalidOrderWords.has(orderMatch[1].toLowerCase())) {
        resolvedOrderNumber = orderMatch[1];
      }
    }
  }

  if (resolvedOrderNumber) {
    entities.orderNumber = resolvedOrderNumber;
  }

  // 5. Pincode extraction (Indian 6-digit PIN code)
  const pinMatch = text.match(/\b[1-9][0-9]{5}\b/);
  if (pinMatch) {
    entities.pincode = pinMatch[0];
  }

  // 6. Address indicator
  const hasAddr =
    Boolean(entities.pincode) ||
    /\b(?:flat|house|apartment|h\.no|lane|road|street|nagar|colony|sector|city|state|dist|district|landmark|pata|address|delhi|mumbai|bangalore|pune|dehradun|noida|gurugram|jaipur|lucknow|hyderabad|chennai|kolkata)\b/i.test(q);
  entities.hasAddressIndicator = hasAddr;
  if (hasAddr) {
    entities.addressText = text;
  }

  // 7. Payment Reference (UTR / UPI transaction ID / Screenshot)
  const utrMatch = text.match(/\b\d{12}\b|(?:utr|txn|transaction|upi\s*ref|rrn)\b/i);
  if (utrMatch) {
    entities.paymentReference = utrMatch[0];
  }

  return entities;
}

/**
 * Intelligent Intent Classifier:
 * Maps normalized text, conversational history, and entities into one of 13 primary categories
 * with high semantic precision, avoiding generic fallback errors for everyday human messages.
 */
export function classifyCustomerIntent(
  normalizedText: string,
  context: ConversationContext,
  entities: ExtractedEntities,
  catalogue: LiveCatalogueItem[]
): IntentClassificationResult {
  const q = normalizedText.toLowerCase().trim();
  const lang = detectMessageLanguage(normalizedText, context.language);

  // Helper builder
  const makeResult = (
    category: string,
    intent: string,
    subIntent: string,
    templateId: string,
    confidence: number = 0.95,
    requiresContinuation: boolean = false
  ): IntentClassificationResult => ({
    category,
    intent,
    subIntent,
    templateId,
    confidence,
    entities,
    detectedLanguage: lang,
    requiresContextualContinuation: requiresContinuation,
  });

  // =========================================================================
  // PRIORITY 1: HUMAN HANDOFF & AGENT REQUEST
  // =========================================================================
  if (
    /\b(?:human|agent|person|executive|nishant|call me|helpline|talk to|speak to|kisi se baat|baat karni|baat karao|phone par baat)\b/i.test(q) ||
    /(?:इंसान|एजेंट|निशांत|कॉल करो|हेल्पलाइन|बात करनी|बात कराओ|स्टोर एडमिन)/i.test(q)
  ) {
    return makeResult("human_handoff_unknown", "human_handoff", "human_request", "auto_handoff_explicit_request", 0.98);
  }

  // =========================================================================
  // PRIORITY 2: COMPLAINTS, DAMAGES & REFUNDS
  // =========================================================================
  if (
    /\b(?:damaged|broken|kharab|shikayat|complaint|wrong product|galat item|leak|leaking|bekaar|defective|not happy|quality issue|refund|return|bad quality|expired)\b/i.test(q) ||
    /(?:टूटा|खराब|शिकायत|गलत सामान|लीक|रिफंड|वापसी|बेकार|दिक्कत)/i.test(q)
  ) {
    if (q.includes("wrong") || q.includes("galat") || q.includes("गलत")) {
      return makeResult("complaints_returns_refunds", "complaint", "wrong_item", "auto_comp_wrong_item", 0.96);
    }
    return makeResult("complaints_returns_refunds", "complaint", "damaged_item", "auto_comp_damaged_item", 0.96);
  }

  // =========================================================================
  // PRIORITY 3: ACKNOWLEDGEMENTS & INDIAN CONVERSATIONAL EXPRESSIONS
  // =========================================================================
  if (
    /^(?:okay|ok|okk|sure|theek\s*hai|thik\s*hai|theek\s*hai\s*ji|thik\s*hai\s*ji|theek\s*ji|thik\s*h\s*ji|okay\s*theek\s*hai|ok\s*theek\s*hai)[\s.!?]*$/i.test(q) ||
    /^(?:ठीक है|ठीक है जी|ओके|श्योर)[\s.!?]*$/i.test(q)
  ) {
    return makeResult("thank_you_acknowledgements", "acknowledgement", "ok_noted", "auto_ack_ok_noted", 0.99);
  }
  if (/^(?:achha|acha)\s*ji[\s.!?]*$/i.test(q) || /^(?:अच्छा जी)[\s.!?]*$/i.test(q)) {
    return makeResult("indian_conversational_expressions", "expression", "achha_ji", "auto_expr_achha_ji", 0.99);
  }
  if (/^(?:theek\s*hai\s*ji|thik\s*hai\s*ji|theek\s*ji|thik\s*h\s*ji)[\s.!?]*$/i.test(q) || /^(?:ठीक है जी)[\s.!?]*$/i.test(q)) {
    return makeResult("indian_conversational_expressions", "expression", "theek_hai_ji", "auto_expr_theek_hai_ji", 0.99);
  }
  if (/^(?:haan\s*ji|ha\s*ji|hanji)[\s.!?]*$/i.test(q) || /^(?:हाँ जी|जी हाँ)[\s.!?]*$/i.test(q)) {
    if (context.activeStage === "awaiting_address" || context.activeStage === "discussing_product" || context.activeStage === "awaiting_quantity") {
      return makeResult("order_placement_modification", "order_placement", "confirm_and_address", "auto_order_ask_address", 0.95, true);
    }
    return makeResult("indian_conversational_expressions", "expression", "haan_ji", "auto_expr_haan_ji", 0.99);
  }
  if (/^(?:nahi\s*ji|nahin\s*ji|na\s*ji)[\s.!?]*$/i.test(q) || /^(?:नहीं जी)[\s.!?]*$/i.test(q)) {
    return makeResult("indian_conversational_expressions", "expression", "nahi_ji", "auto_expr_nahi_ji", 0.99);
  }
  if (/^(?:bilkul|bilkul\s*ji)[\s.!?]*$/i.test(q) || /^(?:बिल्कुल|बिल्कुल जी)[\s.!?]*$/i.test(q)) {
    return makeResult("indian_conversational_expressions", "expression", "bilkul", "auto_expr_bilkul", 0.99);
  }
  if (/\b(?:koi\s*baat\s*na(?:hi|hin)?|koi\s*ni|koi\s*dikkat\s*na(?:hi|hin)?)\b/i.test(q) || /(?:कोई बात नहीं|कोई दिक्कत नहीं)/i.test(q)) {
    return makeResult("indian_conversational_expressions", "expression", "koi_baat_nahi", "auto_expr_koi_baat_nahi", 0.98);
  }
  if (/\b(?:samajh\s*gaya|samajh\s*gayi|samajh\s*aa\s*gaya|samjh\s*gaya)\b/i.test(q) || /(?:समझ गया|समझ आ गया)/i.test(q)) {
    return makeResult("indian_conversational_expressions", "expression", "samajh_gaya", "auto_expr_samajh_gaya", 0.98);
  }
  if (/\b(?:accha\s*bataiye|achha\s*bataiye|achha\s*batao|acha\s*batao)\b/i.test(q) || /(?:अच्छा बताइए|अच्छा बताओ)/i.test(q)) {
    return makeResult("indian_conversational_expressions", "expression", "accha_bataiye", "auto_expr_accha_bataiye", 0.98);
  }
  if (/\b(?:ji\s*zaroor|zaroor\s*ji|ji\s*jarur|jaroor\s*ji)\b/i.test(q) || /(?:जी ज़रूर|ज़रूर जी)/i.test(q)) {
    return makeResult("indian_conversational_expressions", "expression", "ji_zaroor", "auto_expr_ji_zaroor", 0.98);
  }
  if (/\b(?:chaliye\s*theek\s*hai|chalo\s*theek\s*hai|chalo\s*thik\s*h)\b/i.test(q) || /(?:चलिए ठीक है|चलो ठीक है)/i.test(q)) {
    return makeResult("indian_conversational_expressions", "expression", "chaliye_theek_hai", "auto_expr_chaliye_theek_hai", 0.98);
  }
  if (/\b(?:bahut\s*badhiya|bohot\s*badhiya|bht\s*badiya|bahut\s*achha)\b/i.test(q) || /(?:बहुत बढ़िया|बहुत अच्छा)/i.test(q)) {
    return makeResult("indian_conversational_expressions", "expression", "bahut_badhiya", "auto_expr_bahut_badhiya", 0.98);
  }
  if (/\b(?:ek\s*minute|1\s*minute|ek\s*min|1\s*min|ek\s*second|1\s*sec)\b/i.test(q) || /(?:एक मिनट|एक सेकंड)/i.test(q)) {
    return makeResult("indian_conversational_expressions", "expression", "ek_minute", "auto_expr_ek_minute", 0.98);
  }

  // =========================================================================
  // PRIORITY 4: THANK YOU & APPRECIATION (10 templates)
  // Handles Thank you, Thank you so much, Thanks ji, Bahut shukriya, Dhanyavaad, Thanks for info, Helpful, Great service, Aapne achhe se samjhaya, Phir milenge
  // =========================================================================
  const isThankYou =
    /^(?:thank\s*you|thanks|thank\s*u|thx|tq|ty|shukriya|dhanyawad|dhanyavad|bahut dhanyawad|thanks a lot|thank you so much|thanks for helping|thanks for the info|thanks for info|thank you ji|okay thanks|ok thanks|shukriya ji|dhanyawad ji)[\s.!]*$/i.test(q) ||
    /\b(?:thank\s*you\s*so\s*much|thanks\s*a\s*lot|thanks\s*for\s*(?:the\s*)?(?:info|help|information|details)|bahut\s*dhanyawad|aapka\s*shukriya)\b/i.test(q) ||
    /(?:^|[\s,।!?.])(?:धन्यवाद|शुक्रिया|आभार|थैंक यू|थैंक्स)(?:[\s,।!?.]|$)/i.test(q);

  if (/\b(?:thanks\s*for\s*(?:the\s*)?info(?:rmation)?|info\s*ke\s*liye\s*thanks)\b/i.test(q) || /(?:जानकारी के लिए धन्यवाद)/i.test(q)) {
    return makeResult("thank_you_acknowledgements", "thank_you", "info_thanks", "auto_thanks_info", 0.99);
  }
  if (/\b(?:helpful|bahut\s*helpful|great\s*help)\b/i.test(q) && /\b(?:thank|thanks|shukriya|dhanyawaad)\b/i.test(q)) {
    return makeResult("thank_you_acknowledgements", "thank_you", "helpful", "auto_thanks_helpful", 0.99);
  }
  if (/\b(?:great\s*service|acchi\s*service|achhi\s*service|badhiya\s*service)\b/i.test(q)) {
    return makeResult("thank_you_acknowledgements", "thank_you", "great_service", "auto_thanks_great_service", 0.99);
  }
  if (/\b(?:achhe\s*se\s*samjhaya|acche\s*se\s*bata|well\s*explained)\b/i.test(q) || /(?:अच्छे से समझाया)/i.test(q)) {
    return makeResult("thank_you_acknowledgements", "thank_you", "explained_well", "auto_thanks_explained_well", 0.99);
  }
  if (/\b(?:phir\s*milenge|fir\s*milenge|milte\s*hain)\b/i.test(q) && /\b(?:dhanyavaad|dhanyawad|thanks|shukriya)\b/i.test(q)) {
    return makeResult("thank_you_acknowledgements", "thank_you", "phir_milenge", "auto_thanks_phir_milenge", 0.99);
  }
  if (/\b(?:thank\s*you\s*so\s*much|tysm|tqsm|thanks\s*a\s*lot)\b/i.test(q)) {
    return makeResult("thank_you_acknowledgements", "thank_you", "so_much", "auto_thanks_so_much", 0.99);
  }
  if (/\b(?:thanks\s*ji|thank\s*you\s*ji|thx\s*ji)\b/i.test(q)) {
    return makeResult("thank_you_acknowledgements", "thank_you", "thanks_ji", "auto_thanks_ji", 0.99);
  }
  if (/\b(?:bahut\s*shukriya|shukriya\s*ji|shukriya)\b/i.test(q) || /(?:शुक्रिया)/i.test(q)) {
    return makeResult("thank_you_acknowledgements", "thank_you", "shukriya", "auto_thanks_shukriya", 0.99);
  }
  if (/\b(?:aapka\s*bahut\s*dhanyavaad|dhanyavaad\s*ji|dhanyawad\s*ji|dhanyavaad|dhanyawad)\b/i.test(q) || /(?:धन्यवाद|आभार)/i.test(q)) {
    return makeResult("thank_you_acknowledgements", "thank_you", "dhanyavaad", "auto_thanks_dhanyavaad", 0.99);
  }
  if (isThankYou) {
    return makeResult("thank_you_acknowledgements", "thank_you", "general", "auto_thanks_basic", 0.99);
  }

  // =========================================================================
  // PRIORITY 4B: SHORT INDIAN CONTEXTUAL MESSAGES
  // E.g. "Kitne ka?", "Aur dikhao", "Wahi wala", "2 chahiye", "Bhej do", "Nahi rehne do", "Same"
  // =========================================================================
  if (/^(?:kitne\s*ka|kitne\s*ki|kitna\s*h|ktne\s*ka)[\s.?!]*$/i.test(q) || /^(?:कितने का|कितने की)[\s.?!]*$/i.test(q)) {
    return makeResult("product_details_pricing", "price_enquiry", "short_kitne_ka", "auto_short_kitne_ka", 0.98);
  }
  if (/^(?:aur\s*dikhao|aur\s*batao|aur\s*kya\s*h|aur\s*option)[\s.?!]*$/i.test(q) || /^(?:और दिखाओ|और बताओ)[\s.?!]*$/i.test(q)) {
    return makeResult("product_catalogue_enquiries", "catalogue_request", "short_aur_dikhao", "auto_short_aur_dikhao", 0.98);
  }
  if (/^(?:wahi\s*wala|vahi\s*wala|wahi\s*chahiye|wohi\s*wala)[\s.?!]*$/i.test(q) || /^(?:वही वाला|वही चाहिए)[\s.?!]*$/i.test(q)) {
    return makeResult("order_placement_modification", "order_placement", "short_wahi_wala", "auto_short_wahi_wala", 0.98, true);
  }
  if (/^(?:(?:\d+|ek|do|teen|chaar|paanch|one|two|three|four|five|एक|दो|तीन|चार|पांच)\s*(?:pack|jar|bottle|kg|gm)?\s*chahiye)[\s.?!]*$/i.test(q)) {
    return makeResult("order_placement_modification", "order_placement", "short_quantity", "auto_short_quantity_contextual", 0.98, true);
  }
  if (/^(?:bhej\s*do|pack\s*kardo|pack\s*kar\s*do|bhejo|bhej\s*dijiye)[\s.?!]*$/i.test(q) || /^(?:भेज दो|पैक कर दो|भेज दीजिए)[\s.?!]*$/i.test(q)) {
    return makeResult("order_placement_modification", "order_placement", "short_bhej_do", "auto_short_bhej_do", 0.98, true);
  }
  if (/^(?:nahi\s*rehne\s*do|rehne\s*do|rehne\s*dijiye|cancel\s*karo)[\s.?!]*$/i.test(q) || /^(?:रहने दो|रहने दीजिए)[\s.?!]*$/i.test(q)) {
    return makeResult("general_assistance_clarification", "negative_response", "short_rehne_do", "auto_short_rehne_do", 0.98);
  }
  if (/^(?:same|same\s*wala|same\s*chahiye|wahi\s*same)[\s.?!]*$/i.test(q) || /^(?:वही सेम|सेम वाला)[\s.?!]*$/i.test(q)) {
    return makeResult("order_placement_modification", "order_placement", "short_same", "auto_short_same_reorder", 0.98, true);
  }

  // =========================================================================
  // PRIORITY 5: INDIAN PRICING & BARGAINING CONVERSATIONS (10 templates)
  // Handles Thoda kam karo, Last price, Isse sasta, Wholesale rate, Do lene par discount, Bulk order, Koi offer, Achhi deal, Price zyada hai, Final amount
  // =========================================================================
  if (/\b(?:thoda\s*kam\s*kar|kam\s*karo|kam\s*lagao|kuch\s*kam\s*karo|thoda\s*discount|discount\s*milega\s*kya)\b/i.test(q) || /(?:थोड़ा कम कर|कम करो|कम लगाओ)/i.test(q)) {
    return makeResult("indian_pricing_bargaining", "pricing_bargaining", "thoda_kam_karo", "auto_price_thoda_kam_karo", 0.97);
  }
  if (/\b(?:last\s*price|final\s*price|last\s*rate|final\s*rate)\b/i.test(q) || /(?:लास्ट प्राइस|फाइनल रेट)/i.test(q)) {
    return makeResult("indian_pricing_bargaining", "pricing_bargaining", "last_price", "auto_price_last_price", 0.97);
  }
  if (/\b(?:isse\s*sasta|sasta\s*kuch|sasta\s*option|cheaper\s*option)\b/i.test(q) || /(?:इससे सस्ता|सस्ता कुछ)/i.test(q)) {
    return makeResult("indian_pricing_bargaining", "pricing_bargaining", "cheaper_option", "auto_price_sasta_kuch", 0.97);
  }
  if (/\b(?:wholesale\s*rate|wholesale\s*price|wholesale\s*mein)\b/i.test(q) || /(?:होलसेल रेट|होलसेल)/i.test(q)) {
    return makeResult("indian_pricing_bargaining", "pricing_bargaining", "wholesale_rate", "auto_price_wholesale_rate", 0.97);
  }
  if (/\b(?:do\s*lene\s*par|2\s*lene\s*par|2\s*pe\s*discount|multiple\s*pack\s*discount)\b/i.test(q) || /(?:दो लेने पर डिस्काउंट|2 लेने पर)/i.test(q)) {
    return makeResult("indian_pricing_bargaining", "pricing_bargaining", "multi_unit_discount", "auto_price_do_lene_par_discount", 0.97);
  }
  if (/\b(?:bulk\s*order|bulk\s*rate|badi\s*quantity\s*ka\s*rate)\b/i.test(q) || /(?:बल्क ऑर्डर|बल्क रेट)/i.test(q)) {
    return makeResult("indian_pricing_bargaining", "pricing_bargaining", "bulk_price", "auto_price_bulk_order_price", 0.97);
  }
  if (/\b(?:koi\s*offer\s*chal\s*raha|koi\s*offer\s*hai|latest\s*offer|current\s*deal)\b/i.test(q) || /(?:कोई ऑफर चल रहा|कोई ऑफर है)/i.test(q)) {
    return makeResult("indian_pricing_bargaining", "pricing_bargaining", "ongoing_offers", "auto_price_ongoing_offers", 0.97);
  }
  if (/\b(?:isse\s*achhi\s*deal|achhi\s*deal\s*milegi|better\s*deal)\b/i.test(q) || /(?:अच्छी डील मिलेगी)/i.test(q)) {
    return makeResult("indian_pricing_bargaining", "pricing_bargaining", "better_deal", "auto_price_achhi_deal", 0.97);
  }
  if (/\b(?:price\s*thoda\s*zyada|price\s*zyada|rate\s*zyada|mehenga\s*hai|costly\s*hai)\b/i.test(q) || /(?:प्राइस थोड़ा ज्यादा|महंगा है|दाम ज्यादा)/i.test(q)) {
    return makeResult("indian_pricing_bargaining", "pricing_bargaining", "price_value_explanation", "auto_price_price_zyada_hai", 0.97);
  }
  if (/\b(?:final\s*amount\s*bata|total\s*kitna\s*hua|kitna\s*amount\s*bana)\b/i.test(q) || /(?:फाइनल अमाउंट बता|कुल कितना हुआ)/i.test(q)) {
    return makeResult("indian_pricing_bargaining", "pricing_bargaining", "final_amount_breakdown", "auto_price_final_amount_breakdown", 0.97);
  }

  // =========================================================================
  // PRIORITY 6: CUSTOMER HESITATION & TRUST (8 templates)
  // Handles Pehli baar order, Genuine check, Original check, Guarantee, Pasand nahi aaya toh, Return policy, Store location, Reviews dikhao
  // =========================================================================
  if (/\b(?:pehli\s*baar\s*order|first\s*time\s*order|first\s*order)\b/i.test(q) || /(?:पहली बार ऑर्डर)/i.test(q)) {
    return makeResult("customer_hesitation_trust", "trust_assurance", "first_time_buyer", "auto_trust_first_time_buyer", 0.97);
  }
  if (/\b(?:aap\s*genuine\s*ho|genuine\s*hai|fraud\s*to\s*nahi|bharosa\s*hai|is\s*it\s*genuine)\b/i.test(q) || /(?:आप जेन्युइन हो|भरोसा|फ्रॉड तो नहीं)/i.test(q)) {
    return makeResult("customer_hesitation_trust", "trust_assurance", "genuine_check", "auto_trust_genuine_check", 0.97);
  }
  if (/\b(?:product\s*original\s*hai|asli\s*hai|pure\s*hai\s*na|duplicate\s*to\s*nahi)\b/i.test(q) || /(?:असली है|ओरिजिनल है|डुप्लीकेट तो नहीं)/i.test(q)) {
    return makeResult("customer_hesitation_trust", "trust_assurance", "product_original", "auto_trust_product_original_hai", 0.97);
  }
  if (/\b(?:koi\s*guarantee\s*hai|guarantee\s*kya\s*hai|kya\s*guarantee)\b/i.test(q) || /(?:कोई गारंटी है|क्या गारंटी)/i.test(q)) {
    return makeResult("customer_hesitation_trust", "trust_assurance", "quality_guarantee", "auto_trust_quality_guarantee", 0.97);
  }
  if (/\b(?:pasand\s*na(?:hi)?\s*aaya|pasand\s*na\s*aaye|not\s*satisfied)\b/i.test(q) || /(?:पसंद नहीं आया तो|पसंद न आए)/i.test(q)) {
    return makeResult("customer_hesitation_trust", "trust_assurance", "satisfaction_policy", "auto_trust_pasand_nahi_aaya", 0.97);
  }
  if (/\b(?:return\s*ho\s*sakta|return\s*policy|wapas\s*kar\s*sakte)\b/i.test(q) || /(?:रिटर्न हो सकता|वापस कर सकते)/i.test(q)) {
    return makeResult("customer_hesitation_trust", "trust_assurance", "return_eligibility", "auto_trust_return_possible", 0.97);
  }
  if (/\b(?:store\s*kahan\s*hai|aapka\s*store|dukaan\s*kahan|shop\s*location|physical\s*store)\b/i.test(q) || /(?:स्टोर कहाँ है|दुकान कहाँ है)/i.test(q)) {
    return makeResult("customer_hesitation_trust", "trust_assurance", "store_location", "auto_trust_store_kahan_hai", 0.97);
  }
  if (/\b(?:reviews\s*dikha|review\s*dikhao|customer\s*reviews?|feedback\s*dikhao)\b/i.test(q) || /(?:रिव्यूज दिखा|ग्राहक रिव्यू)/i.test(q)) {
    return makeResult("customer_hesitation_trust", "trust_assurance", "reviews_ratings", "auto_trust_reviews_ratings", 0.97);
  }

  // =========================================================================
  // PRIORITY 7: FOLLOW-UPS AND INCOMPLETE CONVERSATIONS (8 templates)
  // Handles Ji bataiye, Haan wahi chahiye, Ek aur cheez, Abhi decide nahi kiya, Baad mein order karunga, Thoda time dijiye, Kal baat karte hain, Yaad dila dena
  // =========================================================================
  if (/^(?:ji\s*bataiye|bataiye\s*ji|batao\s*ji)[\s.!?]*$/i.test(q) || /^(?:जी बताइए|बताइए जी)[\s.!?]*$/i.test(q)) {
    return makeResult("followup_incomplete", "follow_up", "ji_bataiye", "auto_follow_ji_bataiye", 0.97);
  }
  if (/\b(?:haan\s*wahi\s*chahiye|yes\s*that\s*one|wahi\s*wala\s*chahiye)\b/i.test(q) || /(?:हाँ वही चाहिए)/i.test(q)) {
    return makeResult("followup_incomplete", "follow_up", "wahi_chahiye", "auto_follow_wahi_chahiye", 0.97, true);
  }
  if (/\b(?:ek\s*aur\s*cheez|ek\s*sawal\s*aur|one\s*more\s*thing|one\s*more\s*question)\b/i.test(q) || /(?:एक और चीज़|एक और सवाल)/i.test(q)) {
    return makeResult("followup_incomplete", "follow_up", "ek_aur_cheez", "auto_follow_ek_aur_cheez", 0.97);
  }
  if (/\b(?:abhi\s*decide\s*nahi|haven'?t\s*decided|baad\s*mein\s*batata)\b/i.test(q) || /(?:अभी डिसाइड नहीं किया)/i.test(q)) {
    return makeResult("followup_incomplete", "follow_up", "decide_nahi_kiya", "auto_follow_abhi_decide_nahi_kiya", 0.97);
  }
  if (/\b(?:baad\s*mein\s*order|later\s*order|order\s*later|kuch\s*din\s*baad)\b/i.test(q) || /(?:बाद में ऑर्डर)/i.test(q)) {
    return makeResult("followup_incomplete", "follow_up", "baad_mein_order", "auto_follow_baad_mein_order", 0.97);
  }
  if (/\b(?:thoda\s*time\s*dijiye|give\s*some\s*time|thoda\s*waqt|soch\s*ke\s*batata)\b/i.test(q) || /(?:थोड़ा टाइम दीजिए|थोड़ा समय)/i.test(q)) {
    return makeResult("followup_incomplete", "follow_up", "thoda_time_dijiye", "auto_follow_thoda_time_dijiye", 0.97);
  }
  if (/\b(?:kal\s*baat\s*karte|talk\s*tomorrow|kal\s*message\s*karta)\b/i.test(q) || /(?:कल बात करते हैं|कल बात करेंगे)/i.test(q)) {
    return makeResult("followup_incomplete", "follow_up", "kal_baat_karein", "auto_follow_kal_baat_karte_hain", 0.97);
  }
  if (/\b(?:yaad\s*dila\s*dena|remind\s*me|remind\s*karna)\b/i.test(q) || /(?:याद दिला देना|रिमाइंड कर देना)/i.test(q)) {
    return makeResult("followup_incomplete", "follow_up", "yaad_dila_dena", "auto_follow_yaad_dila_dena", 0.97);
  }

  // =========================================================================
  // PRIORITY 8: CASUAL INDIAN WHATSAPP CONVERSATIONS (10 templates)
  // Handles Kaise ho ji?, Sab badhiya?, Hello bhaiya, Namaste, Good morning, Good evening, Kya haal hai?, Aap available hain?, Online ho kya?, Baad mein baat karte hain
  // =========================================================================
  if (/\b(?:kaise\s*ho\s*ji|aap\s*kaise\s*ho\s*ji|kese\s*ho\s*ji)\b/i.test(q) || /(?:कैसे हो जी|कैसी हैं जी)/i.test(q)) {
    return makeResult("casual_conversations", "casual_conversation", "kaise_ho_ji", "auto_casual_kaise_ho_ji", 0.97);
  }
  if (/\b(?:sab\s*badhiya\??|sb\s*badhiya|sab\s*theek\??)\b/i.test(q) || /(?:सब बढ़िया|सब ठीक)/i.test(q)) {
    return makeResult("casual_conversations", "casual_conversation", "sab_badhiya", "auto_casual_sab_badhiya", 0.97);
  }
  if (/\b(?:hello\s*bhaiya|namaste\s*bhaiya|hlo\s*bhaiya|bhaiya\s*ji)\b/i.test(q) || /(?:नमस्ते भैया|हेलो भैया|भैया)/i.test(q)) {
    return makeResult("casual_conversations", "casual_conversation", "hello_bhaiya", "auto_casual_hello_bhaiya", 0.97);
  }
  if (/\b(?:kya\s*haal\s*hai|kya\s*haal\s*chaal|kya\s*haal)\b/i.test(q) || /(?:क्या हाल है|क्या हाल)/i.test(q)) {
    return makeResult("casual_conversations", "casual_conversation", "kya_haal_hai", "auto_casual_kya_haal_hai", 0.97);
  }
  if (/\b(?:aap\s*available\s*hain|are\s*you\s*available|available\s*ho\s*kya)\b/i.test(q) || /(?:आप उपलब्ध हैं)/i.test(q)) {
    return makeResult("casual_conversations", "casual_conversation", "available_check", "auto_casual_available_hain", 0.97);
  }
  if (/\b(?:online\s*ho\s*kya|online\s*hai\s*kya|online\s*ho\??)\b/i.test(q) || /(?:ऑनलाइन हो क्या|ऑनलाइन हैं)/i.test(q)) {
    return makeResult("casual_conversations", "casual_conversation", "online_check", "auto_casual_online_ho_kya", 0.97);
  }
  if (/\b(?:baad\s*mein\s*baat\s*karte|baad\s*me\s*baat|talk\s*later)\b/i.test(q) || /(?:बाद में बात करते हैं)/i.test(q)) {
    return makeResult("casual_conversations", "casual_conversation", "baad_mein_baat", "auto_casual_baad_mein_baat", 0.97);
  }
  if (/^(?:good\s*morning\s*ji|gm\s*ji)[\s.!?]*$/i.test(q) || /^(?:शुभ प्रभात जी)[\s.!?]*$/i.test(q)) {
    return makeResult("casual_conversations", "casual_conversation", "good_morning", "auto_casual_good_morning", 0.97);
  }
  if (/^(?:good\s*evening\s*ji|ge\s*ji)[\s.!?]*$/i.test(q) || /^(?:शुभ संध्या जी)[\s.!?]*$/i.test(q)) {
    return makeResult("casual_conversations", "casual_conversation", "good_evening", "auto_casual_good_evening", 0.97);
  }
  if (/^(?:namaste\s*ji|pranam\s*ji)[\s.!?]*$/i.test(q) || /^(?:नमस्ते जी|प्रणाम जी)[\s.!?]*$/i.test(q)) {
    return makeResult("casual_conversations", "casual_conversation", "namaste_ji", "auto_casual_namaste_ji", 0.97);
  }

  // =========================================================================
  // PRIORITY 8B: ACKNOWLEDGEMENTS ("Okay", "Sure", "Got it")
  // =========================================================================
  const isAck =
    /^(?:ok|okay|k|okk|alright|sure|fine|got\s*it|understood|achha|acha|theek\s*hai|theek|haan\s*ji|bilkul|sahi\s*hai|noted)(?:\s+ji)?[\s.!]*$/i.test(q) ||
    /\b(?:theek\s*hai|achha\s*ji|theek\s*hai\s*ji|got\s*it|all\s*good)\b/i.test(q) ||
    /(?:^|[\s,।!?.])(?:ठीक है|अच्छा|जी हाँ|बिल्कुल|सही है|समझ गया|नोटेड)(?:[\s,।!?.]|$)/i.test(q);

  if (isAck) {
    if (q.includes("sure") || q.includes("bilkul") || q.includes("बिल्कुल")) {
      return makeResult("thank_you_acknowledgements", "acknowledgement", "sure", "auto_ack_sure", 0.98);
    }
    if (q.includes("got it") || q.includes("understood") || q.includes("समझ गया")) {
      return makeResult("thank_you_acknowledgements", "acknowledgement", "got_it", "auto_ack_got_it", 0.98);
    }
    return makeResult("thank_you_acknowledgements", "acknowledgement", "okay", "auto_ack_ok_noted", 0.98);
  }

  // =========================================================================
  // PRIORITY 8C: POSITIVE CONFIRMATIONS ("Yes", "Haan", "Definitely")
  // =========================================================================
  const isPositive =
    /^(?:yes|yeah|yep|yup|definitely|sounds\s*good|perfect|great|nice|haan|ji\s*haan|ha\s*ji|bhejo|pack\s*karo)(?:\s+please|\s+ji)?[\s.!]*$/i.test(q) ||
    /\b(?:yes\s*please|yes\s*definitely|sounds\s*good|proceed|confirm\s*order|haan\s*ji|bilkul\s*ji)\b/i.test(q) ||
    /(?:^|[\s,।!?.])(?:हाँ|जी हाँ|ज़रूर|बढ़िया|परफेक्ट|भेज दो|पैक करो)(?:[\s,।!?.]|$)/i.test(q);

  if (isPositive) {
    if (
      context.activeStage === "discussing_product" ||
      context.activeStage === "awaiting_quantity" ||
      context.activeStage === "awaiting_address" ||
      context.lastIntent === "product_enquiry" ||
      context.lastIntent === "price_enquiry" ||
      context.lastIntent === "packaging_quantity_enquiry"
    ) {
      return makeResult(
        "order_placement_modification",
        "order_placement",
        "confirm_and_address",
        "auto_order_ask_address",
        0.95,
        true
      );
    }
    return makeResult("general_assistance_clarification", "positive_response", "affirmative", "auto_assist_affirmative_followup", 0.95);
  }

  // =========================================================================
  // PRIORITY 8D: NEGATIVE DECLINATIONS ("No", "No thanks", "Nahi", "Not interested")
  // =========================================================================
  const isNegative =
    /^(?:no|nah|nope|no\s*thanks|not\s*interested|maybe\s*later|nahi|nahin|nahi\s*ji|abhi\s*nahi|rehne\s*dijiye|rehne\s*do|zarurat\s*nahi)(?:[\s\w]*)?$/i.test(q) ||
    /\b(?:no\s*thanks|not\s*interested|maybe\s*later|nahi\s*chahiye|abhi\s*nahi|rehne\s*dijiye|rehne\s*do|zarurat\s*nahi|don'?t\s*want|not\s*now)\b/i.test(q) ||
    /(?:^|[\s,।!?.])(?:नहीं|नहीं जी|अभी नहीं|नहीं चाहिए|रहने दीजिए|रहने दो|ज़रूरत नहीं|रुचि नहीं)(?:[\s,।!?.]|$)/i.test(q);

  if (isNegative) {
    return makeResult("general_assistance_clarification", "negative_response", "respect_negative", "auto_assist_negative_respect", 0.98);
  }

  // =========================================================================
  // PRIORITY 8E: BYE & CLOSING GREETINGS
  // =========================================================================
  if (
    /^(?:bye|good\s*bye|see\s*you|alvida|take\s*care|good\s*night|gn)[\s.!]*$/i.test(q) ||
    /(?:^|[\s,।!?.])(?:अलविदा|बाय|शुभ रात्रि|ध्यान रखें)(?:[\s,।!?.]|$)/i.test(q)
  ) {
    return makeResult("casual_conversations", "casual", "closing_bye", "auto_casual_closing_bye", 0.98);
  }

  // =========================================================================
  // PRIORITY 8F: EARLY GREETINGS ("Hello", "Good morning", "Namaste")
  // =========================================================================
  const isGreetingEarly =
    /^(?:hi|hello|hey|hlo)(?:[\s,!.+]+(?:there|all|team|ji|everyone))?[\s.!]*$/i.test(q) ||
    /^(?:good\s*morning|good\s*evening|good\s*afternoon|namaste|namaste\s*ji|pranam)(?:[\s,!.+]+(?:ji|all))?[\s.!]*$/i.test(q) ||
    /^(?:hi|hello|hey|hlo)[\s,!.+]+(?:good\s*morning|good\s*evening|good\s*afternoon|namaste|pranam)/i.test(q) ||
    /(?:^|[\s,।!?.])(?:नमस्ते|प्रणाम|शुभ प्रभात|शुभ संध्या|हेलो|हाय)(?:[\s,।!?.]|$)/i.test(q);

  if (isGreetingEarly) {
    if (q.includes("morning") || q.includes("प्रभात")) {
      return makeResult("greetings_welcome", "greetings", "morning", "auto_greet_morning", 0.98);
    }
    if (q.includes("evening") || q.includes("संध्या")) {
      return makeResult("greetings_welcome", "greetings", "evening", "auto_greet_evening", 0.98);
    }
    if (q.includes("namaste") || q.includes("pranam") || q.includes("नमस्ते") || q.includes("प्रणाम")) {
      return makeResult("greetings_welcome", "greetings", "namaste", "auto_greet_namaste", 0.98);
    }
    return makeResult("greetings_welcome", "greetings", "general", "auto_greet_general", 0.98);
  }

  // =========================================================================
  // PRIORITY 8: CASUAL CONVERSATION ("How are you?", "Aap kaise hain?", "Sab badhiya?")
  // =========================================================================
  if (
    /\b(?:how\s*are\s*you|how\s*is\s*your\s*day|what\s*are\s*you\s*doing|are\s*you\s*available|aap\s*kaise\s*hain|kaise\s*ho|kya\s*haal|sab\s*badhiya|kya\s*kar\s*rahe\s*ho|sb\s*thik)\b/i.test(q) ||
    /(?:कैसे हो|कैसी हैं|क्या हाल|सब बढ़िया|क्या कर रहे हो)/i.test(q)
  ) {
    if (q.includes("doing") || q.includes("kar rahe") || q.includes("कर रहे")) {
      return makeResult("casual_conversations", "casual", "what_doing", "auto_casual_what_doing", 0.96);
    }
    if (q.includes("available") || q.includes("open") || q.includes("उपलब्ध")) {
      return makeResult("casual_conversations", "casual", "availability_check", "auto_casual_availability_check", 0.96);
    }
    if (q.includes("badhiya") || q.includes("बढ़िया") || q.includes("sb thik")) {
      return makeResult("casual_conversations", "casual", "everything_good", "auto_casual_everything_good", 0.96);
    }
    return makeResult("casual_conversations", "casual", "how_are_you", "auto_casual_how_are_you", 0.96);
  }

  // =========================================================================
  // PRIORITY 9: CONFUSION & CLARIFICATION ("What do you mean?", "Samajh nahi aaya")
  // =========================================================================
  if (
    /\b(?:what\s*do\s*you\s*mean|i\s*don'?t\s*understand|can\s*you\s*explain|please\s*explain\s*again|samajh\s*nahi\s*aaya|thoda\s*detail\s*mein|clear\s*karein|phir\s*se\s*batao)\b/i.test(q) ||
    /(?:समझ नहीं आया|फिर से बताएं|विस्तार से बताएं)/i.test(q)
  ) {
    return makeResult("general_assistance_clarification", "clarification", "explain_again", "auto_assist_clarify_explain", 0.95);
  }

  // =========================================================================
  // PRIORITY 10: FOLLOW-UP MESSAGES ("Any update?", "Waiting for your response", "Koi update?")
  // =========================================================================
  if (
    /^(?:any\s*update|hello\?|are\s*you\s*there|waiting\s*for\s*(?:your\s*)?response|koi\s*update|reply\s*please|bataiye\s*ji|waiting)[\s?!.]*$/i.test(q) ||
    /\b(?:any\s*update\s*on\s*my|waiting\s*for\s*(?:your\s*)?reply|koi\s*update\s*hai)\b/i.test(q) ||
    /(?:कोई अपडेट|बताइए जी|प्रतीक्षा|जवाब दीजिए)/i.test(q)
  ) {
    if (context.lastIntent === "order_status" || context.lastIntent === "order_placement") {
      return makeResult("order_status_tracking", "order_status", "status_check", "auto_status_in_transit", 0.95);
    }
    return makeResult("general_assistance_clarification", "follow_up", "waiting_reply", "auto_assist_followup_response", 0.95);
  }

  // =========================================================================
  // PRIORITY: ORDER STATUS & TRACKING
  // =========================================================================
  if (
    entities.orderNumber ||
    /\b(?:where\s*is\s*my\s*order|order\s*status|track\s*my\s*order|track\s*order|order\s*tracking|tracking\s*number|consignment|order\s*kahan|mera\s*order|parcel\s*kahan|kahan\s*tak\s*pahuncha|kahan\s*pahuncha|kahan\s*hai\s*mera\s*order)\b/i.test(q) ||
    /(?:ऑर्डर स्टेटस|मेरा ऑर्डर कहाँ|ट्रैकिंग|पार्सल कहाँ|कहाँ पहुँचा)/i.test(q)
  ) {
    if (entities.orderNumber) {
      return makeResult("order_status_tracking", "order_status", "in_transit", "auto_status_in_transit", 0.98);
    }
    return makeResult("order_status_tracking", "order_status", "ask_order_number", "auto_status_ask_number", 0.96);
  }

  // =========================================================================
  // PRIORITY: DELIVERY TIMELINE & DISPATCH ENQUIRY
  // =========================================================================
  if (
    /\b(?:when\s*will\s*it\s*arrive|how\s*many\s*days\s*for\s*delivery|delivery\s*timeline|delivery\s*time|when\s*will\s*it\s*deliver|when\s*will\s*it\s*reach|when\s*will\s*my\s*parcel\s*arrive|how\s*long\s*does\s*delivery\s*take|delivery\s*days|estimated\s*delivery)\b/i.test(q) ||
    /\b(?:kab\s*tak\s*aayega|kab\s*aayega|kitne\s*din\s*mein|kitne\s*din\s*lagenge|kitna\s*time\s*lagega\s*delivery|delivery\s*kab\s*hogi|parcel\s*kab\s*milega)\b/i.test(q) ||
    /(?:कब तक आएगा|कितने दिन लगेंगे|डिलीवरी कब होगी)/i.test(q)
  ) {
    return makeResult("shipping_delivery", "delivery_enquiry", "delivery_timeline", "auto_ship_timeline", 0.97);
  }

  // =========================================================================
  // PRIORITY: PAYMENT & ORDER ISSUES (10 templates)
  // =========================================================================
  if (/\b(?:payment\s*pending\s*dikha|pending\s*dikha\s*raha|pending\s*show\s*kar)\b/i.test(q) || /(?:पेमेंट पेंडिंग दिखा रहा)/i.test(q)) {
    return makeResult("payment_enquiries", "payment_enquiry", "pending_status", "auto_pay_pending_status", 0.97);
  }
  if (/\b(?:upi\s*se\s*pay\s*kar\s*diya|gpay\s*kar\s*diya|phonepe\s*kar\s*diya|paytm\s*kar\s*diya|maine\s*upi)\b/i.test(q) || /(?:यूपीआई से पे कर दिया)/i.test(q)) {
    return makeResult("payment_enquiries", "payment_enquiry", "upi_paid", "auto_pay_upi_se_pay", 0.97);
  }
  if (/\b(?:payment\s*screenshot|screenshot\s*bhej|screenshot\s*sent)\b/i.test(q) || /(?:पेमेंट स्क्रीनशॉट भेज दिया)/i.test(q)) {
    return makeResult("payment_enquiries", "payment_enquiry", "screenshot_sent", "auto_pay_screenshot_sent", 0.97);
  }
  if (/\b(?:payment\s*fail\s*ho\s*gaya|payment\s*failed|transaction\s*fail)\b/i.test(q) || /(?:पेमेंट फेल हो गया|ट्रांजैक्शन फेल)/i.test(q)) {
    return makeResult("payment_enquiries", "payment_enquiry", "failed_help", "auto_pay_failed_help", 0.97);
  }
  if (/\b(?:refund\s*kab\s*milega|paise\s*wapas\s*kab|refund\s*timeline)\b/i.test(q) || /(?:रिफंड कब मिलेगा|पैसे वापस कब)/i.test(q)) {
    return makeResult("payment_enquiries", "payment_enquiry", "refund_timeline", "auto_pay_refund_timeline", 0.97);
  }
  if (/\b(?:paise\s*kat\s*gaye|money\s*debited|amount\s*deducted)\b/i.test(q) && /\b(?:order\s*nahi|no\s*order)\b/i.test(q)) {
    return makeResult("payment_enquiries", "payment_enquiry", "debited_no_order", "auto_pay_debited_no_order", 0.97);
  }
  if (/\b(?:payment\s*link\s*bhej|send\s*payment\s*link|pay\s*link)\b/i.test(q) || /(?:पेमेंट लिंक भेज दो|पेमेंट लिंक)/i.test(q)) {
    return makeResult("payment_enquiries", "payment_enquiry", "link_request", "auto_pay_link_request", 0.97);
  }
  if (/\b(?:online\s*payment\s*compulsory|advance\s*payment\s*compulsory|online\s*hi\s*karna\s*hoga)\b/i.test(q) || /(?:ऑनलाइन पेमेंट जरूरी है)/i.test(q)) {
    return makeResult("payment_enquiries", "payment_enquiry", "online_compulsory", "auto_pay_online_compulsory", 0.97);
  }
  if (/\b(?:cod\s*mein\s*payment\s*kab|delivery\s*ke\s*time\s*pay|kab\s*pay\s*karna\s*hoga)\b/i.test(q) || /(?:सीओडी में पेमेंट कब)/i.test(q)) {
    return makeResult("payment_enquiries", "payment_enquiry", "cod_payment_timing", "auto_pay_cod_payment_timing", 0.97);
  }
  if (
    /\b(?:payment\s*ho\s*gaya|payment\s*done|paise\s*bhej\s*diye|i\s*have\s*paid|paid\s*already)\b/i.test(q) ||
    entities.paymentReference ||
    /(?:पेमेंट हो गया|भुगतान हो गया|पैसे भेज दिए)/i.test(q)
  ) {
    return makeResult("payment_enquiries", "payment_enquiry", "payment_confirmed", "auto_pay_ho_gaya", 0.97);
  }

  // =========================================================================
  // PRIORITY: DELIVERY & COD CONVERSATIONS (10 templates)
  // =========================================================================
  if (/\b(?:cod\s*available\s*hai|cash\s*on\s*delivery\s*(?:available|milega|hai)|cod\s*milega)\b/i.test(q) || /(?:सीओडी उपलब्ध है|कैश ऑन डिलीवरी)/i.test(q)) {
    return makeResult("shipping_delivery", "delivery_enquiry", "cod_available", "auto_ship_cod_available", 0.97);
  }
  if (/\b(?:delivery\s*charges?\s*kitne|shipping\s*charges?|delivery\s*ke\s*paise|delivery\s*free\s*hai\s*kya)\b/i.test(q) || /(?:डिलीवरी चार्ज कितना|शिपिंग चार्ज)/i.test(q)) {
    return makeResult("shipping_delivery", "delivery_enquiry", "charges_kitne", "auto_ship_charges_kitne", 0.97);
  }
  if (/\b(?:mere\s*area\s*mein\s*delivery|is\s*area\s*me\s*delivery|pincode\s*pe\s*delivery|yahan\s*delivery\s*hogi)\b/i.test(q) || /(?:मेरे एरिया में डिलीवरी|पिनकोड पर डिलीवरी)/i.test(q)) {
    return makeResult("shipping_delivery", "delivery_enquiry", "area_delivery", "auto_ship_area_delivery", 0.97);
  }
  if (/\b(?:kitne\s*din\s*mein\s*aa\s*jayega|kitne\s*din\s*lagenge|kitna\s*time\s*lagega\s*delivery)\b/i.test(q) || /(?:कितने दिन में आ जाएगा|कितने दिन लगेंगे)/i.test(q)) {
    return makeResult("shipping_delivery", "delivery_enquiry", "kitne_din_aayega", "auto_ship_kitne_din_aayega", 0.97);
  }
  if (/\b(?:aaj\s*deliver\s*ho\s*sakta|same\s*day\s*delivery|aaj\s*mil\s*jayega)\b/i.test(q) || /(?:आज डिलीवर हो सकता|आज मिल जाएगा)/i.test(q)) {
    return makeResult("shipping_delivery", "delivery_enquiry", "aaj_deliver", "auto_ship_aaj_deliver", 0.97);
  }
  if (/\b(?:sunday\s*ko\s*delivery|itwaar\s*ko\s*delivery|sunday\s*open)\b/i.test(q) || /(?:रविवार को डिलीवरी)/i.test(q)) {
    return makeResult("shipping_delivery", "delivery_enquiry", "sunday_delivery", "auto_ship_sunday_delivery", 0.97);
  }
  if (/\b(?:ghar\s*par\s*delivery|doorstep\s*delivery|home\s*delivery\s*karo)\b/i.test(q) || /(?:घर पर डिलीवरी)/i.test(q)) {
    return makeResult("shipping_delivery", "delivery_enquiry", "ghar_par_delivery", "auto_ship_ghar_par_delivery", 0.97);
  }
  if (/\b(?:khud\s*pickup|self\s*pickup|store\s*se\s*le\s*sakta)\b/i.test(q) || /(?:खुद पिकअप|स्टोर से ले सकते)/i.test(q)) {
    return makeResult("shipping_delivery", "delivery_enquiry", "self_pickup", "auto_ship_self_pickup", 0.97);
  }
  if (/\b(?:delivery\s*address\s*change|change\s*address|address\s*badalna)\b/i.test(q) || /(?:डिलीवरी एड्रेस बदलना|पता बदलना)/i.test(q)) {
    return makeResult("shipping_delivery", "delivery_enquiry", "address_change", "auto_ship_address_change", 0.97);
  }
  if (/\b(?:parcel\s*kab\s*tak\s*milega|parcel\s*kab\s*aayega)\b/i.test(q) || /(?:पार्सल कब तक मिलेगा)/i.test(q)) {
    return makeResult("shipping_delivery", "delivery_enquiry", "parcel_kab_milega", "auto_ship_parcel_kab_milega", 0.97);
  }

  // =========================================================================
  // PRIORITY: PRODUCT & SHOPPING QUESTIONS (12 templates)
  // =========================================================================
  if (/\b(?:kya-kya\s*products?\s*available|kya\s*kya\s*products?\s*hain|kya\s*kya\s*available)\b/i.test(q) || /(?:क्या-क्या प्रोडक्ट्स उपलब्ध हैं|क्या क्या प्रोडक्ट्स)/i.test(q)) {
    return makeResult("product_catalogue_enquiries", "catalogue_request", "kya_kya_available", "auto_prod_kya_kya_available", 0.97);
  }
  if (/\b(?:aapke\s*paas\s*aur\s*kya\s*hai|aur\s*kya\s*hai|aur\s*products?\s*batao)\b/i.test(q) || /(?:आपके पास और क्या है|और क्या है)/i.test(q)) {
    return makeResult("product_catalogue_enquiries", "catalogue_request", "aur_kya_hai", "auto_prod_aur_kya_hai", 0.97);
  }
  if (/\b(?:doosra\s*option|dusra\s*option|another\s*option|alternative)\b/i.test(q) || /(?:दूसरा ऑप्शन|दूसरा विकल्प)/i.test(q)) {
    return makeResult("product_details_pricing", "product_enquiry", "doosra_option", "auto_prod_doosra_option", 0.97);
  }
  if (/\b(?:kis\s*kaam\s*aata|kya\s*kaam\s*aata|benefits?\s*kya|fayde\s*kya|use\s*kaise\s*karein)\b/i.test(q) || /(?:किस काम आता है|फायदे क्या हैं)/i.test(q)) {
    return makeResult("product_details_pricing", "product_enquiry", "kis_kaam_aata_hai", "auto_prod_kis_kaam_aata_hai", 0.97);
  }
  if (/\b(?:quality\s*kaisi\s*hai|quality\s*kesi|kaisi\s*quality)\b/i.test(q) || /(?:क्वालिटी कैसी है)/i.test(q)) {
    return makeResult("product_details_pricing", "product_enquiry", "quality_kaisi_hai", "auto_prod_quality_kaisi_hai", 0.97);
  }
  if (/\b(?:size\s*kya\s*hai|kitna\s*size|dimensions?)\b/i.test(q) || /(?:साइज क्या है|साइज़ क्या है)/i.test(q)) {
    return makeResult("packaging_availability", "packaging_enquiry", "size_kya_hai", "auto_prod_size_kya_hai", 0.97);
  }
  if (/\b(?:weight\s*kitna|vajan\s*kitna|kitna\s*weight)\b/i.test(q) || /(?:वजन कितना है|वेट कितना है)/i.test(q)) {
    return makeResult("packaging_availability", "packaging_enquiry", "weight_kitna_hai", "auto_prod_weight_kitna_hai", 0.97);
  }
  if (/\b(?:pack\s*kitne\s*ka\s*hai|packet\s*kitne\s*ka)\b/i.test(q) || /(?:पैक कितने का है)/i.test(q)) {
    return makeResult("product_details_pricing", "price_enquiry", "pack_kitne_ka_hai", "auto_prod_pack_kitne_ka_hai", 0.97);
  }
  if (/\b(?:bada\s*pack|bigger\s*pack|large\s*pack|badi\s*packing)\b/i.test(q) || /(?:बड़ा पैक उपलब्ध है|बड़ा पैक)/i.test(q)) {
    return makeResult("packaging_availability", "packaging_enquiry", "bada_pack", "auto_prod_bada_pack_available", 0.97);
  }
  if (/\b(?:photo\s*bhej|photo\s*dikhao|tasveer\s*bhejo|image\s*bhejo|images?\s*share)\b/i.test(q) || /(?:फोटो भेज सकते हैं|तस्वीर भेजो)/i.test(q)) {
    return makeResult("product_details_pricing", "product_enquiry", "photo_request", "auto_prod_photo_bhej_sakte", 0.97);
  }
  if (/\b(?:product\s*ki\s*details|details\s*bataiye|puri\s*detail\s*batao)\b/i.test(q) || /(?:प्रोडक्ट की डिटेल्स बताइए|जानकारी बताइए)/i.test(q)) {
    return makeResult("product_details_pricing", "product_enquiry", "details_bataiye", "auto_prod_details_bataiye", 0.97);
  }
  if (/\b(?:similar\s*product|milta\s*julta\s*product|milta\s*julta\s*item)\b/i.test(q) || /(?:सिमिलर प्रोडक्ट|मिलता जुलता)/i.test(q)) {
    return makeResult("product_catalogue_enquiries", "catalogue_request", "similar_product", "auto_prod_similar_product", 0.97);
  }

  // =========================================================================
  // PRIORITY: ORDERING & PURCHASE INTENT (10 templates)
  // =========================================================================
  if (/\b(?:repeat\s*order|dubara\s*mangwana|phir\s*se\s*order)\b/i.test(q) || /(?:रिपीट ऑर्डर|दोबारा मंगाना)/i.test(q)) {
    return makeResult("order_placement_modification", "order_placement", "repeat_order", "auto_order_repeat_order", 0.97, true);
  }
  if (/\b(?:kal\s*wala\s*hi|yesterday\s*product|kal\s*wala\s*product)\b/i.test(q) || /(?:कल वाला ही प्रोडक्ट)/i.test(q)) {
    return makeResult("order_placement_modification", "order_placement", "kal_wala_product", "auto_order_kal_wala_product", 0.97, true);
  }
  if (/\b(?:cart\s*mein\s*add|add\s*to\s*cart)\b/i.test(q) || /(?:कार्ट में ऐड|कार्ट)/i.test(q)) {
    return makeResult("order_placement_modification", "order_placement", "cart_add", "auto_order_cart_mein_add", 0.97, true);
  }
  if (/\b(?:order\s*confirm\s*karna|confirm\s*kardo|confirm\s*kijiye)\b/i.test(q) || /(?:ऑर्डर कन्फर्म करना है|कन्फर्म कर दो)/i.test(q)) {
    return makeResult("order_placement_modification", "order_placement", "confirm_order", "auto_order_confirm_karna_hai", 0.97, true);
  }
  if (/\b(?:ek\s*pack\s*bhej|1\s*pack\s*bhej|ek\s*packet\s*bhejo)\b/i.test(q) || /(?:एक पैक भेज दीजिए|1 पैक भेज)/i.test(q)) {
    return makeResult("order_placement_modification", "order_placement", "ek_pack_bhejo", "auto_order_ek_pack_bhejo", 0.97, true);
  }
  if (/\b(?:do\s*quantity|2\s*quantity|do\s*pack\s*chahiye|2\s*pack\s*chahiye)\b/i.test(q) || /(?:दो क्वांटिटी चाहिए|2 क्वांटिटी)/i.test(q)) {
    return makeResult("order_placement_modification", "order_placement", "do_quantity", "auto_order_do_quantity", 0.97, true);
  }
  if (/\b(?:isko\s*book\s*kar|book\s*kar\s*do|book\s*kijiye)\b/i.test(q) || /(?:इसको बुक कर दो|बुक कर दो)/i.test(q)) {
    return makeResult("order_placement_modification", "order_placement", "isko_book_karo", "auto_order_isko_book_karo", 0.97, true);
  }
  if (/\b(?:ye\s*wala\s*product|yeh\s*wala\s*product|ye\s*chahiye)\b/i.test(q) || /(?:ये वाला प्रोडक्ट चाहिए)/i.test(q)) {
    return makeResult("order_placement_modification", "order_placement", "ye_wala_product", "auto_order_ye_wala_product", 0.97, true);
  }
  if (/\b(?:order\s*place\s*karna|place\s*order|order\s*lagana)\b/i.test(q) || /(?:ऑर्डर प्लेस करना है)/i.test(q)) {
    return makeResult("order_placement_modification", "order_placement", "place_karna_hai", "auto_order_place_karna_hai", 0.97, true);
  }
  if (/\b(?:mujhe\s*ye\s*order|mujhe\s*yeh\s*order|ye\s*order\s*karna)\b/i.test(q) || /(?:मुझे ये ऑर्डर करना है)/i.test(q)) {
    return makeResult("order_placement_modification", "order_placement", "mujhe_ye_chahiye", "auto_order_mujhe_ye_chahiye", 0.97, true);
  }

  // =========================================================================
  // PRIORITY 14: ORDER PLACEMENT INTENT ("I want to order", "I want two", "Send 2 packs")
  // =========================================================================
  const isOrderWording =
    q.includes("place an order") ||
    q.includes("want to order") ||
    q.includes("want to buy") ||
    q.includes("order now") ||
    q.includes("order karna hai") ||
    q.includes("mujhe order") ||
    q.includes("lena hai") ||
    q.includes("mangwana hai") ||
    q.includes("send me") ||
    q.includes("bhejo") ||
    q.includes("chahiye") ||
    q.includes("create order") ||
    q.includes("create an order") ||
    q.includes("create a new order") ||
    q.includes("new order") ||
    q.includes("final order") ||
    /\b(?:neew|new)\s*(?:ordeer|order)\b/i.test(q) ||
    /(?:ऑर्डर करना है|मुझे चाहिए|खरीदना है|भेज दीजिए)/i.test(q);

  if (isOrderWording || entities.quantity || entities.hasAddressIndicator) {
    if (entities.hasAddressIndicator && (entities.product || context.lastDiscussedProductSlug)) {
      return makeResult("order_placement_modification", "order_placement", "confirm_address", "auto_order_address_received", 0.96);
    }
    if (entities.quantity && (entities.product || context.lastDiscussedProductSlug)) {
      return makeResult("order_placement_modification", "order_placement", "quantity_noted", "auto_order_contextual_confirm", 0.96);
    }
    if (entities.product) {
      return makeResult("order_placement_modification", "order_placement", "with_product", "auto_order_ask_address", 0.95);
    }
    if (isOrderWording) {
      return makeResult("order_placement_modification", "order_placement", "generic_prompt", "auto_order_ask_items", 0.92);
    }
  }

  // =========================================================================
  // PRIORITY 15: PRODUCT DETAILS, PRICING & AVAILABILITY
  // =========================================================================
  const isPriceQuery =
    /\b(?:price|cost|rate|how much|kitne ka|kitne ki|kya price|price kya|rate kya|daam|कीमत|दाम)\b/i.test(q);

  const isAvailabilityQuery =
    /\b(?:available|in stock|stock mein|mil jayega|milega|hai kya|uplabdh|उपलब्ध|स्टॉक)\b/i.test(q);

  const isPackagingQuery =
    /\b(?:pack size|pack sizes|packaging|quantity|kitna gm|what sizes|available sizes|jar|bottle|पैकिंग|साइज़)\b/i.test(q);

  // Helper to resolve specific product price template
  const getProductPriceTemplate = (prodName?: string): string => {
    const pn = (prodName || "").toLowerCase();
    if (pn.includes("honey") || pn.includes("shehad")) return "auto_price_honey";
    if (pn.includes("shilajit")) return "auto_price_shilajit";
    if (pn.includes("ghee") || pn.includes("badri")) return "auto_price_ghee";
    if (pn.includes("almond") || pn.includes("badam") || pn.includes("mamra")) return "auto_price_almonds";
    if (pn.includes("walnut") || pn.includes("akhrot")) return "auto_price_walnuts";
    if (pn.includes("saffron") || pn.includes("kesar")) return "auto_price_saffron";
    if (pn.includes("turmeric") || pn.includes("haldi")) return "auto_price_turmeric";
    if (pn.includes("salt") || pn.includes("namak")) return "auto_price_salt";
    if (pn.includes("pickle") || pn.includes("achar")) return "auto_price_pickles";
    return "auto_price_contextual";
  };

  if (entities.product) {
    if (isPriceQuery) {
      const tplId = getProductPriceTemplate(entities.product.name);
      return makeResult("product_details_pricing", "price_enquiry", "single_product", tplId, 0.96);
    }
    if (isAvailabilityQuery) {
      if (entities.product.stockStatus === "out_of_stock") {
        return makeResult("packaging_availability", "product_availability", "out_of_stock", "auto_pack_out_of_stock", 0.98);
      }
      return makeResult("packaging_availability", "product_availability", "in_stock", "auto_pack_in_stock", 0.96);
    }
    if (isPackagingQuery) {
      return makeResult("packaging_availability", "packaging_enquiry", "sizes", "auto_pack_available_sizes", 0.95);
    }
    // Specific product general inquiry (e.g. "Tell me about honey", "Shilajit details")
    const tplId = getProductPriceTemplate(entities.product.name);
    return makeResult("product_details_pricing", "product_enquiry", "details", tplId, 0.95);
  }

  // Contextual price enquiry when product slug is in memory (e.g. "How much is it?")
  if (isPriceQuery && context.lastDiscussedProductSlug) {
    const prevProd = catalogue.find((p) => p.slug.toLowerCase() === context.lastDiscussedProductSlug?.toLowerCase());
    if (prevProd) {
      entities.product = prevProd;
      entities.productName = prevProd.name;
      const tplId = getProductPriceTemplate(prevProd.name);
      return makeResult("product_details_pricing", "price_enquiry", "single_product", tplId, 0.96);
    }
  }

  // =========================================================================
  // PRIORITY 16: PRODUCT CATALOGUE ENQUIRIES ("Tell me about your products", "Show catalogue")
  // =========================================================================
  const isCatalogueRequest =
    /\b(?:catalogue|catalog|menu)\b/i.test(q) ||
    /^\s*products?\s*[?!.]*\s*$/i.test(q) ||
    /\ball\s+products?\b/i.test(q) ||
    /\b(?:all|our|your)?\s*products?\s*(?:list|catalog|catalogue|menu|details?|info|range|collection|variety)\b/i.test(q) ||
    /\b(?:list|details?|info|catalog|catalogue)\s*of\s*(?:all\s*)?products?\b/i.test(q) ||
    /\b(?:tell\s+me|know|hear|learn|read)\s+(?:more\s+)?about\s+(?:all\s+|your\s+|the\s+)?(?:natural\s+|organic\s+|himalayan\s+)?products?\b/i.test(q) ||
    /\b(?:what|which)\s+(?:natural\s+|organic\s+|himalayan\s+)?(?:products?|items?)\s+(?:do\s+you\s+have|do\s+you\s+sell|are\s+available|do\s+you\s+offer|are\s+there)\b/i.test(q) ||
    /\b(?:what\s+are\s+your\s+products?|what\s+do\s+you\s+(?:sell|have|offer|make))\b/i.test(q) ||
    /\b(?:show|send|share|give)\s+(?:me\s+)?(?:your\s+|all\s+)?(?:products?|catalogue|catalog|menu|items?)\b/i.test(q) ||
    /\b(?:about\s+your\s+products?|product\s+details?|products?\s+available)\b/i.test(q) ||
    /\b(?:aapke\s+)?(?:paas\s+)?(?:kya\s+kya|kaun\s+kaun\s+se?)\s+(?:products?|items?|milta\s+hai|bechte\s+ho|hai)\b/i.test(q) ||
    /\b(?:aapke\s+)?products?\s+(?:ke\s+baare\s+mein\s+batao|batao|dikhao|dikha\s+dijiye|list)\b/i.test(q) ||
    /\b(?:kya\s+kya\s+milta\s+hai|kya\s+bechte\s+ho|aapke\s+yahan\s+kya\s+milta\s+hai)\b/i.test(q) ||
    /(?:उत्पाद|कैटलॉग|सामान की सूची|क्या क्या उत्पाद|क्या क्या मिलता है|क्या बेचते हैं|उत्पादों की जानकारी)/i.test(q);

  if (isCatalogueRequest) {
    return makeResult("product_catalogue_enquiries", "catalogue_request", "general_catalogue", "auto_cat_general", 0.98);
  }

  // =========================================================================
  // PRIORITY 17: PURE GREETINGS ("Hi", "Hello", "Namaste", "Good morning")
  // ONLY if not already matched by any specific inquiry above!
  // =========================================================================
  const isPureGreeting =
    /^(?:hi|hello|hey|namaste|namaste\s*ji|pranam|hlo|good\s*morning|good\s*evening|hello\s*ji)[\s.!]*$/i.test(q) ||
    /(?:^|[\s,।!?.])(?:नमस्ते|प्रणाम|शुभ प्रभात|शुभ संध्या|हेलो|हाय)(?:[\s,।!?.]|$)/i.test(q);

  if (isPureGreeting) {
    if (q.includes("morning") || q.includes("प्रभात")) {
      return makeResult("greetings_welcome", "greetings", "morning", "auto_greet_morning", 0.98);
    }
    if (q.includes("evening") || q.includes("संध्या")) {
      return makeResult("greetings_welcome", "greetings", "evening", "auto_greet_evening", 0.98);
    }
    if (q.includes("namaste") || q.includes("pranam") || q.includes("नमस्ते") || q.includes("प्रणाम")) {
      return makeResult("greetings_welcome", "greetings", "namaste", "auto_greet_namaste", 0.98);
    }
    return makeResult("greetings_welcome", "greetings", "general", "auto_greet_general", 0.98);
  }

  // =========================================================================
  // PRIORITY 18: GENERAL PURITY & HIMALAYAN ORIGIN
  // =========================================================================
  if (
    /\b(?:organic|pure|asli|natural|chemical|certified|origin|where do products come from|himalayan)\b/i.test(q) ||
    /(?:शुद्ध|असली|प्राकृतिक|सर्टिफाइड)/i.test(q)
  ) {
    return makeResult("general_assistance_clarification", "general_question", "purity", "auto_assist_purity_guarantee", 0.92);
  }

  // =========================================================================
  // FALLBACK: POLITE HUMAN HANDOFF INSTEAD OF RUDE "UNABLE TO UNDERSTAND"
  // =========================================================================
  return makeResult("human_handoff_unknown", "human_handoff", "unclear_polite", "auto_handoff_unclear_polite", 0.50);
}
