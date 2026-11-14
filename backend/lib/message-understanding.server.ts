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
  "achha ji": "theek hai ji",

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
  const orderMatch = text.match(/(?:#?PM-\d{4,8})|(?:order\s*#?\s*([A-Za-z0-9_-]{4,15}))/i);
  if (orderMatch) {
    entities.orderNumber = orderMatch[1] || orderMatch[0].replace("#", "");
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
  // PRIORITY 3: THANK YOU & GRATITUDE (Eliminates "Unable to understand" on "Thank you")
  // =========================================================================
  const isThankYou =
    /^(?:thank\s*you|thanks|thank\s*u|thx|tq|ty|shukriya|dhanyawad|dhanyavad|bahut dhanyawad|thanks a lot|thank you so much|thanks for helping|thanks for the info|thanks for info|thank you ji|okay thanks|ok thanks|shukriya ji|dhanyawad ji)[\s.!]*$/i.test(q) ||
    /\b(?:thank\s*you\s*so\s*much|thanks\s*a\s*lot|thanks\s*for\s*(?:the\s*)?(?:info|help|information|details)|bahut\s*dhanyawad|aapka\s*shukriya)\b/i.test(q) ||
    /(?:^|[\s,।!?.])(?:धन्यवाद|शुक्रिया|आभार|थैंक यू|थैंक्स)(?:[\s,।!?.]|$)/i.test(q);

  if (isThankYou) {
    if (q.includes("info") || q.includes("information") || q.includes("help") || q.includes("madad") || q.includes("जानकारी")) {
      return makeResult("thank_you_acknowledgements", "thank_you", "info_thanks", "auto_thanks_info_provided", 0.99);
    }
    return makeResult("thank_you_acknowledgements", "thank_you", "general", "auto_thanks_welcome", 0.99);
  }

  // =========================================================================
  // PRIORITY 4: ACKNOWLEDGEMENTS (Eliminates "Unable to understand" on "Okay", "Achha", "Theek hai")
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
  // PRIORITY 5: POSITIVE CONFIRMATIONS ("Yes", "Haan", "Definitely")
  // Check context: if bot asked whether they want to order, continue order!
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
  // PRIORITY 6: NEGATIVE DECLINATIONS ("No", "No thanks", "Nahi", "Not interested")
  // =========================================================================
  const isNegative =
    /^(?:no|nah|nope|no\s*thanks|not\s*interested|maybe\s*later|nahi|nahin|nahi\s*ji|abhi\s*nahi|rehne\s*dijiye|rehne\s*do|zarurat\s*nahi)(?:[\s\w]*)?$/i.test(q) ||
    /\b(?:no\s*thanks|not\s*interested|maybe\s*later|nahi\s*chahiye|abhi\s*nahi|rehne\s*dijiye|rehne\s*do|zarurat\s*nahi|don'?t\s*want|not\s*now)\b/i.test(q) ||
    /(?:^|[\s,।!?.])(?:नहीं|नहीं जी|अभी नहीं|नहीं चाहिए|रहने दीजिए|रहने दो|ज़रूरत नहीं|रुचि नहीं)(?:[\s,।!?.]|$)/i.test(q);

  if (isNegative) {
    return makeResult("general_assistance_clarification", "negative_response", "respect_negative", "auto_assist_negative_respect", 0.98);
  }

  // =========================================================================
  // PRIORITY 7: BYE & CLOSING GREETINGS
  // =========================================================================
  if (
    /^(?:bye|good\s*bye|see\s*you|alvida|take\s*care|good\s*night|gn)[\s.!]*$/i.test(q) ||
    /(?:^|[\s,।!?.])(?:अलविदा|बाय|शुभ रात्रि|ध्यान रखें)(?:[\s,।!?.]|$)/i.test(q)
  ) {
    return makeResult("casual_conversations", "casual", "closing_bye", "auto_casual_closing_bye", 0.98);
  }

  // =========================================================================
  // PRIORITY 7B: GREETINGS ("Hello", "Good morning", "Namaste")
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
  // PRIORITY 11: PAYMENT ENQUIRIES ("Payment done", "QR Code", "UPI")
  // =========================================================================
  if (
    q.includes("payment done") ||
    q.includes("i have paid") ||
    q.includes("paid already") ||
    q.includes("payment kar diya") ||
    q.includes("paise bhej diye") ||
    q.includes("payment status") ||
    q.includes("screenshot") ||
    q.includes("utr") ||
    entities.paymentReference ||
    /(?:पैसे भेज दिए|पेमेंट कर दिया|भुगतान हो गया)/i.test(q)
  ) {
    return makeResult("payment_enquiries", "payment_enquiry", "payment_confirmed", "auto_pay_confirmed", 0.96);
  }

  if (
    q.includes("how to pay") ||
    q.includes("qr code") ||
    q.includes("upi") ||
    q.includes("kahan pay karein") ||
    q.includes("paise kaise bheje") ||
    q.includes("bank details") ||
    q.includes("cod") ||
    q.includes("cash on delivery") ||
    /(?:भुगतान कैसे करें|क्यूआर कोड|यूपीआई)/i.test(q)
  ) {
    return makeResult("payment_enquiries", "payment_enquiry", "instructions", "auto_pay_instructions", 0.96);
  }

  // =========================================================================
  // PRIORITY 12: ORDER STATUS & TRACKING ("Where is my order?", "Mera order kahan hai?")
  // =========================================================================
  if (
    entities.orderNumber ||
    q.includes("where is my order") ||
    q.includes("order status") ||
    q.includes("mera order") ||
    q.includes("track my order") ||
    q.includes("tracking") ||
    q.includes("consignment") ||
    q.includes("kahan tak pahuncha") ||
    q.includes("kahan pahuncha") ||
    q.includes("order kahan hai") ||
    q.includes("parcel kahan hai") ||
    /(?:मेरा ऑर्डर कहाँ है|ऑर्डर स्टेटस|पार्सल कहाँ है)/i.test(q)
  ) {
    return makeResult("order_status_tracking", "order_status", "status_check", "auto_status_ask_number", 0.96);
  }

  // =========================================================================
  // PRIORITY 13: SHIPPING & DELIVERY TIMELINE ("When will it arrive?", "Kab tak aayega?")
  // =========================================================================
  if (
    q.includes("kab tak aayega") ||
    q.includes("kab aayega") ||
    q.includes("when will it arrive") ||
    q.includes("when will it reach") ||
    q.includes("delivery time") ||
    q.includes("kitne din lagenge") ||
    q.includes("how many days") ||
    q.includes("courier partner") ||
    q.includes("dispatch timeline") ||
    q.includes("kab dispatch hoga") ||
    q.includes("when will it dispatch") ||
    q.includes("डिस्पैच") ||
    /(?:कब तक आएगा|कब पहुँचेगा|कितने दिन लगेंगे)/i.test(q)
  ) {
    if (q.includes("dispatch")) {
      return makeResult("shipping_delivery", "delivery_enquiry", "dispatch_time", "auto_ship_dispatch_time", 0.95);
    }
    if (q.includes("courier") || q.includes("कूरियर")) {
      return makeResult("shipping_delivery", "delivery_enquiry", "courier_partner", "auto_ship_carrier_info", 0.95);
    }
    return makeResult("shipping_delivery", "delivery_enquiry", "timeline", "auto_ship_timeline", 0.95);
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
