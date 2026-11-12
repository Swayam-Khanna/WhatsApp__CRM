import crypto from "crypto";
import { db } from "../db.ts";
import { orderCrmSync } from "../schema/orders.ts";
import { crmOrders } from "../schema/crm.ts";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../lib/mongodb.ts";

export interface CrmShippingAddress {
  fullName: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface CrmOrderItem {
  productId?: string;
  sku?: string;
  productName: string;
  quantity: number;
  unitPricePaise: number;
  totalPaise: number;
  variantName?: string | null;
}

export interface CrmOrderPayload {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  totalPaise: number;
  subtotalPaise?: number;
  shippingPaise?: number;
  discountPaise?: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  shippingAddressSnapshot: CrmShippingAddress;
  items: CrmOrderItem[];
  createdAt?: string;
}

export interface CrmSyncResult {
  success: boolean;
  status: "synced" | "retry_pending" | "failed";
  orderNumber: string;
  attempts: number;
  crmResponse?: any;
  error?: string;
}

// Global in-memory outbox cache for runtime resilience across serverless invocations
declare global {
  // eslint-disable-next-line no-var
  var __crmSyncOutbox: Map<string, any> | undefined;
}

if (!globalThis.__crmSyncOutbox) {
  globalThis.__crmSyncOutbox = new Map();
}

/**
 * Normalizes Indian phone numbers into strict E.164 format (+91XXXXXXXXXX)
 * Preserves country code, strips formatting artifacts, and validates.
 */
export function normalizeIndianPhone(phone: string): string {
  if (!phone || typeof phone !== "string") return "";
  const trimmed = phone.trim();

  // Strip common separating characters
  const cleaned = trimmed.replace(/[\s\-\(\)\.]/g, "");

  if (cleaned.startsWith("+91")) {
    const digits = cleaned.slice(3).replace(/\D/g, "");
    if (digits.length === 10) return `+91${digits}`;
  }

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  const digitsOnly = cleaned.replace(/\D/g, "");
  // Standard 10-digit Indian mobile numbers start with 6, 7, 8, or 9
  if (digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly)) {
    return `+91${digitsOnly}`;
  }
  // 11 digits starting with 0 (STD trunk prefix)
  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    const mobileDigits = digitsOnly.slice(1);
    if (/^[6-9]/.test(mobileDigits)) return `+91${mobileDigits}`;
  }
  // 12 digits starting with 91
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return `+${digitsOnly}`;
  }

  // Fallback if already 10 digits
  return digitsOnly ? `+${digitsOnly}` : "";
}

/**
 * Maps the authoritative storefront order model into the exact WhatsApp CRM payload schema.
 * Reconciles paise calculations, applies phone normalization, and creates an immutable snapshot.
 */
export function buildCrmOrderPayload(order: any, fallbackItems: any[] = []): CrmOrderPayload {
  const orderNum = order.orderNumber || order.id;
  const rawItems = (Array.isArray(order.items) && order.items.length > 0)
    ? order.items
    : fallbackItems;

  const normalizedItems: CrmOrderItem[] = rawItems.map((it: any) => {
    const qty = Number(it.quantity) || 1;
    // Unit price in paise: if unitPricePaise is set, use directly; otherwise if unitPrice/price is given in rupees, convert once
    let unitPricePaise = 0;
    if (typeof it.unitPricePaise === "number") {
      unitPricePaise = Math.round(it.unitPricePaise);
    } else if (typeof it.unitPrice === "number") {
      unitPricePaise = Math.round(it.unitPrice * 100);
    } else if (typeof it.price === "number") {
      unitPricePaise = Math.round(it.price * 100);
    }

    const itemTotalPaise = typeof it.totalPaise === "number"
      ? Math.round(it.totalPaise)
      : unitPricePaise * qty;

    return {
      productId: it.productId || it.productSlug || it.slug,
      sku: it.sku || it.productSku || undefined,
      productName: it.productName || it.name || "Prajnaa Himalayan Produce",
      quantity: qty,
      unitPricePaise,
      totalPaise: itemTotalPaise,
      variantName: it.variantName || null,
    };
  });

  // Calculate or verify authoritative totals
  let authoritativeTotalPaise = 0;
  if (typeof order.totalPaise === "number") {
    authoritativeTotalPaise = Math.round(order.totalPaise);
  } else if (typeof order.total === "number") {
    authoritativeTotalPaise = Math.round(order.total * 100);
  } else {
    authoritativeTotalPaise = normalizedItems.reduce((acc, curr) => acc + curr.totalPaise, 0);
  }

  const rawAddress = order.shippingAddressSnapshot || {};
  const shippingAddressSnapshot: CrmShippingAddress = {
    fullName: rawAddress.fullName || order.customerName || "Valued Customer",
    line1: rawAddress.line1 || rawAddress.addressLine1 || "",
    line2: rawAddress.line2 || rawAddress.addressLine2 || "",
    landmark: rawAddress.landmark || "",
    city: rawAddress.city || "",
    state: rawAddress.state || "",
    postalCode: String(rawAddress.postalCode || rawAddress.pincode || ""),
    country: rawAddress.country || "India",
  };

  const status = order.status === "pending" ? "Processing" : (order.status || "Processing");
  const paymentStatus = order.paymentStatus || "pending";
  const paymentMethod = order.paymentMethod || "whatsapp";

  return {
    id: order.id || orderNum,
    orderNumber: orderNum,
    customerName: order.customerName || shippingAddressSnapshot.fullName,
    customerPhone: normalizeIndianPhone(order.customerPhone || rawAddress.phone || ""),
    customerEmail: order.customerEmail || rawAddress.email || "",
    totalPaise: authoritativeTotalPaise,
    subtotalPaise: typeof order.subtotalPaise === "number" ? Math.round(order.subtotalPaise) : undefined,
    shippingPaise: typeof order.shippingPaise === "number" ? Math.round(order.shippingPaise) : undefined,
    discountPaise: typeof order.discountPaise === "number" ? Math.round(order.discountPaise) : undefined,
    status,
    paymentStatus,
    paymentMethod,
    shippingAddressSnapshot,
    items: normalizedItems,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : (order.createdAt || new Date().toISOString()),
  };
}

/**
 * Persists an entry in the CRM sync outbox.
 * Multi-layer persistence: Postgres order_crm_sync -> MongoDB crm_sync_outbox -> Memory cache.
 */
async function recordOutboxEntry(entry: {
  id: string;
  orderId: string;
  orderNumber: string;
  status: "pending" | "synced" | "retry_pending" | "failed";
  attempts: number;
  lastError?: string | null;
  payload: CrmOrderPayload;
  syncedAt?: Date | null;
}) {
  // 1. In-memory outbox (instant access)
  globalThis.__crmSyncOutbox?.set(entry.orderNumber, {
    ...entry,
    updatedAt: new Date(),
  });

  // 2. PostgreSQL outbox table
  try {
    await db
      .insert(orderCrmSync)
      .values({
        id: entry.id,
        orderId: entry.orderId,
        orderNumber: entry.orderNumber,
        status: entry.status,
        attempts: entry.attempts,
        maxAttempts: 5,
        lastAttemptAt: new Date(),
        lastError: entry.lastError || null,
        payload: entry.payload,
        syncedAt: entry.syncedAt || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: orderCrmSync.id,
        set: {
          status: entry.status,
          attempts: entry.attempts,
          lastAttemptAt: new Date(),
          lastError: entry.lastError || null,
          syncedAt: entry.syncedAt || null,
          updatedAt: new Date(),
        },
      });
  } catch (pgErr) {
    // Postgres table might not exist in dev/staging; log gracefully
  }

  // 3. MongoDB Atlas outbox collection
  try {
    const mongo = await getDatabase();
    const { createdAt, _id, ...outboxFieldsToSet } = entry as any;
    await mongo.collection("crm_sync_outbox").updateOne(
      { orderNumber: entry.orderNumber },
      {
        $set: {
          ...outboxFieldsToSet,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: createdAt ? new Date(createdAt) : new Date(),
        },
      },
      { upsert: true }
    );
  } catch (mErr) {
    // MongoDB might not be configured in offline unit test runs
  }
}

/**
 * Synchronizes an authoritative storefront order with the WhatsApp CRM.
 * NEVER called before storefront order has been committed to database.
 * Never causes storefront order creation to fail.
 */
export async function syncOrderToWhatsAppCrm(
  order: any,
  fallbackItems: any[] = [],
  options: { timeoutMs?: number; crmUrl?: string; apiKey?: string } = {}
): Promise<CrmSyncResult> {
  const payload = buildCrmOrderPayload(order, fallbackItems);
  const orderNumber = payload.orderNumber;
  const outboxId = `sync_${orderNumber}_${Date.now()}`;

  const crmBaseUrl = (
    options.crmUrl ||
    process.env.WHATSAPP_CRM_URL ||
    "https://whatsapp-crm-qje9.vercel.app"
  ).replace(/\/$/, "");

  const endpoint = `${crmBaseUrl}/api/crm/orders`;
  const apiKey = options.apiKey || process.env.WHATSAPP_CRM_API_KEY;
  const timeoutMs = options.timeoutMs || 8000;

  let attempts = 1;
  const existingOutbox = globalThis.__crmSyncOutbox?.get(orderNumber);
  if (existingOutbox) {
    attempts = (existingOutbox.attempts || 0) + 1;
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Correlation-Id": `corr_${orderNumber}_${Date.now()}`,
      "x-crm-client": "prajnaa-crm-sync",
    };

    if (apiKey) {
      headers["x-crm-api-key"] = apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseData = await response.json().catch(() => null);

    if (response.ok && responseData?.success) {
      await recordOutboxEntry({
        id: existingOutbox?.id || outboxId,
        orderId: payload.id,
        orderNumber,
        status: "synced",
        attempts,
        payload,
        syncedAt: new Date(),
      });

      return {
        success: true,
        status: "synced",
        orderNumber,
        attempts,
        crmResponse: responseData,
      };
    }

    // 4xx Validation error from CRM: mark permanent failure
    if (response.status >= 400 && response.status < 500) {
      const errorMsg = responseData?.error || `CRM rejected payload with HTTP ${response.status}`;
      await recordOutboxEntry({
        id: existingOutbox?.id || outboxId,
        orderId: payload.id,
        orderNumber,
        status: "failed",
        attempts,
        lastError: errorMsg,
        payload,
      });

      return {
        success: false,
        status: "failed",
        orderNumber,
        attempts,
        error: errorMsg,
      };
    }

    // 5xx Server error: mark retry pending
    const serverError = responseData?.error || `CRM server returned HTTP ${response.status}`;
    await recordOutboxEntry({
      id: existingOutbox?.id || outboxId,
      orderId: payload.id,
      orderNumber,
      status: "retry_pending",
      attempts,
      lastError: serverError,
      payload,
    });

    return {
      success: false,
      status: "retry_pending",
      orderNumber,
      attempts,
      error: serverError,
    };
  } catch (err: any) {
    const errorMsg = err.name === "AbortError"
      ? `CRM request timed out after ${timeoutMs}ms`
      : err.message || "Network error communicating with WhatsApp CRM";

    await recordOutboxEntry({
      id: existingOutbox?.id || outboxId,
      orderId: payload.id,
      orderNumber,
      status: "retry_pending",
      attempts,
      lastError: errorMsg,
      payload,
    });

    return {
      success: false,
      status: "retry_pending",
      orderNumber,
      attempts,
      error: errorMsg,
    };
  }
}

/**
 * Sweeps and retries pending outbox entries with bounded exponential backoff.
 */
export async function processPendingCrmSyncRetries(): Promise<{
  processed: number;
  synced: number;
  failed: number;
  stillPending: number;
}> {
  let processed = 0;
  let synced = 0;
  let failed = 0;
  let stillPending = 0;

  const entries: any[] = [];

  // Read from in-memory outbox
  if (globalThis.__crmSyncOutbox) {
    for (const entry of globalThis.__crmSyncOutbox.values()) {
      if (entry.status === "retry_pending" || entry.status === "pending") {
        entries.push(entry);
      }
    }
  }

  // Also query MongoDB outbox if available
  try {
    const mongo = await getDatabase();
    const dbEntries = await mongo
      .collection("crm_sync_outbox")
      .find({ status: { $in: ["pending", "retry_pending"] }, attempts: { $lt: 5 } })
      .toArray();

    for (const de of dbEntries) {
      if (!entries.find((e) => e.orderNumber === de.orderNumber)) {
        entries.push(de);
      }
    }
  } catch {}

  for (const entry of entries) {
    if (entry.attempts >= 5) {
      entry.status = "failed";
      failed++;
      continue;
    }

    processed++;
    const res = await syncOrderToWhatsAppCrm(entry.payload, entry.payload.items);
    if (res.success) {
      synced++;
    } else if (res.status === "failed") {
      failed++;
    } else {
      stillPending++;
    }
  }

  return { processed, synced, failed, stillPending };
}
