import fs from "fs";
import path from "path";

// Dedicated directory for persistent local store that survives restarts and multi-device access
const DATA_DIR = path.join(process.cwd(), "data", "crm_store");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const DELETED_FILE = path.join(DATA_DIR, "deleted.json");
const TEAM_FILE = path.join(DATA_DIR, "team.json");
const CUSTOMERS_META_FILE = path.join(DATA_DIR, "customers_meta.json");

function ensureDirectoryExists() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error("[CRM Store] Failed to create data directory:", err);
  }
}

function safeReadJSON<T>(filePath: string, fallback: T): T {
  try {
    ensureDirectoryExists();
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const content = fs.readFileSync(filePath, "utf-8").trim();
    if (!content) return fallback;
    return JSON.parse(content) as T;
  } catch (err) {
    console.warn(`[CRM Store] Error reading ${path.basename(filePath)}:`, err);
    return fallback;
  }
}

function safeWriteJSON(filePath: string, data: any) {
  try {
    ensureDirectoryExists();
    const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try {
      // Fallback direct write if atomic rename fails on certain Windows file locks
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (writeErr) {
      console.error(`[CRM Store] Failed to write ${path.basename(filePath)}:`, writeErr);
    }
  }
}

// In-memory singletons to keep memory and disk in perfect lock-step
declare global {
  // eslint-disable-next-line no-var
  var __globalWhatsAppFeed: any[] | undefined;
  // eslint-disable-next-line no-var
  var __globalCrmOrders: any[] | undefined;
  // eslint-disable-next-line no-var
  var __globalCrmDeleted: { phones: string[]; customerIds: string[] } | undefined;
  // eslint-disable-next-line no-var
  var __globalCrmTeam: any[] | undefined;
  // eslint-disable-next-line no-var
  var __globalCrmCustomerMeta: Record<string, any> | undefined;
}

// Initialize In-Memory & Disk Store on module load
export function initStore() {
  ensureDirectoryExists();

  if (!globalThis.__globalCrmDeleted) {
    globalThis.__globalCrmDeleted = safeReadJSON(DELETED_FILE, { phones: [], customerIds: [] });
  }

  if (!globalThis.__globalWhatsAppFeed) {
    const diskMsgs = safeReadJSON<any[]>(MESSAGES_FILE, []);
    globalThis.__globalWhatsAppFeed = Array.isArray(diskMsgs) ? diskMsgs : [];
  }

  if (!globalThis.__globalCrmOrders) {
    const diskOrders = safeReadJSON<any[]>(ORDERS_FILE, []);
    globalThis.__globalCrmOrders = Array.isArray(diskOrders) ? diskOrders : [];
  }

  if (!globalThis.__globalCrmTeam) {
    const diskTeam = safeReadJSON<any[]>(TEAM_FILE, []);
    globalThis.__globalCrmTeam = Array.isArray(diskTeam) && diskTeam.length > 0 ? diskTeam : null as any;
  }

  if (!globalThis.__globalCrmCustomerMeta) {
    globalThis.__globalCrmCustomerMeta = safeReadJSON(CUSTOMERS_META_FILE, {});
  }
}

// Trigger initialization
initStore();

/* ========================================================================== */
/*                               DELETED STORE                                */
/* ========================================================================== */

export function getDeletedContacts(): { phones: string[]; customerIds: string[] } {
  if (!globalThis.__globalCrmDeleted) {
    globalThis.__globalCrmDeleted = safeReadJSON(DELETED_FILE, { phones: [], customerIds: [] });
  }
  return {
    phones: [...(globalThis.__globalCrmDeleted.phones || [])],
    customerIds: [...(globalThis.__globalCrmDeleted.customerIds || [])],
  };
}

export function isContactDeleted(phone?: string | null, customerId?: string | null): boolean {
  const deleted = getDeletedContacts();
  const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);

  if (cleanPhone && deleted.phones.some((p) => p.replace(/\D/g, "").slice(-10) === cleanPhone)) {
    return true;
  }
  if (customerId && deleted.customerIds.includes(customerId)) {
    return true;
  }
  return false;
}

export function recordDeletedContact(phone?: string | null, customerId?: string | null) {
  const current = getDeletedContacts();
  let modified = false;

  const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);
  if (cleanPhone && !current.phones.includes(cleanPhone)) {
    current.phones.push(cleanPhone);
    modified = true;
  }
  if (customerId && !current.customerIds.includes(customerId)) {
    current.customerIds.push(customerId);
    modified = true;
  }

  if (modified) {
    globalThis.__globalCrmDeleted = current;
    safeWriteJSON(DELETED_FILE, current);

    // Also purge matching messages from in-memory and disk
    purgeDeletedMessages(cleanPhone, customerId);
  }
}

export function resurrectContact(phone?: string | null, customerId?: string | null) {
  const current = getDeletedContacts();
  const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);
  let modified = false;

  if (cleanPhone && current.phones.includes(cleanPhone)) {
    current.phones = current.phones.filter((p) => p !== cleanPhone);
    modified = true;
  }
  if (customerId && current.customerIds.includes(customerId)) {
    current.customerIds = current.customerIds.filter((id) => id !== customerId);
    modified = true;
  }

  if (modified) {
    globalThis.__globalCrmDeleted = current;
    safeWriteJSON(DELETED_FILE, current);
  }
}

function purgeDeletedMessages(cleanPhone?: string | null, customerId?: string | null) {
  if (!globalThis.__globalWhatsAppFeed) return;

  globalThis.__globalWhatsAppFeed = globalThis.__globalWhatsAppFeed.filter((m: any) => {
    const mFrom = (m.from || "").replace(/\D/g, "").slice(-10);
    const mTo = (m.to || "").replace(/\D/g, "").slice(-10);
    const matchPhone = cleanPhone && (mFrom === cleanPhone || mTo === cleanPhone);
    const matchCustId = customerId && m.customerId === customerId;
    return !matchPhone && !matchCustId;
  });

  safeWriteJSON(MESSAGES_FILE, globalThis.__globalWhatsAppFeed);

  // Also purge inquiry-only orders for deleted contact
  if (globalThis.__globalCrmOrders && cleanPhone) {
    globalThis.__globalCrmOrders = globalThis.__globalCrmOrders.filter((o: any) => {
      const oPhone = (o.customerPhone || "").replace(/\D/g, "").slice(-10);
      const isMatch = oPhone === cleanPhone;
      const isInquiry = !o.items?.length || o.totalPaise === 0 || /inq/i.test(o.id || "") || /inquiry/i.test(o.orderNumber || "");
      return !(isMatch && isInquiry);
    });
    safeWriteJSON(ORDERS_FILE, globalThis.__globalCrmOrders);
  }
}

/* ========================================================================== */
/*                              MESSAGES STORE                                */
/* ========================================================================== */

export function getStoredMessages(): any[] {
  if (globalThis.__globalWhatsAppFeed === undefined) {
    const diskMsgs = safeReadJSON<any[]>(MESSAGES_FILE, []);
    globalThis.__globalWhatsAppFeed = Array.isArray(diskMsgs) ? diskMsgs : [];
  }

  const deleted = getDeletedContacts();
  const deletedPhoneSet = new Set(deleted.phones.map((p) => p.replace(/\D/g, "").slice(-10)));
  const deletedCustIdSet = new Set(deleted.customerIds);

  return globalThis.__globalWhatsAppFeed.filter((m: any) => {
    if (!m) return false;
    const mFrom = (m.from || "").replace(/\D/g, "").slice(-10);
    const mTo = (m.to || "").replace(/\D/g, "").slice(-10);
    if (mFrom && deletedPhoneSet.has(mFrom)) return false;
    if (mTo && deletedPhoneSet.has(mTo)) return false;
    if (m.customerId && deletedCustIdSet.has(m.customerId)) return false;
    return true;
  });
}

let lastStoreUpdateTimestamp = Date.now();

export function getStoreUpdateTimestamp(): number {
  return lastStoreUpdateTimestamp;
}

export function notifyStoreUpdated() {
  lastStoreUpdateTimestamp = Date.now();
}

export function saveStoredMessage(msg: any) {
  if (!msg) return;
  notifyStoreUpdated();
  if (!globalThis.__globalWhatsAppFeed) {
    globalThis.__globalWhatsAppFeed = [];
  }

  // Ensure contact is resurrected if new message arrives
  const mFrom = (msg.from || "").replace(/\D/g, "").slice(-10);
  const mTo = (msg.to || "").replace(/\D/g, "").slice(-10);
  const phone = msg.direction === "inbound" || msg.sender === "customer" ? mFrom : mTo;
  if (phone) {
    resurrectContact(phone, msg.customerId);
  }

  // Deduplicate before unshifting
  const existingIdx = globalThis.__globalWhatsAppFeed.findIndex((existing: any) => {
    if (existing.id && msg.id && existing.id === msg.id) return true;
    const eFrom = (existing.from || "").replace(/\D/g, "").slice(-10);
    const eTo = (existing.to || "").replace(/\D/g, "").slice(-10);
    const eText = (existing.text || "").trim();
    const mText = (msg.text || "").trim();
    const eTime = Math.floor(new Date(existing.timestamp || existing.createdAt || 0).getTime() / 4000);
    const mTime = Math.floor(new Date(msg.timestamp || msg.createdAt || 0).getTime() / 4000);
    return eFrom === mFrom && eTo === mTo && eText === mText && eTime === mTime;
  });

  if (existingIdx >= 0) {
    globalThis.__globalWhatsAppFeed[existingIdx] = {
      ...globalThis.__globalWhatsAppFeed[existingIdx],
      ...msg,
    };
  } else {
    globalThis.__globalWhatsAppFeed.unshift(msg);
  }

  // Keep up to 300 messages persisted locally
  if (globalThis.__globalWhatsAppFeed.length > 300) {
    globalThis.__globalWhatsAppFeed.length = 300;
  }

  safeWriteJSON(MESSAGES_FILE, globalThis.__globalWhatsAppFeed);
}

/* ========================================================================== */
/*                                ORDERS STORE                                */
/* ========================================================================== */

export function getStoredOrders(): any[] {
  if (globalThis.__globalCrmOrders === undefined) {
    const diskOrders = safeReadJSON<any[]>(ORDERS_FILE, []);
    globalThis.__globalCrmOrders = Array.isArray(diskOrders) ? diskOrders : [];
  }
  return [...globalThis.__globalCrmOrders];
}

export function saveStoredOrder(order: any) {
  if (!order) return;
  const orderNum = (order.orderNumber || order.id || "").toString().trim();
  if (!orderNum) return;

  if (!globalThis.__globalCrmOrders) {
    globalThis.__globalCrmOrders = [];
  }

  const existingIdx = globalThis.__globalCrmOrders.findIndex(
    (o) => o.orderNumber === orderNum || o.id === orderNum
  );

  const normalizedOrder = {
    ...(existingIdx >= 0 ? globalThis.__globalCrmOrders[existingIdx] : {}),
    ...order,
    id: orderNum,
    orderNumber: orderNum,
    updatedAt: new Date().toISOString(),
  };

  if (!normalizedOrder.createdAt) {
    normalizedOrder.createdAt = new Date().toISOString();
  }

  if (existingIdx >= 0) {
    globalThis.__globalCrmOrders[existingIdx] = normalizedOrder;
  } else {
    globalThis.__globalCrmOrders.unshift(normalizedOrder);
  }

  // Cap at 300 orders
  if (globalThis.__globalCrmOrders.length > 300) {
    globalThis.__globalCrmOrders.length = 300;
  }

  safeWriteJSON(ORDERS_FILE, globalThis.__globalCrmOrders);
  return normalizedOrder;
}

/* ========================================================================== */
/*                                 TEAM STORE                                 */
/* ========================================================================== */

export function getStoredTeam(fallbackTeam: any[] = []): any[] {
  if (globalThis.__globalCrmTeam && Array.isArray(globalThis.__globalCrmTeam) && globalThis.__globalCrmTeam.length > 0) {
    return globalThis.__globalCrmTeam;
  }

  const diskTeam = safeReadJSON<any[]>(TEAM_FILE, []);
  if (Array.isArray(diskTeam) && diskTeam.length > 0) {
    globalThis.__globalCrmTeam = diskTeam;
    return diskTeam;
  }

  if (Array.isArray(fallbackTeam) && fallbackTeam.length > 0) {
    globalThis.__globalCrmTeam = fallbackTeam;
    safeWriteJSON(TEAM_FILE, fallbackTeam);
    return fallbackTeam;
  }

  return [];
}

export function saveStoredTeam(team: any[]) {
  if (!Array.isArray(team)) return;
  globalThis.__globalCrmTeam = team;
  safeWriteJSON(TEAM_FILE, team);
}

/* ========================================================================== */
/*                           CUSTOMER METADATA STORE                          */
/* ========================================================================== */

export function getStoredCustomerMeta(): Record<string, any> {
  if (!globalThis.__globalCrmCustomerMeta) {
    globalThis.__globalCrmCustomerMeta = safeReadJSON(CUSTOMERS_META_FILE, {});
  }
  return { ...(globalThis.__globalCrmCustomerMeta || {}) };
}

export function saveStoredCustomerMeta(idOrPhone: string, meta: Record<string, any>) {
  if (!idOrPhone) return;
  const current = getStoredCustomerMeta();
  const existing = current[idOrPhone] || {};
  current[idOrPhone] = { ...existing, ...meta, updatedAt: new Date().toISOString() };
  globalThis.__globalCrmCustomerMeta = current;
  safeWriteJSON(CUSTOMERS_META_FILE, current);
}
