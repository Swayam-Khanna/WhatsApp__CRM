import { supabase } from "@/integrations/supabase/client";
import { categories } from "@/lib/mock/categories";
import type {
  Coupon,
  CouponType,
  CouponApplyTo,
  CouponStatus,
  CouponRedemption,
  CartForCoupon,
  CouponValidationResult,
  AppliedCouponDiscount,
} from "./types";

// Seed coupons matching old Wix store and Prajna promotional campaigns
export const SEED_COUPONS: Coupon[] = [
  {
    id: "coupon_welcome10",
    code: "WELCOME10",
    name: "Welcome 10% Off",
    type: "percent_off",
    value: 10,
    buyQty: null,
    getQty: null,
    applyTo: "entire_order",
    categoryId: null,
    itemIds: null,
    applyOncePerOrder: false,
    includeSubscriptions: true,
    startDate: "2025-01-01T00:00:00.000Z",
    endDate: null,
    totalUseLimit: 5000,
    perCustomerLimit: 1,
    timesUsed: 1284,
    tags: ["welcome", "storefront", "first-order"],
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "coupon_harvest250",
    code: "HARVEST250",
    name: "Harvest Season Flat ₹250 Off",
    type: "amount_off",
    value: 250,
    buyQty: null,
    getQty: null,
    applyTo: "entire_order",
    categoryId: null,
    itemIds: null,
    applyOncePerOrder: false,
    includeSubscriptions: true,
    startDate: "2025-02-01T00:00:00.000Z",
    endDate: null,
    totalUseLimit: 1000,
    perCustomerLimit: 2,
    timesUsed: 312,
    tags: ["harvest", "festive", "flat-off"],
    createdAt: "2025-02-01T00:00:00.000Z",
    updatedAt: "2025-02-01T00:00:00.000Z",
  },
  {
    id: "coupon_freeship",
    code: "FREESHIP",
    name: "Zero Shipping Delivery",
    type: "free_shipping",
    value: null,
    buyQty: null,
    getQty: null,
    applyTo: "entire_order",
    categoryId: null,
    itemIds: null,
    applyOncePerOrder: false,
    includeSubscriptions: true,
    startDate: "2025-01-15T00:00:00.000Z",
    endDate: null,
    totalUseLimit: null,
    perCustomerLimit: 3,
    timesUsed: 980,
    tags: ["shipping", "all-orders"],
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
  },
  {
    id: "coupon_honeyspecial",
    code: "HONEY150",
    name: "Pure Mountain Honey Flash Price ₹150",
    type: "sale_price",
    value: 150,
    buyQty: null,
    getQty: null,
    applyTo: "specific_category",
    categoryId: "honey",
    itemIds: null,
    applyOncePerOrder: false,
    includeSubscriptions: false,
    startDate: "2025-03-01T00:00:00.000Z",
    endDate: null,
    totalUseLimit: 200,
    perCustomerLimit: 1,
    timesUsed: 45,
    tags: ["honey", "flash-sale", "special-price"],
    createdAt: "2025-03-01T00:00:00.000Z",
    updatedAt: "2025-03-01T00:00:00.000Z",
  },
  {
    id: "coupon_bogofruits",
    code: "BOGOFRUITS",
    name: "Buy 2 Get 1 Free on Dry Fruits",
    type: "bogo",
    value: null,
    buyQty: 2,
    getQty: 1,
    applyTo: "specific_category",
    categoryId: "dry-fruits",
    itemIds: null,
    applyOncePerOrder: false,
    includeSubscriptions: false,
    startDate: "2025-03-10T00:00:00.000Z",
    endDate: null,
    totalUseLimit: 500,
    perCustomerLimit: 2,
    timesUsed: 88,
    tags: ["bogo", "dry-fruits", "promotion"],
    createdAt: "2025-03-10T00:00:00.000Z",
    updatedAt: "2025-03-10T00:00:00.000Z",
  },
  {
    id: "coupon_diwali2025",
    code: "DIWALI2025",
    name: "Diwali 2025 Festival Offer",
    type: "percent_off",
    value: 15,
    buyQty: null,
    getQty: null,
    applyTo: "entire_order",
    categoryId: null,
    itemIds: null,
    applyOncePerOrder: false,
    includeSubscriptions: true,
    startDate: "2025-10-01T00:00:00.000Z",
    endDate: "2025-11-15T23:59:59.000Z",
    totalUseLimit: 5000,
    perCustomerLimit: 1,
    timesUsed: 4210,
    tags: ["diwali", "seasonal", "holiday"],
    createdAt: "2025-10-01T00:00:00.000Z",
    updatedAt: "2025-10-01T00:00:00.000Z",
  },
];

// In-memory runtime persistence
const runtimeCoupons = new Map<string, Coupon>();
const runtimeRedemptions: CouponRedemption[] = [];
SEED_COUPONS.forEach((c) => runtimeCoupons.set(c.id, c));

/**
 * Computes derived/runtime status of a coupon based on current time.
 */
export function computeCouponStatus(coupon: Coupon, now = new Date()): CouponStatus {
  const startMs = new Date(coupon.startDate).getTime();
  const nowMs = now.getTime();

  if (!isNaN(startMs) && nowMs < startMs) {
    return "scheduled";
  }

  if (coupon.endDate) {
    const endMs = new Date(coupon.endDate).getTime();
    if (!isNaN(endMs) && nowMs > endMs) {
      return "expired";
    }
  }

  return "active";
}

/**
 * Formats a coupon's discount for display in tables and badges.
 * Examples: "₹100.00 OFF", "20% OFF", "Free Shipping", "Now ₹499", "Buy 2 Get 1 Free"
 */
export function formatCouponDiscountLabel(coupon: Partial<Coupon>): string {
  switch (coupon.type) {
    case "amount_off":
      return `₹${Number(coupon.value || 0).toLocaleString("en-IN")} OFF`;
    case "percent_off":
      return `${coupon.value || 0}% OFF`;
    case "free_shipping":
      return "Free Shipping";
    case "sale_price":
      return `Now ₹${Number(coupon.value || 0).toLocaleString("en-IN")}`;
    case "bogo":
      return `Buy ${coupon.buyQty || 1} Get ${coupon.getQty || 1} Free`;
    default:
      return "Discount";
  }
}

/**
 * Formats the "Applies To" subtext for the admin table.
 */
export function formatCouponAppliesToLabel(coupon: Partial<Coupon>): string {
  let base = "All items";
  if (coupon.applyTo === "specific_category") {
    const cat = categories.find((c) => c.slug === coupon.categoryId);
    base = `Category: ${cat ? cat.name : coupon.categoryId || "Selected"}`;
  } else if (coupon.applyTo === "specific_items") {
    const count = coupon.itemIds?.length || 0;
    base = `${count} specific ${count === 1 ? "product" : "products"}`;
  }

  if (coupon.applyOncePerOrder) {
    return `${base} · Lowest-priced item only`;
  }
  return base;
}

/**
 * Helper to get Server Admin Firestore DB if available.
 */
async function getServerAdminDb(): Promise<any> {
  return null;
}

/**
 * Core validation and discount calculation engine.
 * Validates in strict order with distinct error messages:
 * 1. Code exists
 * 2. Within startDate/endDate
 * 3. totalUseLimit not exceeded
 * 4. perCustomerLimit not exceeded for this customer
 * 5. Cart contains at least one eligible item
 * 6. Subscriptions inclusion check
 */
export function applyCoupon(
  coupon: Coupon | null | undefined,
  cart: CartForCoupon,
  customerId?: string,
  redemptionsHistory: CouponRedemption[] = runtimeRedemptions
): CouponValidationResult {
  // 1. Code exists
  if (!coupon) {
    return {
      valid: false,
      error: "Invalid coupon code. Please check and try again.",
    };
  }

  const now = new Date();
  const nowMs = now.getTime();

  // 2. Within startDate / endDate
  const startMs = new Date(coupon.startDate).getTime();
  if (!isNaN(startMs) && nowMs < startMs) {
    const formattedStart = new Date(coupon.startDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return {
      valid: false,
      error: `This promotional coupon is not active yet (starts on ${formattedStart}).`,
      coupon,
    };
  }

  if (coupon.endDate) {
    const endMs = new Date(coupon.endDate).getTime();
    if (!isNaN(endMs) && nowMs > endMs) {
      return {
        valid: false,
        error: "This coupon code has expired.",
        coupon,
      };
    }
  }

  // 3. totalUseLimit not exceeded
  if (coupon.totalUseLimit !== null && (coupon.timesUsed || 0) >= coupon.totalUseLimit) {
    return {
      valid: false,
      error: "This coupon has reached its maximum overall usage limit.",
      coupon,
    };
  }

  // 4. perCustomerLimit not exceeded for this customer
  if (coupon.perCustomerLimit !== null && customerId) {
    const customerUses = (redemptionsHistory || []).filter(
      (r) => r.couponId === coupon.id && r.customerId === customerId
    ).length;

    if (customerUses >= coupon.perCustomerLimit) {
      return {
        valid: false,
        error: `You have already used this coupon the maximum allowed times (${coupon.perCustomerLimit} per customer).`,
        coupon,
      };
    }
  }

  // 5. Cart contains at least one eligible item
  if (!cart.items || cart.items.length === 0) {
    return {
      valid: false,
      error: "Your cart is empty. Add items to apply a coupon.",
      coupon,
    };
  }

  let eligibleItems = cart.items;
  if (coupon.applyTo === "specific_category" && coupon.categoryId) {
    const targetCat = coupon.categoryId.toLowerCase().trim();
    eligibleItems = cart.items.filter((item) => {
      const itemCat = (item.category || "").toLowerCase().trim();
      const slugCat = (item.slug || "").toLowerCase();
      return itemCat === targetCat || slugCat.includes(targetCat);
    });
  } else if (coupon.applyTo === "specific_items" && coupon.itemIds && coupon.itemIds.length > 0) {
    const allowed = new Set(coupon.itemIds.map((id) => id.toLowerCase()));
    eligibleItems = cart.items.filter((item) => {
      const s = (item.slug || "").toLowerCase();
      const bs = (item.baseSlug || "").toLowerCase();
      return allowed.has(s) || allowed.has(bs);
    });
  }

  if (eligibleItems.length === 0) {
    let contextMsg = "Your cart does not contain any eligible items for this coupon.";
    if (coupon.applyTo === "specific_category") {
      const catObj = categories.find((c) => c.slug === coupon.categoryId);
      contextMsg = `This coupon applies only to items in the "${catObj?.name || coupon.categoryId}" category.`;
    } else if (coupon.applyTo === "specific_items") {
      contextMsg = "This coupon is valid only on specific promotional products not present in your cart.";
    }
    return {
      valid: false,
      error: contextMsg,
      coupon,
    };
  }

  // 6. Subscriptions check
  if (cart.isSubscriptionOrder && !coupon.includeSubscriptions) {
    return {
      valid: false,
      error: "This coupon is not valid on subscription orders.",
      coupon,
    };
  }

  // Calculation phase
  const cartSubtotal = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
  const eligibleSubtotal = eligibleItems.reduce((s, i) => s + i.price * i.qty, 0);
  const currentShipping =
    cart.shippingCost !== undefined
      ? cart.shippingCost
      : cartSubtotal > 999 || cartSubtotal === 0
      ? 0
      : 49;

  let discountAmount = 0;
  let freeShipping = false;
  let breakdown = "";

  switch (coupon.type) {
    case "amount_off": {
      const flatOff = Number(coupon.value || 0);
      if (coupon.applyOncePerOrder) {
        // Apply only to the single cheapest eligible item line
        const cheapest = [...eligibleItems].sort((a, b) => a.price - b.price)[0];
        discountAmount = Math.min(cheapest.price, flatOff);
        breakdown = `₹${discountAmount} off lowest-priced eligible item (${cheapest.name})`;
      } else {
        discountAmount = Math.min(eligibleSubtotal, flatOff);
        breakdown = `₹${discountAmount} flat discount off eligible harvest items`;
      }
      break;
    }

    case "percent_off": {
      const pct = Math.min(100, Math.max(0, Number(coupon.value || 0)));
      if (coupon.applyOncePerOrder) {
        const cheapest = [...eligibleItems].sort((a, b) => a.price - b.price)[0];
        discountAmount = Math.round(cheapest.price * (pct / 100) * 100) / 100;
        breakdown = `${pct}% off lowest-priced eligible item (${cheapest.name})`;
      } else {
        discountAmount = Math.round(eligibleSubtotal * (pct / 100) * 100) / 100;
        breakdown = `${pct}% off eligible harvest subtotal`;
      }
      break;
    }

    case "free_shipping": {
      freeShipping = true;
      discountAmount = currentShipping;
      breakdown = "Free standard delivery applied";
      break;
    }

    case "sale_price": {
      const targetSalePrice = Number(coupon.value || 0);
      if (coupon.applyOncePerOrder) {
        const higherItems = eligibleItems
          .filter((i) => i.price > targetSalePrice)
          .sort((a, b) => a.price - b.price);

        if (higherItems.length > 0) {
          const cheapestHigher = higherItems[0];
          discountAmount = cheapestHigher.price - targetSalePrice;
          breakdown = `Special sale price of ₹${targetSalePrice} applied to 1x ${cheapestHigher.name}`;
        } else {
          discountAmount = 0;
          breakdown = "Eligible items are already at or below the promotional sale price";
        }
      } else {
        let totalSavings = 0;
        let discountedCount = 0;
        eligibleItems.forEach((item) => {
          if (item.price > targetSalePrice) {
            totalSavings += (item.price - targetSalePrice) * item.qty;
            discountedCount += item.qty;
          }
        });
        discountAmount = totalSavings;
        breakdown =
          totalSavings > 0
            ? `Special sale price of ₹${targetSalePrice} applied to ${discountedCount} item(s)`
            : "Eligible items are already at or below the promotional sale price";
      }
      break;
    }

    case "bogo": {
      const buyQty = Math.max(1, Number(coupon.buyQty || 1));
      const getQty = Math.max(1, Number(coupon.getQty || 1));
      const chunkSize = buyQty + getQty;

      // Expand eligible items into individual unit prices
      const unitPrices: number[] = [];
      eligibleItems.forEach((item) => {
        for (let q = 0; q < item.qty; q++) {
          unitPrices.push(item.price);
        }
      });

      // Sort price descending
      unitPrices.sort((a, b) => b - a);

      const fullChunks = Math.floor(unitPrices.length / chunkSize);
      if (fullChunks === 0) {
        return {
          valid: false,
          error: `Buy ${buyQty} Get ${getQty} Free requires adding at least ${chunkSize} eligible items to your cart (currently ${unitPrices.length}).`,
          coupon,
        };
      }

      let bogoSavings = 0;
      for (let c = 0; c < fullChunks; c++) {
        const chunk = unitPrices.slice(c * chunkSize, (c + 1) * chunkSize);
        // Discount the cheapest getQty items in each chunk
        const freeItems = chunk.slice(chunk.length - getQty);
        for (const p of freeItems) {
          bogoSavings += p;
        }
      }

      discountAmount = bogoSavings;
      breakdown = `Buy ${buyQty} Get ${getQty} Free applied (${fullChunks * getQty} item(s) free)`;
      break;
    }
  }

  const finalShipping = freeShipping ? 0 : currentShipping;
  const newSubtotal = Math.max(0, cartSubtotal - (coupon.type === "free_shipping" ? 0 : discountAmount));
  const newTotal = newSubtotal + finalShipping;

  return {
    valid: true,
    coupon,
    discount: {
      discountAmount,
      freeShipping,
      breakdown,
      eligibleItemCount: eligibleItems.reduce((s, i) => s + i.qty, 0),
      newSubtotal,
      newShipping: finalShipping,
      newTotal,
    },
  };
}

/**
 * Retrieve all coupons from all sources (Firestore Admin, Supabase, Memory Store, Seeds).
 */
export async function getAllCoupons(searchQuery?: string): Promise<Coupon[]> {
  const map = new Map<string, Coupon>();

  // 1. Seeds
  SEED_COUPONS.forEach((c) => map.set(c.id, c));

  // 2. Runtime memory store
  runtimeCoupons.forEach((c) => map.set(c.id, c));

  // 3. Firestore Admin DB on server
  try {
    const adminDb = await getServerAdminDb();
    if (adminDb) {
      const snap = await adminDb.collection("coupons").get();
      if (!snap.empty) {
        snap.docs.forEach((doc: any) => {
          const c = doc.data() as Coupon;
          map.set(c.id, c);
          runtimeCoupons.set(c.id, c);
        });
      }
    }
  } catch (e) {
    // Ignored
  }

  // 4. Supabase DB
  try {
    const { data } = await supabase.from("coupons").select("*");
    if (data && data.length > 0) {
      data.forEach((row: any) => {
        const c: Coupon = {
          id: row.id,
          code: (row.code || "").toUpperCase(),
          name: row.name,
          type: row.type,
          value: row.value !== undefined ? row.value : null,
          buyQty: row.buy_qty !== undefined ? row.buy_qty : null,
          getQty: row.get_qty !== undefined ? row.get_qty : null,
          applyTo: row.apply_to || "entire_order",
          categoryId: row.category_id || null,
          itemIds: row.item_ids || null,
          applyOncePerOrder: !!row.apply_once_per_order,
          includeSubscriptions: row.include_subscriptions !== false,
          startDate: row.start_date || new Date().toISOString(),
          endDate: row.end_date || null,
          totalUseLimit: row.total_use_limit !== undefined ? row.total_use_limit : null,
          perCustomerLimit: row.per_customer_limit !== undefined ? row.per_customer_limit : null,
          timesUsed: row.times_used || 0,
          tags: row.tags || [],
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString(),
        };
        map.set(c.id, c);
        runtimeCoupons.set(c.id, c);
      });
    }
  } catch (e) {
    // Ignored
  }

  let list = Array.from(map.values()).map((c) => ({
    ...c,
    status: computeCouponStatus(c),
  }));

  if (searchQuery && searchQuery.trim().length > 0) {
    const s = searchQuery.toLowerCase().trim();
    list = list.filter((c) => {
      return (
        c.code.toLowerCase().includes(s) ||
        c.name.toLowerCase().includes(s) ||
        c.tags.some((t) => t.toLowerCase().includes(s))
      );
    });
  }

  // Sort: newest created first
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return list;
}

/**
 * Retrieve coupon by ID.
 */
export async function getCouponById(id: string): Promise<Coupon | null> {
  const all = await getAllCoupons();
  const found = all.find((c) => c.id === id);
  return found || null;
}

/**
 * Retrieve coupon by CODE (case-insensitive).
 */
export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const cleanCode = (code || "").trim().toUpperCase();
  if (!cleanCode) return null;

  const all = await getAllCoupons();
  const found = all.find((c) => c.code.toUpperCase() === cleanCode);
  return found || null;
}

/**
 * Create a new coupon. Validates unique uppercase code.
 */
export async function createCoupon(data: {
  code: string;
  name: string;
  type: CouponType;
  value?: number | null;
  buyQty?: number | null;
  getQty?: number | null;
  applyTo?: CouponApplyTo;
  categoryId?: string | null;
  itemIds?: string[] | null;
  applyOncePerOrder?: boolean;
  includeSubscriptions?: boolean;
  startDate?: string;
  endDate?: string | null;
  totalUseLimit?: number | null;
  perCustomerLimit?: number | null;
  tags?: string[];
}): Promise<Coupon> {
  const cleanCode = (data.code || "").trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("Coupon code is required.");
  }
  if (!data.name || data.name.trim().length === 0) {
    throw new Error("Coupon display name is required.");
  }

  // Check code uniqueness
  const existing = await getCouponByCode(cleanCode);
  if (existing) {
    throw new Error(`A coupon with code "${cleanCode}" already exists.`);
  }

  const now = new Date().toISOString();
  const id = `coupon_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Clean values based on type
  let value: number | null = data.value !== undefined ? data.value : null;
  let buyQty: number | null = null;
  let getQty: number | null = null;

  if (data.type === "free_shipping") {
    value = null;
  } else if (data.type === "bogo") {
    value = null;
    buyQty = data.buyQty || 1;
    getQty = data.getQty || 1;
  }

  const newCoupon: Coupon = {
    id,
    code: cleanCode,
    name: data.name.trim(),
    type: data.type,
    value,
    buyQty,
    getQty,
    applyTo: data.applyTo || "entire_order",
    categoryId: data.applyTo === "specific_category" ? data.categoryId || null : null,
    itemIds: data.applyTo === "specific_items" ? data.itemIds || [] : null,
    applyOncePerOrder: !!data.applyOncePerOrder,
    includeSubscriptions: data.includeSubscriptions !== false,
    startDate: data.startDate || now,
    endDate: data.endDate || null,
    totalUseLimit: data.totalUseLimit ?? null,
    perCustomerLimit: data.perCustomerLimit ?? null,
    timesUsed: 0,
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: now,
    updatedAt: now,
  };

  runtimeCoupons.set(id, newCoupon);

  // Write to Server Firestore Admin
  try {
    const adminDb = await getServerAdminDb();
    if (adminDb) {
      await adminDb.collection("coupons").doc(id).set(newCoupon);
    }
  } catch (e) {
    // Ignored
  }

  // Write to Supabase
  try {
    await supabase.from("coupons").insert({
      id,
      code: cleanCode,
      name: newCoupon.name,
      type: newCoupon.type,
      value: newCoupon.value,
      buy_qty: newCoupon.buyQty,
      get_qty: newCoupon.getQty,
      apply_to: newCoupon.applyTo,
      category_id: newCoupon.categoryId,
      item_ids: newCoupon.itemIds,
      apply_once_per_order: newCoupon.applyOncePerOrder,
      include_subscriptions: newCoupon.includeSubscriptions,
      start_date: newCoupon.startDate,
      end_date: newCoupon.endDate,
      total_use_limit: newCoupon.totalUseLimit,
      per_customer_limit: newCoupon.perCustomerLimit,
      times_used: 0,
      tags: newCoupon.tags,
      created_at: now,
      updated_at: now,
    });
  } catch (e) {
    // Ignored
  }

  return {
    ...newCoupon,
    status: computeCouponStatus(newCoupon),
  };
}

/**
 * Update an existing coupon. Preserves timesUsed and createdAt.
 */
export async function updateCoupon(
  id: string,
  data: Partial<Coupon>
): Promise<Coupon> {
  const existing = await getCouponById(id);
  if (!existing) {
    throw new Error("Coupon not found.");
  }

  const cleanCode = data.code ? data.code.trim().toUpperCase() : existing.code;

  // If code changed, check uniqueness
  if (cleanCode !== existing.code) {
    const duplicate = await getCouponByCode(cleanCode);
    if (duplicate && duplicate.id !== id) {
      throw new Error(`A coupon with code "${cleanCode}" already exists.`);
    }
  }

  const now = new Date().toISOString();
  const targetType = data.type || existing.type;

  let value = data.value !== undefined ? data.value : existing.value;
  let buyQty = data.buyQty !== undefined ? data.buyQty : existing.buyQty;
  let getQty = data.getQty !== undefined ? data.getQty : existing.getQty;

  // Clean incompatible fields if type changed
  if (targetType === "free_shipping") {
    value = null;
    buyQty = null;
    getQty = null;
  } else if (targetType === "bogo") {
    value = null;
    buyQty = data.buyQty || existing.buyQty || 1;
    getQty = data.getQty || existing.getQty || 1;
  } else {
    buyQty = null;
    getQty = null;
  }

  const targetApplyTo = data.applyTo || existing.applyTo;

  const updated: Coupon = {
    ...existing,
    ...data,
    id,
    code: cleanCode,
    name: data.name !== undefined ? data.name.trim() : existing.name,
    type: targetType,
    value,
    buyQty,
    getQty,
    applyTo: targetApplyTo,
    categoryId: targetApplyTo === "specific_category" ? (data.categoryId ?? existing.categoryId) : null,
    itemIds: targetApplyTo === "specific_items" ? (data.itemIds ?? existing.itemIds) : null,
    applyOncePerOrder: data.applyOncePerOrder !== undefined ? data.applyOncePerOrder : existing.applyOncePerOrder,
    includeSubscriptions: data.includeSubscriptions !== undefined ? data.includeSubscriptions : existing.includeSubscriptions,
    startDate: data.startDate || existing.startDate,
    endDate: data.endDate !== undefined ? data.endDate : existing.endDate,
    totalUseLimit: data.totalUseLimit !== undefined ? data.totalUseLimit : existing.totalUseLimit,
    perCustomerLimit: data.perCustomerLimit !== undefined ? data.perCustomerLimit : existing.perCustomerLimit,
    tags: Array.isArray(data.tags) ? data.tags : existing.tags,
    timesUsed: existing.timesUsed, // strictly preserved
    createdAt: existing.createdAt, // strictly preserved
    updatedAt: now,
  };

  runtimeCoupons.set(id, updated);

  // Update in Server Firestore Admin
  try {
    const adminDb = await getServerAdminDb();
    if (adminDb) {
      await adminDb.collection("coupons").doc(id).set(updated, { merge: true });
    }
  } catch (e) {
    // Ignored
  }

  // Update in Supabase
  try {
    await supabase.from("coupons").update({
      code: cleanCode,
      name: updated.name,
      type: updated.type,
      value: updated.value,
      buy_qty: updated.buyQty,
      get_qty: updated.getQty,
      apply_to: updated.applyTo,
      category_id: updated.categoryId,
      item_ids: updated.itemIds,
      apply_once_per_order: updated.applyOncePerOrder,
      include_subscriptions: updated.includeSubscriptions,
      start_date: updated.startDate,
      end_date: updated.endDate,
      total_use_limit: updated.totalUseLimit,
      per_customer_limit: updated.perCustomerLimit,
      tags: updated.tags,
      updated_at: now,
    }).eq("id", id);
  } catch (e) {
    // Ignored
  }

  return {
    ...updated,
    status: computeCouponStatus(updated),
  };
}

/**
 * Delete a coupon without cascade-deleting redemptions or order history.
 */
export async function deleteCoupon(id: string): Promise<boolean> {
  runtimeCoupons.delete(id);

  try {
    const adminDb = await getServerAdminDb();
    if (adminDb) {
      await adminDb.collection("coupons").doc(id).delete();
    }
  } catch (e) {
    // Ignored
  }

  try {
    await supabase.from("coupons").delete().eq("id", id);
  } catch (e) {
    // Ignored
  }

  return true;
}

/**
 * Record a coupon redemption and increment timesUsed.
 */
export async function recordCouponRedemption(params: {
  couponId: string;
  customerId: string;
  orderId?: string;
}): Promise<CouponRedemption> {
  const now = new Date().toISOString();
  const redemptionId = `redemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const record: CouponRedemption = {
    id: redemptionId,
    couponId: params.couponId,
    customerId: params.customerId,
    orderId: params.orderId || null,
    redeemedAt: now,
  };

  runtimeRedemptions.push(record);

  // Increment timesUsed on the coupon
  const coupon = runtimeCoupons.get(params.couponId);
  if (coupon) {
    coupon.timesUsed = (coupon.timesUsed || 0) + 1;
    coupon.updatedAt = now;
  }

  // Update in Firestore Admin DB
  try {
    const adminDb = await getServerAdminDb();
    if (adminDb) {
      await adminDb.collection("coupon_redemptions").doc(redemptionId).set(record);
      if (coupon) {
        await adminDb.collection("coupons").doc(params.couponId).update({
          timesUsed: coupon.timesUsed,
          updatedAt: now,
        });
      }
    }
  } catch (e) {
    // Ignored
  }

  // Update in Supabase
  try {
    await supabase.from("coupon_redemptions").insert({
      id: redemptionId,
      coupon_id: params.couponId,
      customer_id: params.customerId,
      order_id: params.orderId || null,
      redeemed_at: now,
    });

    if (coupon) {
      await supabase
        .from("coupons")
        .update({ times_used: coupon.timesUsed, updated_at: now })
        .eq("id", params.couponId);
    }
  } catch (e) {
    // Ignored
  }

  return record;
}

/**
 * Get all redemptions for a coupon or customer.
 */
export async function getCouponRedemptions(couponId?: string, customerId?: string): Promise<CouponRedemption[]> {
  let list = [...runtimeRedemptions];

  try {
    let query = supabase.from("coupon_redemptions").select("*");
    if (couponId) query = query.eq("coupon_id", couponId);
    if (customerId) query = query.eq("customer_id", customerId);
    const { data } = await query;
    if (data && data.length > 0) {
      data.forEach((r: any) => {
        if (!list.some((existing) => existing.id === r.id)) {
          list.push({
            id: r.id,
            couponId: r.coupon_id,
            customerId: r.customer_id,
            orderId: r.order_id,
            redeemedAt: r.redeemed_at,
          });
        }
      });
    }
  } catch (e) {
    // Ignored
  }

  if (couponId) {
    list = list.filter((r) => r.couponId === couponId);
  }
  if (customerId) {
    list = list.filter((r) => r.customerId === customerId);
  }

  return list;
}
