import { supabase } from "@/integrations/supabase/client";
import { broadcastProductUpdate } from "./productSyncService";
import { formatStock } from "@/lib/weight-utils";
import { allProducts } from "@/lib/mock/products";

export { formatStock };

export const INVENTORY_STORAGE_KEY = "prajnaa_product_inventory";
export const INVENTORY_HISTORY_KEY = "prajnaa_stock_history";
export const INVENTORY_MOVEMENTS_KEY = "prajnaa_stock_movements";
export const INVENTORY_SYNC_CHANNEL = "prajnaa_inventory_sync";

export type AvailabilityStatus = "in_stock" | "low_stock" | "preorder" | "out_of_stock";

export interface AvailabilityResult {
  status: AvailabilityStatus;
  label: "In stock" | "Low stock" | "Pre-order" | "Out of stock";
  badgeClass: string;
  dotClass: string;
  isPurchasable: boolean;
  isPreorder: boolean;
  allowsOrders: boolean;
  availableStock: number; // in grams
}

export interface StockMovement {
  id: string;
  productId: string;
  product_id?: string;
  productName?: string;
  product_name?: string;
  type: "add" | "remove" | "set" | "sale" | "refund";
  grams: number;
  stockBefore: number;
  stock_before?: number;
  stockAfter: number;
  stock_after?: number;
  reason: string;
  note?: string | null;
  adminId?: string | null;
  admin_id?: string | null;
  orderId?: string | null;
  order_id?: string | null;
  createdAt: string;
  created_at?: string;
  user_email?: string | null;
}

export interface InventoryRecord {
  id: string;
  product_id: string;
  variant_id: string;
  variant_name: string;
  stock_grams: number;
  price_per_kg?: number;
  low_stock_threshold_grams: number;
  quantity: number; // in kg (stock_grams / 1000) for backward compatibility
  sold_count: number;
  pledged_count: number;
  low_stock_threshold: number;
  preorder_enabled: boolean;
  created_at: string;
  updated_at: string;
  updated_by?: string;
  // Joined display attributes
  product_name?: string;
  product_slug?: string;
  product_image?: string;
  category?: string;
  farmer_id?: string;
  farmer_name?: string;
  price?: number;
  status?: string;
}


export type StockChangeReason =
  | "new_product"
  | "restock"
  | "manual_correction"
  | "sale"
  | "order_cancelled"
  | "refund_return"
  | "preorder_fulfilled"
  | "pledge_converted";

export interface StockHistoryEntry {
  id: string;
  product_id: string;
  variant_id: string;
  product_name?: string;
  variant_name?: string;
  change_amount: number;
  quantity_before: number;
  quantity_after: number;
  reason: StockChangeReason | string;
  reference_id?: string | null;
  user_email?: string | null;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  status: string;
  hsn_code?: string | null;
  images?: string[];
  low_stock_threshold?: number;
  updated_at?: string;
}

export interface InventoryAuditLog {
  id: string;
  farmer_id?: string;
  product_id: string;
  product_name: string;
  old_stock: number;
  new_stock: number;
  change_amount: number;
  reason: string;
  reference_id?: string | null;
  created_at: string;
}

export interface LowStockItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  image?: string;
  category: string;
  low_stock_threshold?: number;
}

export interface ListingsSummary {
  totalListings: number;
  published: number;
  publishedPct: number;
  drafted: number;
  draftedPct: number;
  outOfStock: number;
  outOfStockPct: number;
  activeListings?: number;
  lowStockCount?: number;
  outOfStockCount?: number;
}

/**
 * DERIVED AVAILABILITY - ONE SINGLE SOURCE OF TRUTH
 * Availability is strictly calculated from stock_grams, low_stock_threshold_grams, and preorder_enabled.
 * It is NEVER stored or set manually.
 */
export function getAvailability(inv: {
  stock_grams?: number;
  quantity?: number;
  low_stock_threshold_grams?: number;
  low_stock_threshold?: number;
  preorder_enabled?: boolean;
}): AvailabilityResult {
  const grams =
    inv.stock_grams !== undefined
      ? Math.max(0, Number(inv.stock_grams ?? 0))
      : Math.max(0, Math.round(Number(inv.quantity ?? 0) * 1000));
  const thresholdGrams =
    inv.low_stock_threshold_grams !== undefined
      ? Math.max(0, Number(inv.low_stock_threshold_grams ?? 1000))
      : Math.max(0, Math.round(Number(inv.low_stock_threshold ?? 1) * 1000));
  const preorder = Boolean(inv.preorder_enabled);

  if (grams > thresholdGrams) {
    return {
      status: "in_stock",
      label: "In stock",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      dotClass: "bg-emerald-500",
      isPurchasable: true,
      isPreorder: false,
      allowsOrders: true,
      availableStock: grams,
    };
  }

  if (grams > 0 && grams <= thresholdGrams) {
    return {
      status: "low_stock",
      label: "Low stock",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      dotClass: "bg-amber-500",
      isPurchasable: true,
      isPreorder: false,
      allowsOrders: true,
      availableStock: grams,
    };
  }

  if (grams === 0 && preorder) {
    return {
      status: "preorder",
      label: "Pre-order",
      badgeClass: "bg-amber-500/15 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      dotClass: "bg-[#E8A317]",
      isPurchasable: true,
      isPreorder: true,
      allowsOrders: true,
      availableStock: 0,
    };
  }

  // grams === 0 and preorder === false -> Out of stock
  return {
    status: "out_of_stock",
    label: "Out of stock",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    dotClass: "bg-rose-500",
    isPurchasable: false,
    isPreorder: false,
    allowsOrders: false,
    availableStock: 0,
  };
}

/**
 * Cross-tab & reactive dispatch helper
 */
export function broadcastInventoryUpdate(detail: any): void {
  if (typeof window === "undefined") return;

  if (typeof BroadcastChannel !== "undefined") {
    try {
      const bc = new BroadcastChannel(INVENTORY_SYNC_CHANNEL);
      bc.postMessage(detail);
      setTimeout(() => {
        try {
          bc.close();
        } catch {}
      }, 500);
    } catch {}
  }

  try {
    window.dispatchEvent(new CustomEvent("prajnaa_inventory_updated", { detail }));
  } catch {}
}

/**
 * Listen for inventory mutations across tabs
 */
export function subscribeToInventoryUpdates(onUpdate: (detail?: any) => void): () => void {
  if (typeof window === "undefined") return () => {};

  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      bc = new BroadcastChannel(INVENTORY_SYNC_CHANNEL);
      bc.onmessage = (evt) => {
        onUpdate(evt.data);
      };
    } catch {}
  }

  const handleCustomEvent = (evt: any) => {
    onUpdate(evt.detail);
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === INVENTORY_STORAGE_KEY || e.key === INVENTORY_HISTORY_KEY) {
      onUpdate();
    }
  };

  window.addEventListener("prajnaa_inventory_updated", handleCustomEvent);
  window.addEventListener("storage", handleStorage);

  return () => {
    if (bc) {
      try {
        bc.close();
      } catch {}
    }
    window.removeEventListener("prajnaa_inventory_updated", handleCustomEvent);
    window.removeEventListener("storage", handleStorage);
  };
}

// Sanitization and auto-repair helper for persisted inventory records
export function sanitizeInventoryRecords(rawList: any[]): InventoryRecord[] {
  if (!Array.isArray(rawList)) return [];

  const seenIds = new Set<string>();
  const seenProductIds = new Set<string>();
  const sanitized: InventoryRecord[] = [];

  for (let i = 0; i < rawList.length; i++) {
    const r = rawList[i];
    if (!r || typeof r !== "object") continue;

    // Clean product_slug
    let slug = typeof r.product_slug === "string" ? r.product_slug.trim() : "";
    if (slug === "undefined" || slug === "null") slug = "";

    // Clean product_name
    let name = typeof r.product_name === "string" ? r.product_name.trim() : "";
    if (!name && slug) name = slug.replace(/-/g, " ");

    // Clean product_id
    let pid = typeof r.product_id === "string" ? r.product_id.trim() : "";
    if (!pid || pid === "undefined" || pid === "null") {
      pid = slug || (name ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `prod_${i}_${Date.now()}`);
    }

    // Clean inventory record id
    let id = typeof r.id === "string" ? r.id.trim() : "";
    if (!id || id === "undefined" || id === "null" || id === "inv_" || id === "inv_undefined") {
      id = `inv_${pid}`;
    }

    // Disambiguate duplicate/corrupted records from previous bugs
    if (seenIds.has(id) || seenProductIds.has(pid)) {
      const uniqueSuffix = `_${i}_${Math.random().toString(36).slice(2, 6)}`;
      pid = `${pid}${uniqueSuffix}`;
      id = `inv_${pid}`;
    }

    seenIds.add(id);
    seenProductIds.add(pid);

    const stockGrams =
      typeof r.stock_grams === "number" && !isNaN(r.stock_grams)
        ? Math.max(0, r.stock_grams)
        : typeof r.quantity === "number" && !isNaN(r.quantity)
        ? Math.max(0, Math.round(r.quantity * 1000))
        : 0;

    const thresholdGrams =
      typeof r.low_stock_threshold_grams === "number" && !isNaN(r.low_stock_threshold_grams)
        ? Math.max(0, r.low_stock_threshold_grams)
        : typeof r.low_stock_threshold === "number" && !isNaN(r.low_stock_threshold)
        ? Math.max(0, Math.round(r.low_stock_threshold * 1000))
        : 1000;

    sanitized.push({
      ...r,
      id,
      product_id: pid,
      product_slug: slug || pid,
      product_name: name || "Produce Item",
      stock_grams: stockGrams,
      quantity: Math.floor(stockGrams / 1000),
      low_stock_threshold_grams: thresholdGrams,
      low_stock_threshold: Math.floor(thresholdGrams / 1000),
      preorder_enabled: Boolean(r.preorder_enabled),
      updated_at: r.updated_at || new Date().toISOString(),
    });
  }

  return sanitized;
}

// Local persistence fallbacks for seamless dev, offline & instant UI hydration
export function getStoredInventory(): InventoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INVENTORY_STORAGE_KEY) || localStorage.getItem("prajnaa_inventory");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const cleaned = sanitizeInventoryRecords(parsed);
    // Write back auto-healed records if corrupted entries were repaired
    if (JSON.stringify(cleaned) !== raw) {
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function saveStoredInventory(records: InventoryRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    const cleaned = sanitizeInventoryRecords(records);
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(cleaned));
  } catch {}
}

async function safeUpdateFarmerProduct(identifier: string, data: Record<string, any>) {
  if (!identifier) return;
  const cleanId = String(identifier).trim();
  if (!cleanId || cleanId === "undefined" || cleanId === "null") return;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
  try {
    if (isUuid) {
      await supabase.from("farmer_products").update(data).eq("id", cleanId);
    } else {
      await supabase.from("farmer_products").update(data).eq("slug", cleanId);
    }
  } catch (err) {
    console.warn("[inventoryService] safeUpdateFarmerProduct error:", err);
  }
}

function syncProductLocalStorage(identifier: string, updates: Record<string, any>) {
  if (typeof window === "undefined" || !identifier) return;
  const cleanId = String(identifier).trim().toLowerCase();
  if (!cleanId || cleanId === "undefined" || cleanId === "null") return;

  try {
    const raw = localStorage.getItem("prajnaa_custom_products");
    if (!raw) return;
    const prods = JSON.parse(raw);
    if (!Array.isArray(prods)) return;

    let changed = false;
    const updated = prods.map((p: any) => {
      const pId = String(p.id || "").trim().toLowerCase();
      const pSlug = String(p.slug || "").trim().toLowerCase();
      const isMatch = Boolean(cleanId && (pId === cleanId || pSlug === cleanId));
      if (isMatch) {
        changed = true;
        return { ...p, ...updates, updated_at: new Date().toISOString() };
      }
      return p;
    });

    if (changed) {
      localStorage.setItem("prajnaa_custom_products", JSON.stringify(updated));
      localStorage.setItem("prajnaa_products_last_sync", Date.now().toString());
    }
  } catch {}
}

function getStoredHistory(): StockHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INVENTORY_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function appendStoredHistory(entry: StockHistoryEntry): void {
  if (typeof window === "undefined") return;
  try {
    const history = getStoredHistory();
    localStorage.setItem(INVENTORY_HISTORY_KEY, JSON.stringify([entry, ...history.slice(0, 499)]));
  } catch {}
}

export const inventoryService = {
  /**
   * Pure availability calculator
   */
  getAvailability,

  /**
   * Fetch live inventory items with joined product metadata
   */
  async getAllInventory(filters?: {
    search?: string;
    statusFilter?: "all" | "low_stock" | "preorder" | "out_of_stock";
    category?: string;
    farmerId?: string;
  }): Promise<InventoryRecord[]> {
    let records: InventoryRecord[] = [];

    // 1. Try querying /api/inventory behind DATA_PROVIDER (Neon / Supabase)
    try {
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          records = json.data;
        }
      }
    } catch (err) {
      console.warn("[inventoryService] API fetch note:", err);
    }

    // 2. Fallback to querying Supabase product_inventory if API not reached
    if (records.length === 0) {
      try {
        const { data, error } = await supabase
          .from("product_inventory")
        .select(`
          id,
          product_id,
          variant_id,
          variant_name,
          quantity,
          stock_grams,
          low_stock_threshold_grams,
          sold_count,
          pledged_count,
          low_stock_threshold,
          preorder_enabled,
          created_at,
          updated_at,
          updated_by
        `)
        .order("updated_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        records = data.map((r: any) => {
          const grams =
            typeof r.stock_grams === "number"
              ? r.stock_grams
              : Math.max(0, Math.round(Number(r.quantity || 0) * 1000));
          const thresholdGrams =
            typeof r.low_stock_threshold_grams === "number"
              ? r.low_stock_threshold_grams
              : Math.max(0, Math.round(Number(r.low_stock_threshold || 1) * 1000));
          return {
            ...r,
            stock_grams: grams,
            low_stock_threshold_grams: thresholdGrams,
            quantity: Math.floor(grams / 1000),
            sold_count: Number(r.sold_count || 0),
            pledged_count: Number(r.pledged_count || 0),
            low_stock_threshold: Math.floor(thresholdGrams / 1000),
            preorder_enabled: Boolean(r.preorder_enabled),
          };
        });
      }
    } catch (e) {
      console.warn("[inventoryService] Supabase fetch fallback to local cache:", e);
    }
    }

    // 2. Merge with local stored inventory to ensure instant local updates & offline products are never lost
    const stored = getStoredInventory();
    if (records.length === 0) {
      records = stored;
    } else if (stored.length > 0) {
      const storedMap = new Map<string, InventoryRecord>();
      stored.forEach((s) => {
        const sPid = String(s.product_id || "").trim();
        const sSlug = String(s.product_slug || "").trim();
        const sId = String(s.id || "").trim();
        if (sPid && sPid !== "undefined") storedMap.set(sPid, s);
        if (sSlug && sSlug !== "undefined") storedMap.set(sSlug, s);
        if (sId && sId !== "undefined" && sId !== "inv_undefined") storedMap.set(sId, s);
      });

      records = records.map((r) => {
        const rPid = String(r.product_id || "").trim();
        const rSlug = String(r.product_slug || "").trim();
        const rId = String(r.id || "").trim();
        const local =
          (rPid && storedMap.get(rPid)) ||
          (rSlug && storedMap.get(rSlug)) ||
          (rId && storedMap.get(rId)) ||
          null;

        if (local && local.updated_at && (!r.updated_at || new Date(local.updated_at) >= new Date(r.updated_at))) {
          return {
            ...r,
            ...local,
            stock_grams: local.stock_grams !== undefined ? local.stock_grams : r.stock_grams,
            quantity: local.quantity !== undefined ? local.quantity : r.quantity,
          };
        }
        return r;
      });

      stored.forEach((s) => {
        const sPid = String(s.product_id || "").trim();
        const sSlug = String(s.product_slug || "").trim();
        const exists = records.some((r) => {
          const rPid = String(r.product_id || "").trim();
          const rSlug = String(r.product_slug || "").trim();
          return (
            Boolean(sPid && rPid && rPid === sPid) ||
            Boolean(sSlug && (rPid === sSlug || rSlug === sSlug))
          );
        });
        if (!exists) records.push(s);
      });
    }

    // 3. Join with all available products (custom + Supabase + mock) to enrich UI metadata
    try {
      const { data: prodData } = await supabase
        .from("farmer_products")
        .select(
          "id, slug, name, category, images, price, price_per_kg, stock_grams, low_stock_threshold_grams, farmer_id, unit, status, farmer_profiles:farmer_id(full_name)"
        );

      // Also merge products from localStorage
      let localProds: any[] = [];
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("prajnaa_custom_products");
          localProds = raw ? JSON.parse(raw) : [];
        } catch {}
      }

      const allProductLookups = new Map<string, any>();
      const registerProd = (p: any) => {
        if (!p) return;
        const pId = p.id ? String(p.id).trim() : "";
        const pSlug = p.slug ? String(p.slug).trim() : "";
        if (pId && pId !== "undefined" && pId !== "null") allProductLookups.set(pId, p);
        if (pSlug && pSlug !== "undefined" && pSlug !== "null") allProductLookups.set(pSlug, p);
      };

      (prodData || []).forEach(registerProd);
      localProds.forEach(registerProd);
      (allProducts || []).forEach((p: any) => {
        const stableId = p.id || `mock_${p.slug || p.sku || "prod"}`;
        registerProd({ ...p, id: stableId });
      });

      // Auto-backfill any products found in product table that are missing an inventory row
      // CRITICAL RULE: Default stock is ALWAYS 0 kg (0 grams)
      allProductLookups.forEach((prod, key) => {
        const prodId = String(prod.id || "").trim();
        const prodSlug = String(prod.slug || "").trim();
        if (!prodId && !prodSlug) return;
        // Avoid duplicate slug registrations
        if (key !== (prodId || prodSlug)) return;

        const hasInventory = records.some((r) => {
          const rPid = String(r.product_id || "").trim();
          const rSlug = String(r.product_slug || "").trim();
          return (
            Boolean(prodId && rPid && rPid === prodId) ||
            Boolean(prodSlug && (rPid === prodSlug || rSlug === prodSlug))
          );
        });

        if (!hasInventory) {
          const effectiveId = prodId || prodSlug;
          const isPre = Boolean(prod.is_preorder || prod.preOrder?.enabled);
          const initialGrams =
            typeof prod.stock_grams === "number"
              ? Math.max(0, prod.stock_grams)
              : typeof prod.stock === "number" && prod.stock > 0
              ? prod.stock * 1000
              : 0;
          const initialThresholdGrams =
            typeof prod.low_stock_threshold_grams === "number"
              ? prod.low_stock_threshold_grams
              : 1000;
          const pricePerKg =
            typeof prod.price_per_kg === "number"
              ? prod.price_per_kg
              : Number(prod.price || 0);

          const newRec: InventoryRecord = {
            id: "inv_" + effectiveId,
            product_id: effectiveId,
            variant_id: prod.unit || prod.weight || "default",
            variant_name: prod.unit || prod.weight || "Standard Pack",
            stock_grams: initialGrams,
            price_per_kg: pricePerKg,
            low_stock_threshold_grams: initialThresholdGrams,
            quantity: Math.floor(initialGrams / 1000),
            sold_count: 0,
            pledged_count: isPre ? 5 : 0,
            low_stock_threshold: Math.floor(initialThresholdGrams / 1000),
            preorder_enabled: isPre,
            created_at: prod.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updated_by: "system_backfill",
            product_name: prod.name,
            product_slug: prodSlug || effectiveId,
            product_image: Array.isArray(prod.images) ? prod.images[0] : prod.image,
            category: prod.category,
            farmer_id: prod.farmer_id || prod.farmerSlug,
            farmer_name: prod.farmer_profiles?.full_name || prod.farmerName || "Local Farmer",
            price: Number(prod.price || 0),
            status: prod.status || "published",
          };
          records.push(newRec);
        }
      });

      // Enrich records with product names, images, farmer details strictly by ID/slug
      records = records.map((rec) => {
        const rPid = String(rec.product_id || "").trim();
        const rSlug = String(rec.product_slug || "").trim();
        const prod =
          (rPid && allProductLookups.get(rPid)) ||
          (rSlug && allProductLookups.get(rSlug)) ||
          null;

        const currentGrams =
          rec.stock_grams !== undefined
            ? rec.stock_grams
            : typeof prod?.stock_grams === "number"
            ? prod.stock_grams
            : Math.max(0, Math.round(Number(rec.quantity || 0) * 1000));
        const thresholdGrams =
          rec.low_stock_threshold_grams !== undefined
            ? rec.low_stock_threshold_grams
            : typeof prod?.low_stock_threshold_grams === "number"
            ? prod.low_stock_threshold_grams
            : 1000;
        const pricePerKg =
          typeof prod?.price_per_kg === "number"
            ? prod.price_per_kg
            : rec.price_per_kg !== undefined
            ? rec.price_per_kg
            : Number(prod?.price || rec.price || 0);

        const img = Array.isArray(prod?.images) ? prod.images[0] : prod?.image || rec.product_image;
        return {
          ...rec,
          id: rec.id || `inv_${rPid || rSlug}`,
          product_id: rPid || rSlug,
          product_slug: rSlug || prod?.slug || rPid,
          stock_grams: currentGrams,
          price_per_kg: pricePerKg,
          low_stock_threshold_grams: thresholdGrams,
          quantity: Math.floor(currentGrams / 1000),
          product_name: prod?.name || rec.product_name || "Organic Produce",
          product_image: img || "/assets/cat-dryfruits.jpg",
          category: rec.category || prod?.category || "Produce",
          farmer_id: rec.farmer_id || prod?.farmer_id || "",
          farmer_name:
            rec.farmer_name ||
            prod?.farmer_profiles?.full_name ||
            prod?.farmer_name ||
            "Verified Farmer",
          price: rec.price !== undefined ? rec.price : Number(prod?.price || 0),
          status: rec.status || prod?.status || "published",
        };
      });

      // Keep local backup synchronized
      saveStoredInventory(records);
    } catch (e) {
      console.warn("[inventoryService] Error enriching inventory items:", e);
    }

    // Apply Filters
    let filtered = [...records];

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          (r.product_name || "").toLowerCase().includes(q) ||
          (r.farmer_name || "").toLowerCase().includes(q) ||
          (r.variant_name || "").toLowerCase().includes(q) ||
          (r.category || "").toLowerCase().includes(q)
      );
    }

    if (filters?.category && filters.category !== "all") {
      filtered = filtered.filter((r) => (r.category || "").toLowerCase() === filters.category!.toLowerCase());
    }

    if (filters?.farmerId && filters.farmerId !== "all") {
      filtered = filtered.filter((r) => r.farmer_id === filters.farmerId);
    }

    if (filters?.statusFilter && filters.statusFilter !== "all") {
      filtered = filtered.filter((r) => {
        const avail = getAvailability(r);
        return avail.status === filters.statusFilter;
      });
    }

    return filtered;
  },

  /**
   * Get single inventory record by product & variant
   */
  async getInventory(productId: string, variantId?: string): Promise<InventoryRecord | null> {
    const all = await this.getAllInventory();
    return (
      all.find(
        (r) =>
          (r.product_id === productId || r.product_slug === productId) &&
          (!variantId || r.variant_id === variantId)
      ) || null
    );
  },

  /**
   * Register inventory for a brand new product / variant
   */
  async createProductInventory(params: {
    productId: string;
    variantId: string;
    variantName?: string;
    openingStock: number;
    lowStockThreshold?: number;
    preorderEnabled?: boolean;
    userEmail?: string;
    productMeta?: {
      name: string;
      slug: string;
      image?: string;
      category?: string;
      farmerId?: string;
      farmerName?: string;
      price?: number;
    };
  }): Promise<InventoryRecord> {
    const openingStock = Math.max(0, Number(params.openingStock || 0));
    const threshold = Math.max(0, Number(params.lowStockThreshold ?? 10));
    const preorder = Boolean(params.preorderEnabled);
    const now = new Date().toISOString();

    const record: InventoryRecord = {
      id: "inv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      product_id: params.productId,
      variant_id: params.variantId || "default",
      variant_name: params.variantName || params.variantId || "Standard",
      quantity: openingStock,
      stock_grams: openingStock > 1000 ? openingStock : openingStock * 1000,
      sold_count: 0,
      pledged_count: 0,
      low_stock_threshold: threshold,
      low_stock_threshold_grams: threshold > 1000 ? threshold : threshold * 1000,
      preorder_enabled: preorder,
      created_at: now,
      updated_at: now,
      updated_by: params.userEmail || "admin",
      product_name: params.productMeta?.name,
      product_slug: params.productMeta?.slug,
      product_image: params.productMeta?.image,
      category: params.productMeta?.category,
      farmer_id: params.productMeta?.farmerId,
      farmer_name: params.productMeta?.farmerName,
      price: params.productMeta?.price,
    };

    // 1. Persist to DB
    try {
      await supabase.from("product_inventory").upsert({
        product_id: record.product_id,
        variant_id: record.variant_id,
        variant_name: record.variant_name,
        quantity: record.quantity,
        sold_count: 0,
        pledged_count: 0,
        low_stock_threshold: record.low_stock_threshold,
        preorder_enabled: record.preorder_enabled,
        updated_at: now,
        updated_by: record.updated_by,
      });

      await supabase.from("stock_history").insert({
        product_id: record.product_id,
        variant_id: record.variant_id,
        change_amount: openingStock,
        quantity_before: 0,
        quantity_after: openingStock,
        reason: "new_product",
        reference_id: "initial_creation",
        user_email: params.userEmail || "admin",
        created_at: now,
      });
    } catch (e) {
      console.warn("[inventoryService] Supabase create error:", e);
    }

    // 2. Persist to local cache
    const current = getStoredInventory();
    saveStoredInventory([record, ...current.filter((c) => !(c.product_id === record.product_id && c.variant_id === record.variant_id))]);

    appendStoredHistory({
      id: "hist_" + Date.now(),
      product_id: record.product_id,
      variant_id: record.variant_id,
      product_name: record.product_name,
      variant_name: record.variant_name,
      change_amount: openingStock,
      quantity_before: 0,
      quantity_after: openingStock,
      reason: "new_product",
      reference_id: "initial_creation",
      user_email: params.userEmail || "admin",
      created_at: now,
    });

    broadcastInventoryUpdate({ type: "CREATED", record });
    return record;
  },

  /**
   * Adjust product stock in grams.
   * Modes:
   * - 'add': restock, increases stock
   * - 'remove': damage/expiry/loss, decreases stock (cannot go negative)
   * - 'set': physical count correction, sets exact stock
   */
  async adjustStock(params: {
    productId: string;
    mode: "add" | "remove" | "set";
    grams: number;
    reason: string;
    note?: string;
    userEmail?: string;
    adminToken?: string;
  }): Promise<{
    success: boolean;
    stockBefore: number;
    stockAfter: number;
    grams: number;
    error?: string;
  }> {
    const { productId, mode, grams, reason, note, userEmail, adminToken } = params;
    const cleanPid = String(productId || "").trim();

    if (!cleanPid || cleanPid === "undefined" || cleanPid === "null") {
      return { success: false, stockBefore: 0, stockAfter: 0, grams: 0, error: "Valid product ID is required for stock adjustment" };
    }

    if (!["add", "remove", "set"].includes(mode)) {
      return { success: false, stockBefore: 0, stockAfter: 0, grams: 0, error: "Invalid adjustment mode" };
    }
    if (typeof grams !== "number" || isNaN(grams) || grams < 0) {
      return { success: false, stockBefore: 0, stockAfter: 0, grams: 0, error: "Grams must be a non-negative number" };
    }
    if ((mode === "add" || mode === "remove") && grams <= 0) {
      return { success: false, stockBefore: 0, stockAfter: 0, grams: 0, error: `Grams to ${mode} must be greater than zero` };
    }

    let token = adminToken;
    if (!token && typeof window !== "undefined") {
      try {
        const { getClientAuthToken } = await import("@/lib/api/admin-auth.client");
        token = (await getClientAuthToken()) || undefined;
      } catch {}
    }

    let apiSucceeded = false;
    let resultData: any = null;

    try {
      // 1. Try preferred API endpoint
      let res = await fetch(`/api/inventory/${encodeURIComponent(productId)}/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mode, grams, reason, note }),
      });

      if (!res.ok) {
        // Fallback to secondary route
        res = await fetch(`/inventory/${encodeURIComponent(productId)}/adjust`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ mode, grams, reason, note }),
        });
      }

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        apiSucceeded = true;
        resultData = json;
      } else if (json?.error && res.status === 400) {
        return {
          success: false,
          stockBefore: json.stockBefore ?? 0,
          stockAfter: json.stockAfter ?? 0,
          grams,
          error: json.error,
        };
      }
    } catch (e) {
      console.warn("[inventoryService.adjustStock] Backend API error, using atomic application fallback:", e);
    }

    // Determine current inventory record and values
    const all = getStoredInventory();
    const inv = all.find(
      (r) =>
        r.product_id === productId ||
        r.product_slug === productId ||
        r.id === productId ||
        r.id === `inv_${productId}`
    );

    // Look for product in custom products list if present
    let localProd: any = null;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("prajnaa_custom_products");
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            localProd = list.find(
              (p: any) =>
                p.id === productId ||
                p.slug === productId ||
                (p.name && typeof productId === "string" && p.name.trim().toLowerCase() === productId.trim().toLowerCase())
            );
          }
        }
      } catch {}
    }

    const curGrams =
      inv?.stock_grams !== undefined
        ? inv.stock_grams
        : typeof localProd?.stock_grams === "number"
        ? localProd.stock_grams
        : Math.max(0, Math.round(Number(inv?.quantity || localProd?.stock || 0) * 1000));

    let before = curGrams;
    let after = curGrams;

    if (apiSucceeded && resultData) {
      before = Number(resultData.stockBefore);
      after = Number(resultData.stockAfter);
    } else {
      if (mode === "add") {
        after = before + grams;
      } else if (mode === "remove") {
        if (before < grams) {
          return {
            success: false,
            stockBefore: before,
            stockAfter: before,
            grams,
            error: `Not enough stock. Only ${formatStock(before)} available.`,
          };
        }
        after = before - grams;
      } else if (mode === "set") {
        after = grams;
      }
    }

    const now = new Date().toISOString();
    const delta = mode === "set" ? Math.abs(after - before) : grams;

    // Locate target record strictly: match by product_id, product_slug, or exact record id
    const targetIdx = all.findIndex((r) => {
      const rPid = String(r.product_id || "").trim();
      const rSlug = String(r.product_slug || "").trim();
      const rId = String(r.id || "").trim();
      return (
        Boolean(cleanPid && rPid && rPid === cleanPid) ||
        Boolean(cleanPid && rSlug && rSlug === cleanPid) ||
        Boolean(cleanPid && rId && (rId === cleanPid || rId === `inv_${cleanPid}`))
      );
    });

    let updatedRecords = [...all];
    if (targetIdx >= 0) {
      // STRICTLY update ONLY the matching record — never touch any other product
      updatedRecords[targetIdx] = {
        ...updatedRecords[targetIdx],
        stock_grams: after,
        quantity: Math.floor(after / 1000),
        updated_at: now,
        updated_by: userEmail || "admin",
      };
    } else {
      updatedRecords.push({
        id: `inv_${cleanPid}`,
        product_id: cleanPid,
        product_slug: localProd?.slug || cleanPid,
        product_name: inv?.product_name || localProd?.name || cleanPid,
        product_image: localProd?.images?.[0] || localProd?.image || "/assets/cat-dryfruits.jpg",
        category: localProd?.category || "Produce",
        farmer_id: localProd?.farmer_id || "",
        farmer_name: localProd?.farmer_profiles?.full_name || "Verified Local Farmer",
        price: Number(localProd?.price || 0),
        variant_id: "default",
        variant_name: "Standard Pack",
        stock_grams: after,
        quantity: Math.floor(after / 1000),
        low_stock_threshold_grams: 1000,
        low_stock_threshold: 1,
        sold_count: 0,
        pledged_count: 0,
        preorder_enabled: Boolean(localProd?.is_preorder),
        created_at: now,
        updated_at: now,
        updated_by: userEmail || "admin",
      });
    }

    saveStoredInventory(updatedRecords);
    syncProductLocalStorage(cleanPid, { stock_grams: after, stock: Math.floor(after / 1000) });

    // Direct database sync strictly targeted to THIS product only
    try {
      const targetId = (cleanPid || inv?.product_id || localProd?.id || "").trim();
      const targetSlug = (inv?.product_slug || localProd?.slug || "").trim();
      const updateData = {
        stock_grams: after,
        stock: Math.floor(after / 1000),
        updated_at: now,
      };

      if (targetId) {
        await supabase.from("farmer_products").update(updateData).eq("id", targetId);
        await supabase
          .from("product_inventory")
          .update({
            stock_grams: after,
            quantity: Math.floor(after / 1000),
            updated_at: now,
            updated_by: userEmail || "admin",
          })
          .eq("product_id", targetId);
      }

      if (targetSlug && targetSlug !== targetId) {
        await supabase.from("farmer_products").update(updateData).eq("slug", targetSlug);
        await supabase
          .from("product_inventory")
          .update({
            stock_grams: after,
            quantity: Math.floor(after / 1000),
            updated_at: now,
            updated_by: userEmail || "admin",
          })
          .eq("product_id", targetSlug);
      }
    } catch (sbErr) {
      console.warn("[inventoryService] Client direct database update warning:", sbErr);
    }

    // Append to movement log
    const movement: StockMovement = {
      id: "mov_" + Date.now(),
      productId,
      product_id: productId,
      productName: inv?.product_name || localProd?.name,
      product_name: inv?.product_name || localProd?.name,
      type: mode,
      grams: delta,
      stockBefore: before,
      stock_before: before,
      stockAfter: after,
      stock_after: after,
      reason,
      note,
      adminId: userEmail || "admin",
      admin_id: userEmail || "admin",
      createdAt: now,
      created_at: now,
    };

    try {
      const rawMov = localStorage.getItem(INVENTORY_MOVEMENTS_KEY);
      const existingMov: StockMovement[] = rawMov ? JSON.parse(rawMov) : [];
      localStorage.setItem(INVENTORY_MOVEMENTS_KEY, JSON.stringify([movement, ...existingMov.slice(0, 499)]));
    } catch {}

    broadcastInventoryUpdate({
      type: "STOCK_ADJUSTED",
      productId,
      mode,
      stockBefore: before,
      stockAfter: after,
      grams: delta,
    });

    try {
      const { broadcastProductUpdate } = await import("@/lib/services/productSyncService");
      broadcastProductUpdate({
        type: "UPDATED",
        product: { id: productId, stock_grams: after, stock: Math.floor(after / 1000) },
        timestamp: Date.now(),
      });
    } catch {}

    return {
      success: true,
      stockBefore: before,
      stockAfter: after,
      grams: delta,
    };
  },

  /**
   * Restock (backward compatibility wrapper around adjustStock).
   */
  async restock(params: {
    productId: string;
    variantId: string;
    quantityToAdd: number;
    reason?: string;
    referenceId?: string;
    userEmail?: string;
  }): Promise<{ success: boolean; newQuantity: number; error?: string }> {
    const amountToAdd = Number(params.quantityToAdd);
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      return { success: false, newQuantity: 0, error: "Restock quantity must be 1 or greater" };
    }

    const now = new Date().toISOString();
    const inv = await this.getInventory(params.productId, params.variantId);
    const before = inv ? inv.quantity : 0;
    const after = before + amountToAdd;

    // 1. Try atomic database stored procedure
    try {
      const { data, error } = await supabase.rpc("restock_inventory_atomic", {
        p_product_id: params.productId,
        p_variant_id: params.variantId,
        p_qty: amountToAdd,
        p_reason: params.reason || "restock",
        p_reference_id: params.referenceId || null,
        p_user_email: params.userEmail || "admin",
      });

      if (error) {
        console.warn("[inventoryService.restock] RPC error, using direct update:", error);
        await supabase
          .from("product_inventory")
          .update({ quantity: after, updated_at: now, updated_by: params.userEmail || "admin" })
          .match({ product_id: params.productId, variant_id: params.variantId });

        await supabase.from("stock_history").insert({
          product_id: params.productId,
          variant_id: params.variantId,
          change_amount: amountToAdd,
          quantity_before: before,
          quantity_after: after,
          reason: params.reason || "restock",
          reference_id: params.referenceId || null,
          user_email: params.userEmail || "admin",
          created_at: now,
        });
      }
    } catch (e) {
      console.warn("[inventoryService.restock] Database update error:", e);
    }

    // 2. Also keep farmer_products table in sync for backward compatibility
    await safeUpdateFarmerProduct(params.productId, { stock: after, status: "published", updated_at: now });
    syncProductLocalStorage(params.productId, { stock: after, status: "published" });

    // 3. Local update and reactive broadcast
    const all = getStoredInventory();
    const updated = all.map((r) => {
      if ((r.product_id === params.productId || r.product_slug === params.productId) && r.variant_id === params.variantId) {
        return { ...r, quantity: after, updated_at: now, updated_by: params.userEmail || "admin" };
      }
      return r;
    });
    saveStoredInventory(updated);

    appendStoredHistory({
      id: "hist_" + Date.now(),
      product_id: params.productId,
      variant_id: params.variantId,
      product_name: inv?.product_name,
      variant_name: inv?.variant_name,
      change_amount: amountToAdd,
      quantity_before: before,
      quantity_after: after,
      reason: params.reason || "restock",
      reference_id: params.referenceId || null,
      user_email: params.userEmail || "admin",
      created_at: now,
    });

    broadcastInventoryUpdate({ type: "RESTOCKED", productId: params.productId, variantId: params.variantId, newQuantity: after });
    broadcastProductUpdate({ type: "UPDATED", productId: params.productId });
    return { success: true, newQuantity: after };
  },

  /**
   * Manual inline stock correction (records reason and prevents negative numbers)
   */
  async manualCorrection(params: {
    productId: string;
    variantId: string;
    newQuantity: number;
    expectedBefore?: number;
    reason?: string;
    userEmail?: string;
  }): Promise<{ success: boolean; newQuantity: number; conflict?: boolean; error?: string }> {
    const qty = Number(params.newQuantity);
    if (isNaN(qty) || qty < 0) {
      return { success: false, newQuantity: 0, error: "Stock quantity cannot be negative" };
    }

    const now = new Date().toISOString();
    const inv = await this.getInventory(params.productId, params.variantId);
    const before = inv ? inv.quantity : 0;
    const diff = qty - before;

    // Concurrency check
    if (params.expectedBefore !== undefined && params.expectedBefore !== before) {
      return {
        success: false,
        conflict: true,
        newQuantity: before,
        error: `Stock has been modified by another admin. Current quantity is ${before}.`,
      };
    }

    try {
      const { data, error } = await supabase.rpc("update_inventory_stock_atomic", {
        p_product_id: params.productId,
        p_variant_id: params.variantId,
        p_new_quantity: qty,
        p_expected_before: params.expectedBefore ?? null,
        p_reason: params.reason || "manual_correction",
        p_reference_id: "admin_inline_edit",
        p_user_email: params.userEmail || "admin",
      });

      if (error) {
        await supabase
          .from("product_inventory")
          .update({ quantity: qty, updated_at: now, updated_by: params.userEmail || "admin" })
          .match({ product_id: params.productId, variant_id: params.variantId });

        if (diff !== 0) {
          await supabase.from("stock_history").insert({
            product_id: params.productId,
            variant_id: params.variantId,
            change_amount: diff,
            quantity_before: before,
            quantity_after: qty,
            reason: params.reason || "manual_correction",
            reference_id: "admin_inline_edit",
            user_email: params.userEmail || "admin",
            created_at: now,
          });
        }
      }
    } catch (e) {
      console.warn("[inventoryService.manualCorrection] DB error:", e);
    }

    await safeUpdateFarmerProduct(params.productId, { stock: qty, updated_at: now });
    syncProductLocalStorage(params.productId, { stock: qty });

    const all = getStoredInventory();
    const updated = all.map((r) => {
      if ((r.product_id === params.productId || r.product_slug === params.productId) && r.variant_id === params.variantId) {
        return { ...r, quantity: qty, updated_at: now, updated_by: params.userEmail || "admin" };
      }
      return r;
    });
    saveStoredInventory(updated);

    if (diff !== 0) {
      appendStoredHistory({
        id: "hist_" + Date.now(),
        product_id: params.productId,
        variant_id: params.variantId,
        product_name: inv?.product_name,
        variant_name: inv?.variant_name,
        change_amount: diff,
        quantity_before: before,
        quantity_after: qty,
        reason: params.reason || "manual_correction",
        reference_id: "admin_inline_edit",
        user_email: params.userEmail || "admin",
        created_at: now,
      });
    }

    broadcastInventoryUpdate({ type: "CORRECTED", productId: params.productId, variantId: params.variantId, newQuantity: qty });
    broadcastProductUpdate({ type: "UPDATED", productId: params.productId });
    return { success: true, newQuantity: qty };
  },

  /**
   * Toggle Pre-order policy.
   * STRICT RULE: Modifies ONLY preorder_enabled. NEVER alters quantity or sold counts!
   */
  async togglePreorder(
    productId: string,
    variantId: string,
    preorderEnabled: boolean,
    userEmail?: string
  ): Promise<boolean> {
    const now = new Date().toISOString();

    try {
      await supabase
        .from("product_inventory")
        .update({ preorder_enabled: preorderEnabled, updated_at: now, updated_by: userEmail || "admin" })
        .match({ product_id: productId, variant_id: variantId });
    } catch (e) {
      console.warn("[inventoryService.togglePreorder] DB error:", e);
    }

    await safeUpdateFarmerProduct(productId, { is_preorder: preorderEnabled, updated_at: now });
    syncProductLocalStorage(productId, { is_preorder: preorderEnabled });

    const all = getStoredInventory();
    const updated = all.map((r) => {
      if ((r.product_id === productId || r.product_slug === productId) && r.variant_id === variantId) {
        return { ...r, preorder_enabled: preorderEnabled, updated_at: now, updated_by: userEmail || "admin" };
      }
      return r;
    });
    saveStoredInventory(updated);

    broadcastInventoryUpdate({ type: "PREORDER_TOGGLED", productId, variantId, preorderEnabled });
    broadcastProductUpdate({ type: "UPDATED", productId });
    return true;
  },

  /**
   * Atomic conditional stock decrement for checkout purchases.
   * Decrements stock in grams and logs a 'sale' StockMovement.
   * If stock reaches 0, the product automatically becomes Out of Stock (or Pre-order if enabled).
   */
  async decrementStockForOrder(params: {
    productId: string;
    variantId?: string;
    grams?: number;
    quantity?: number;
    orderId: string;
    userEmail?: string;
  }): Promise<{ success: boolean; isPreorder?: boolean; error?: string }> {
    const deductGrams =
      params.grams !== undefined && params.grams > 0
        ? Math.round(params.grams)
        : Math.round(Number(params.quantity || 1) * 1000);

    const inv = await this.getInventory(params.productId, params.variantId);
    if (!inv) {
      return { success: false, error: "Product inventory not found" };
    }

    const currentGrams =
      inv.stock_grams !== undefined
        ? inv.stock_grams
        : Math.max(0, Math.round(Number(inv.quantity || 0) * 1000));
    const variantId = inv.variant_id || "default";
    const now = new Date().toISOString();

    // 1. Try atomic PostgreSQL conditional decrement RPC
    try {
      const { data, error } = await supabase.rpc("deduct_order_stock_atomic", {
        p_product_id: inv.product_id,
        p_grams: deductGrams,
        p_order_id: params.orderId,
        p_admin_id: params.userEmail || null,
      });

      if (!error && data) {
        if (!data.success) {
          return { success: false, error: data.error || "Insufficient stock available" };
        }
        broadcastInventoryUpdate({ type: "ORDER_DEDUCTION", productId: inv.product_id, variantId, grams: deductGrams });
        return { success: true, isPreorder: false };
      }
    } catch (e) {
      console.warn("[inventoryService] RPC deduct error, using atomic application fallback:", e);
    }

    // 2. Application fallback
    if (currentGrams >= deductGrams) {
      const before = currentGrams;
      const after = before - deductGrams;
      const newSold = (inv.sold_count || 0) + deductGrams;

      try {
        await supabase
          .from("product_inventory")
          .update({
            stock_grams: after,
            quantity: Math.floor(after / 1000),
            sold_count: newSold,
            updated_at: now,
          })
          .match({ product_id: inv.product_id, variant_id: variantId });

        await safeUpdateFarmerProduct(inv.product_id, {
          stock_grams: after,
          stock: Math.floor(after / 1000),
          updated_at: now,
        });
        syncProductLocalStorage(inv.product_id, {
          stock_grams: after,
          stock: Math.floor(after / 1000),
        });

        // Insert into stock_movements
        await supabase.from("stock_movements").insert({
          product_id: inv.product_id,
          type: "sale",
          grams: deductGrams,
          stock_before: before,
          stock_after: after,
          reason: "Customer purchase",
          order_id: params.orderId,
          created_at: now,
        });
      } catch {}

      const all = getStoredInventory();
      saveStoredInventory(
        all.map((r) =>
          r.id === inv.id
            ? {
                ...r,
                stock_grams: after,
                quantity: Math.floor(after / 1000),
                sold_count: newSold,
                updated_at: now,
              }
            : r
        )
      );

      // Record movement in local storage
      const saleMovement: StockMovement = {
        id: "mov_" + Date.now(),
        productId: inv.product_id,
        product_id: inv.product_id,
        productName: inv.product_name,
        product_name: inv.product_name,
        type: "sale",
        grams: deductGrams,
        stockBefore: before,
        stock_before: before,
        stockAfter: after,
        stock_after: after,
        reason: "Customer purchase",
        orderId: params.orderId,
        order_id: params.orderId,
        createdAt: now,
        created_at: now,
      };

      try {
        const rawMov = localStorage.getItem(INVENTORY_MOVEMENTS_KEY);
        const existingMov: StockMovement[] = rawMov ? JSON.parse(rawMov) : [];
        localStorage.setItem(
          INVENTORY_MOVEMENTS_KEY,
          JSON.stringify([saleMovement, ...existingMov.slice(0, 499)])
        );
      } catch {}

      broadcastInventoryUpdate({ type: "ORDER_DEDUCTION", productId: inv.product_id, variantId, grams: deductGrams });
      return { success: true, isPreorder: false };
    }

    return {
      success: false,
      error: `Insufficient stock available. Only ${formatStock(currentGrams)} in stock.`,
    };
  },

  /**
   * Revert grams on order cancellation or refund.
   * Logs a 'refund' StockMovement with the orderId.
   */
  async revertStockForOrder(params: {
    productId: string;
    variantId?: string;
    grams?: number;
    quantity?: number;
    orderId: string;
    reason?: string;
    userEmail?: string;
  }): Promise<boolean> {
    const restoreGrams =
      params.grams !== undefined && params.grams > 0
        ? Math.round(params.grams)
        : Math.round(Number(params.quantity || 1) * 1000);

    const inv = await this.getInventory(params.productId, params.variantId);
    if (!inv) return false;

    const currentGrams =
      inv.stock_grams !== undefined
        ? inv.stock_grams
        : Math.max(0, Math.round(Number(inv.quantity || 0) * 1000));
    const variantId = inv.variant_id || "default";
    const before = currentGrams;
    const after = before + restoreGrams;
    const soldAfter = Math.max(0, (inv.sold_count || 0) - restoreGrams);
    const now = new Date().toISOString();

    // 1. Try atomic PostgreSQL revert RPC
    try {
      await supabase.rpc("revert_order_stock_atomic", {
        p_product_id: inv.product_id,
        p_grams: restoreGrams,
        p_order_id: params.orderId,
        p_reason: params.reason || "Customer order cancelled",
        p_admin_id: params.userEmail || "admin",
      });
    } catch (e) {
      console.warn("[inventoryService.revertStockForOrder] RPC fallback:", e);
    }

    try {
      await supabase
        .from("product_inventory")
        .update({
          stock_grams: after,
          quantity: Math.floor(after / 1000),
          sold_count: soldAfter,
          updated_at: now,
        })
        .match({ product_id: inv.product_id, variant_id: variantId });

      await safeUpdateFarmerProduct(inv.product_id, {
        stock_grams: after,
        stock: Math.floor(after / 1000),
        updated_at: now,
      });
      syncProductLocalStorage(inv.product_id, {
        stock_grams: after,
        stock: Math.floor(after / 1000),
      });

      // Insert into stock_movements
      await supabase.from("stock_movements").insert({
        product_id: inv.product_id,
        type: "refund",
        grams: restoreGrams,
        stock_before: before,
        stock_after: after,
        reason: params.reason || "Order cancelled / refunded",
        order_id: params.orderId,
        admin_id: params.userEmail || "admin",
        created_at: now,
      });
    } catch (e) {
      console.warn("[inventoryService.revertStockForOrder] DB update error:", e);
    }

    const all = getStoredInventory();
    saveStoredInventory(
      all.map((r) =>
        r.id === inv.id
          ? {
              ...r,
              stock_grams: after,
              quantity: Math.floor(after / 1000),
              sold_count: soldAfter,
              updated_at: now,
            }
          : r
      )
    );

    const refundMovement: StockMovement = {
      id: "mov_" + Date.now(),
      productId: inv.product_id,
      product_id: inv.product_id,
      productName: inv.product_name,
      product_name: inv.product_name,
      type: "refund",
      grams: restoreGrams,
      stockBefore: before,
      stock_before: before,
      stockAfter: after,
      stock_after: after,
      reason: params.reason || "Order cancelled / refunded",
      orderId: params.orderId,
      order_id: params.orderId,
      adminId: params.userEmail || "admin",
      admin_id: params.userEmail || "admin",
      createdAt: now,
      created_at: now,
    };

    try {
      const rawMov = localStorage.getItem(INVENTORY_MOVEMENTS_KEY);
      const existingMov: StockMovement[] = rawMov ? JSON.parse(rawMov) : [];
      localStorage.setItem(
        INVENTORY_MOVEMENTS_KEY,
        JSON.stringify([refundMovement, ...existingMov.slice(0, 499)])
      );
    } catch {}

    broadcastInventoryUpdate({ type: "ORDER_REVERT", productId: inv.product_id, variantId, grams: restoreGrams });
    return true;
  },

  /**
   * Convert pre-order pledges to fulfilled stock upon fresh harvest restock
   */
  async convertPledgesToOrders(params: {
    productId: string;
    variantId: string;
    countToConvert: number;
    userEmail?: string;
  }): Promise<{ success: boolean; converted: number; error?: string }> {
    const inv = await this.getInventory(params.productId, params.variantId);
    if (!inv) return { success: false, converted: 0, error: "Product not found" };

    const pledged = inv.pledged_count || 0;
    if (pledged <= 0) return { success: false, converted: 0, error: "No pledges to convert" };

    const toConvert = Math.min(pledged, Math.min(inv.quantity, params.countToConvert));
    if (toConvert <= 0) {
      return {
        success: false,
        converted: 0,
        error: "Insufficient in-stock weight to fulfill pre-orders. Please add more stock first.",
      };
    }

    const newQty = inv.quantity - toConvert;
    const newPledged = pledged - toConvert;
    const newSold = (inv.sold_count || 0) + toConvert;
    const now = new Date().toISOString();

    try {
      await supabase
        .from("product_inventory")
        .update({
          quantity: newQty,
          pledged_count: newPledged,
          sold_count: newSold,
          updated_at: now,
        })
        .match({ product_id: inv.product_id, variant_id: inv.variant_id });

      await supabase.from("stock_history").insert({
        product_id: inv.product_id,
        variant_id: inv.variant_id,
        change_amount: -toConvert,
        quantity_before: inv.quantity,
        quantity_after: newQty,
        reason: "preorder_fulfilled",
        reference_id: `converted_${toConvert}_pledges`,
        user_email: params.userEmail || "admin",
        created_at: now,
      });
    } catch {}

    const all = getStoredInventory();
    saveStoredInventory(
      all.map((r) =>
        r.id === inv.id ? { ...r, quantity: newQty, pledged_count: newPledged, sold_count: newSold } : r
      )
    );

    appendStoredHistory({
      id: "hist_" + Date.now(),
      product_id: inv.product_id,
      variant_id: inv.variant_id,
      product_name: inv.product_name,
      variant_name: inv.variant_name,
      change_amount: -toConvert,
      quantity_before: inv.quantity,
      quantity_after: newQty,
      reason: "preorder_fulfilled",
      reference_id: `converted_${toConvert}_pledges`,
      user_email: params.userEmail || "admin",
      created_at: now,
    });

    broadcastInventoryUpdate({ type: "PLEDGES_CONVERTED", productId: inv.product_id, variantId: inv.variant_id });
    return { success: true, converted: toConvert };
  },

  /**
   * Bulk Restock
   */
  async bulkRestock(
    items: Array<{ productId: string; variantId: string }>,
    quantityToAdd: number,
    reason?: string,
    userEmail?: string
  ): Promise<number> {
    let successCount = 0;
    for (const item of items) {
      const res = await this.restock({
        productId: item.productId,
        variantId: item.variantId,
        quantityToAdd,
        reason: reason || "bulk_restock",
        userEmail,
      });
      if (res.success) successCount++;
    }
    return successCount;
  },

  /**
   * Bulk Toggle Pre-order
   */
  async bulkTogglePreorder(
    items: Array<{ productId: string; variantId: string }>,
    preorderEnabled: boolean,
    userEmail?: string
  ): Promise<number> {
    let count = 0;
    for (const item of items) {
      await this.togglePreorder(item.productId, item.variantId, preorderEnabled, userEmail);
      count++;
    }
    return count;
  },

  /**
   * Get Stock History Audit Trail
   */
  async getStockHistory(filters?: {
    productId?: string;
    reason?: string;
    limit?: number;
  }): Promise<StockHistoryEntry[]> {
    let entries: StockHistoryEntry[] = [];

    try {
      let query = supabase
        .from("stock_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.productId) {
        query = query.eq("product_id", filters.productId);
      }
      if (filters?.reason && filters.reason !== "all") {
        query = query.eq("reason", filters.reason);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        entries = data;
      }
    } catch {}

    if (entries.length === 0) {
      entries = getStoredHistory();
      if (filters?.productId) {
        entries = entries.filter((e) => e.product_id === filters.productId);
      }
      if (filters?.reason && filters.reason !== "all") {
        entries = entries.filter((e) => e.reason === filters.reason);
      }
    }

    return entries;
  },

  /**
   * Get StockMovements (audit trail for every stock change: add | remove | set | sale | refund)
   */
  async getStockMovements(filters?: {
    productId?: string;
    type?: string;
    limit?: number;
    page?: number;
  }): Promise<StockMovement[]> {
    let movements: StockMovement[] = [];
    const productId = filters?.productId;

    // 1. Try querying the API endpoint
    if (productId) {
      try {
        let token: string | undefined;
        if (typeof window !== "undefined") {
          try {
            const { getClientAuthToken } = await import("@/lib/api/admin-auth.client");
            token = (await getClientAuthToken()) || undefined;
          } catch {}
        }

        const encodedPid = encodeURIComponent(productId);
        const queryParams = `page=${filters?.page || 1}&limit=${filters?.limit || 50}`;
        const headers: Record<string, string> = {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        let res = await fetch(`/api/inventory/${encodedPid}/history?${queryParams}`, { headers });
        if (!res.ok) {
          res = await fetch(`/inventory/${encodedPid}/history?${queryParams}`, { headers });
        }

        const data = await res.json().catch(() => null);
        if (data?.success && Array.isArray(data.movements) && data.movements.length > 0) {
          return data.movements.map((m: any) => ({
            id: m.id,
            productId: m.product_id || m.productId,
            product_id: m.product_id || m.productId,
            productName: m.product_name || m.productName,
            type: m.type,
            grams: Number(m.grams || 0),
            stockBefore: Number(m.stock_before ?? m.stockBefore ?? 0),
            stock_before: Number(m.stock_before ?? m.stockBefore ?? 0),
            stockAfter: Number(m.stock_after ?? m.stockAfter ?? 0),
            stock_after: Number(m.stock_after ?? m.stockAfter ?? 0),
            reason: m.reason,
            note: m.note,
            adminId: m.admin_id || m.adminId,
            admin_id: m.admin_id || m.adminId,
            orderId: m.order_id || m.orderId,
            order_id: m.order_id || m.orderId,
            createdAt: m.created_at || m.createdAt || new Date().toISOString(),
            created_at: m.created_at || m.createdAt || new Date().toISOString(),
            user_email: m.admin_id || m.user_email || "admin",
          }));
        }
      } catch {}
    }

    // 2. Try querying Supabase stock_movements
    try {
      let query = supabase
        .from("stock_movements")
        .select("*")
        .order("created_at", { ascending: false });

      if (productId) {
        query = query.eq("product_id", productId);
      }
      if (filters?.type && filters.type !== "all") {
        query = query.eq("type", filters.type);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        movements = data.map((m: any) => ({
          id: m.id,
          productId: m.product_id,
          product_id: m.product_id,
          productName: m.product_name,
          type: m.type,
          grams: Number(m.grams || 0),
          stockBefore: Number(m.stock_before || 0),
          stock_before: Number(m.stock_before || 0),
          stockAfter: Number(m.stock_after || 0),
          stock_after: Number(m.stock_after || 0),
          reason: m.reason,
          note: m.note,
          adminId: m.admin_id,
          admin_id: m.admin_id,
          orderId: m.order_id,
          order_id: m.order_id,
          createdAt: m.created_at,
          created_at: m.created_at,
          user_email: m.admin_id,
        }));
      }
    } catch {}

    // 3. Fallback to local storage movements
    if (movements.length === 0 && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(INVENTORY_MOVEMENTS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          movements = parsed;
          if (productId) {
            movements = movements.filter(
              (m) => m.productId === productId || m.product_id === productId
            );
          }
          if (filters?.type && filters.type !== "all") {
            movements = movements.filter((m) => m.type === filters.type);
          }
        }
      } catch {}
    }

    return movements;
  },

  /**
   * Export stock history to CSV formatted string
   */
  exportHistoryToCSV(history: StockHistoryEntry[]): string {
    const headers = ["Timestamp", "Product Name", "Variant", "Change", "Before", "After", "Reason", "Reference", "Admin / User"];
    const rows = history.map((h) => [
      `"${new Date(h.created_at).toLocaleString()}"`,
      `"${(h.product_name || h.product_id || "").replace(/"/g, '""')}"`,
      `"${(h.variant_name || h.variant_id || "").replace(/"/g, '""')}"`,
      h.change_amount > 0 ? `+${h.change_amount}` : String(h.change_amount),
      h.quantity_before,
      h.quantity_after,
      `"${h.reason}"`,
      `"${(h.reference_id || "-").replace(/"/g, '""')}"`,
      `"${(h.user_email || "System").replace(/"/g, '""')}"`,
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  },

  /**
   * Fetch live inventory items for a specific farmer (Farmer Portal compatibility)
   */
  async getFarmerInventory(farmerId?: string): Promise<InventoryItem[]> {
    if (!farmerId) return [];
    try {
      const { data, error } = await supabase
        .from("farmer_products")
        .select("id, name, category, stock, unit, price, status, hsn_code, images, updated_at")
        .eq("farmer_id", farmerId)
        .order("name", { ascending: true });

      if (error) throw error;

      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category || "General",
        stock: Number(p.stock) || 0,
        unit: p.unit || "kg",
        price: Number(p.price) || 0,
        status: p.status || "published",
        hsn_code: p.hsn_code || null,
        images: p.images || [],
        low_stock_threshold: Number(p.low_stock_threshold) || 10,
        updated_at: p.updated_at,
      }));
    } catch (err) {
      console.warn("[inventoryService.getFarmerInventory] Error:", err);
      return [];
    }
  },

  /**
   * Update stock for a single item and record an audit log entry (Farmer Portal compatibility)
   */
  async updateStockQuantity(
    productId: string,
    farmerId: string,
    productName: string,
    newStock: number,
    oldStock: number,
    reason: string = "manual_edit",
    referenceId?: string
  ): Promise<boolean> {
    try {
      const cleanStock = Math.max(0, Math.floor(newStock));
      await this.manualCorrection({
        productId,
        variantId: "default",
        newQuantity: cleanStock,
        reason,
        userEmail: farmerId,
      });

      const logEntry: InventoryAuditLog = {
        id: "log_" + Math.random().toString(36).substring(2, 9),
        farmer_id: farmerId,
        product_id: productId,
        product_name: productName,
        old_stock: oldStock,
        new_stock: cleanStock,
        change_amount: cleanStock - oldStock,
        reason,
        reference_id: referenceId || null,
        created_at: new Date().toISOString(),
      };

      await this.logStockChange(logEntry);
      return true;
    } catch (err) {
      console.error("[inventoryService.updateStockQuantity] Failed:", err);
      throw err;
    }
  },

  /**
   * Apply bulk stock adjustments across multiple items (Farmer Portal compatibility)
   */
  async bulkUpdateStock(
    farmerId: string,
    itemsToUpdate: Array<{ id: string; name: string; oldStock: number; newStock: number }>,
    reason: string = "bulk_update"
  ): Promise<number> {
    let updatedCount = 0;

    for (const item of itemsToUpdate) {
      const cleanStock = Math.max(0, Math.floor(item.newStock));
      try {
        await this.manualCorrection({
          productId: item.id,
          variantId: "default",
          newQuantity: cleanStock,
          reason,
          userEmail: farmerId,
        });
        updatedCount++;
        const logEntry: InventoryAuditLog = {
          id: "log_" + Math.random().toString(36).substring(2, 9),
          farmer_id: farmerId,
          product_id: item.id,
          product_name: item.name,
          old_stock: item.oldStock,
          new_stock: cleanStock,
          change_amount: cleanStock - item.oldStock,
          reason,
          created_at: new Date().toISOString(),
        };
        await this.logStockChange(logEntry);
      } catch {}
    }

    return updatedCount;
  },

  /**
   * Save an audit log entry locally and in DB
   */
  async logStockChange(log: InventoryAuditLog): Promise<void> {
    try {
      appendStoredHistory({
        id: log.id,
        product_id: log.product_id,
        variant_id: "default",
        product_name: log.product_name,
        change_amount: log.change_amount,
        quantity_before: log.old_stock,
        quantity_after: log.new_stock,
        reason: log.reason,
        reference_id: log.reference_id || null,
        user_email: log.farmer_id || "farmer",
        created_at: log.created_at,
      });
    } catch {}

    try {
      await supabase.from("stock_history").insert({
        product_id: log.product_id,
        variant_id: "default",
        change_amount: log.change_amount,
        quantity_before: log.old_stock,
        quantity_after: log.new_stock,
        reason: log.reason,
        reference_id: log.reference_id || null,
        user_email: log.farmer_id || "farmer",
        created_at: log.created_at,
      });
    } catch {}
  },

  /**
   * Retrieve audit logs for a farmer
   */
  async getInventoryAuditLogs(farmerId?: string, productId?: string): Promise<InventoryAuditLog[]> {
    if (!farmerId) return [];

    let logs: InventoryAuditLog[] = [];
    try {
      let query = supabase
        .from("stock_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (productId) {
        query = query.eq("product_id", productId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        logs = data.map((d: any) => ({
          id: d.id,
          farmer_id: d.user_email,
          product_id: d.product_id,
          product_name: d.product_name || d.product_id,
          old_stock: d.quantity_before ?? 0,
          new_stock: d.quantity_after ?? 0,
          change_amount: d.change_amount ?? 0,
          reason: d.reason,
          reference_id: d.reference_id,
          created_at: d.created_at,
        }));
      }
    } catch {}

    if (logs.length === 0) {
      const stored = getStoredHistory();
      logs = stored.map((d: any) => ({
        id: d.id,
        farmer_id: d.user_email,
        product_id: d.product_id,
        product_name: d.product_name || d.product_id,
        old_stock: d.quantity_before ?? 0,
        new_stock: d.quantity_after ?? 0,
        change_amount: d.change_amount ?? 0,
        reason: d.reason,
        reference_id: d.reference_id,
        created_at: d.created_at,
      }));
    }

    return logs;
  },

  /**
   * Low stock query for dashboard and alert cards
   */
  async getLowStockItems(farmerId?: string, defaultThreshold = 10): Promise<LowStockItem[]> {
    try {
      if (farmerId) {
        const { data: products } = await supabase
          .from("farmer_products")
          .select("id, name, stock, unit, images, category")
          .eq("farmer_id", farmerId);

        if (products && products.length > 0) {
          return products
            .filter((p: any) => (Number(p.stock) || 0) <= defaultThreshold)
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              stock: Number(p.stock) || 0,
              unit: p.unit || "kg",
              image: p.images?.[0] || undefined,
              category: p.category || "Produce",
              low_stock_threshold: defaultThreshold,
            }));
        }
      }
    } catch {}
    return [];
  },

  /**
   * Fast update single stock item
   */
  async updateItemStock(productId: string, newStock: number): Promise<boolean> {
    try {
      const clean = Math.max(0, Math.floor(newStock));
      await this.manualCorrection({
        productId,
        variantId: "default",
        newQuantity: clean,
        reason: "dashboard_quick_update",
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Aggregate listings summary for farmer dashboard
   */
  async getListingsSummary(farmerId?: string): Promise<ListingsSummary> {
    try {
      if (farmerId) {
        const { data: products } = await supabase
          .from("farmer_products")
          .select("id, stock, status")
          .eq("farmer_id", farmerId);

        if (products) {
          const totalListings = products.length || 0;
          let published = 0;
          let drafted = 0;
          let outOfStock = 0;

          products.forEach((p: any) => {
            const stockVal = Number(p.stock) || 0;
            if (stockVal === 0) {
              outOfStock++;
            } else if (p.status === "draft") {
              drafted++;
            } else {
              published++;
            }
          });

          const publishedPct = totalListings > 0 ? Math.round((published / totalListings) * 100) : 0;
          const draftedPct = totalListings > 0 ? Math.round((drafted / totalListings) * 100) : 0;
          const outOfStockPct = totalListings > 0 ? Math.round((outOfStock / totalListings) * 100) : 0;

          return {
            totalListings,
            published,
            publishedPct,
            drafted,
            draftedPct,
            outOfStock,
            outOfStockPct,
            activeListings: published,
            lowStockCount: 0,
            outOfStockCount: outOfStock,
          };
        }
      }
    } catch {}

    return {
      totalListings: 0,
      published: 0,
      publishedPct: 0,
      drafted: 0,
      draftedPct: 0,
      outOfStock: 0,
      outOfStockPct: 0,
      activeListings: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    };
  },
};
