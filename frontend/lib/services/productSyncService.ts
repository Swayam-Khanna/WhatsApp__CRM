import { supabase } from "@/integrations/supabase/client";

export const PRODUCT_STORAGE_KEY = "prajnaa_custom_products";
export const PRODUCT_SYNC_CHANNEL = "prajnaa_products_sync";

export interface CustomProductPayload {
  id?: string;
  slug?: string;
  name: string;
  farmer_id?: string;
  user_id?: string;
  category: string;
  description?: string | null;
  price: number;
  stock?: number;
  unit?: string;
  images: string[];
  status?: string;
  hsn_code?: string | null;
  gst_applicable?: boolean;
  gst_rate?: number;
  is_preorder?: boolean;
  badges?: any[];
  created_at?: string;
  updated_at?: string;
  farmer_profiles?: {
    slug?: string;
    full_name?: string;
    village?: string;
    state?: string;
  };
}

/**
 * Sanitization and auto-repair helper for stored custom products
 */
export function sanitizeStoredCustomProducts(rawList: any[]): any[] {
  if (!Array.isArray(rawList)) return [];

  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const sanitized: any[] = [];

  for (let i = 0; i < rawList.length; i++) {
    const p = rawList[i];
    if (!p || typeof p !== "object") continue;

    let slug = typeof p.slug === "string" ? p.slug.trim() : "";
    if (slug === "undefined" || slug === "null") slug = "";

    let name = typeof p.name === "string" ? p.name.trim() : "";
    if (!name && slug) name = slug.replace(/-/g, " ");

    let id = typeof p.id === "string" ? p.id.trim() : "";
    if (!id || id === "undefined" || id === "null") {
      id = slug ? `prod_${slug}` : `prod_${i}_${Date.now()}`;
    }

    if (!slug) {
      slug = (name ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : id).slice(0, 50);
    }

    // Collision detection: ensure every stored product has a distinct primary key
    if (seenIds.has(id)) {
      id = `${id}_${i}_${Math.random().toString(36).slice(2, 6)}`;
    }
    if (seenSlugs.has(slug)) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    seenIds.add(id);
    seenSlugs.add(slug);

    sanitized.push({
      ...p,
      id,
      slug,
      name: name || "Prajnaa Produce",
    });
  }

  return sanitized;
}

/**
 * Retrieve custom products saved in localStorage
 */
export function getStoredCustomProducts(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRODUCT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const cleaned = sanitizeStoredCustomProducts(parsed);
    if (JSON.stringify(cleaned) !== raw) {
      localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (err) {
    console.warn("[ProductSync] Failed to read stored products:", err);
    return [];
  }
}

/**
 * Persist or update a product in localStorage and broadcast across all tabs
 */
export function saveStoredCustomProduct(product: any): void {
  if (typeof window === "undefined" || !product) return;
  try {
    const current = getStoredCustomProducts();
    const targetId = typeof product.id === "string" ? product.id.trim() : "";
    const targetSlug = typeof product.slug === "string" ? product.slug.trim() : "";

    // Check if product already exists by exact non-empty id or slug
    const existingIndex = current.findIndex(
      (p) =>
        Boolean(targetId && p.id && p.id === targetId) ||
        Boolean(targetSlug && p.slug && p.slug === targetSlug)
    );

    let updated: any[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...product,
        id: updated[existingIndex].id || targetId,
        updated_at: new Date().toISOString(),
      };
    } else {
      const ensuredId = targetId || (targetSlug ? `prod_${targetSlug}` : `prod_${Date.now()}`);
      // Prepend so newest appears first
      updated = [
        {
          ...product,
          id: ensuredId,
          created_at: product.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...current,
      ];
    }

    const cleaned = sanitizeStoredCustomProducts(updated);
    localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(cleaned));
    localStorage.setItem("prajnaa_products_last_sync", Date.now().toString());

    // Broadcast update across windows & tabs
    broadcastProductUpdate({
      type: existingIndex >= 0 ? "UPDATED" : "CREATED",
      product,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn("[ProductSync] Failed to persist product to localStorage:", err);
  }
}

/**
 * Remove a custom product from localStorage and broadcast
 */
export function deleteStoredCustomProduct(productIdOrSlug: string): void {
  if (typeof window === "undefined" || !productIdOrSlug) return;
  try {
    const current = getStoredCustomProducts();
    const filtered = current.filter(
      (p) => p.id !== productIdOrSlug && p.slug !== productIdOrSlug
    );
    localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(filtered));
    localStorage.setItem("prajnaa_products_last_sync", Date.now().toString());

    broadcastProductUpdate({
      type: "DELETED",
      productIdOrSlug,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn("[ProductSync] Failed to delete product from localStorage:", err);
  }
}

/**
 * Broadcast an event via BroadcastChannel, window CustomEvent, and localStorage trigger
 */
export function broadcastProductUpdate(eventData: any): void {
  if (typeof window === "undefined") return;

  // 1. BroadcastChannel for cross-tab sync
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const bc = new BroadcastChannel(PRODUCT_SYNC_CHANNEL);
      bc.postMessage(eventData);
      setTimeout(() => {
        try {
          bc.close();
        } catch {}
      }, 500);
    } catch {}
  }

  // 2. Window CustomEvent for same-tab reactive UI
  try {
    window.dispatchEvent(
      new CustomEvent("prajnaa_product_updated", { detail: eventData })
    );
  } catch {}
}

/**
 * Subscribe to cross-tab and in-tab product synchronization events
 */
export function subscribeToProductUpdates(onUpdate: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      bc = new BroadcastChannel(PRODUCT_SYNC_CHANNEL);
      bc.onmessage = () => {
        onUpdate();
      };
    } catch {}
  }

  const handleCustomEvent = () => {
    onUpdate();
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === PRODUCT_STORAGE_KEY || e.key === "prajnaa_products_last_sync") {
      onUpdate();
    }
  };

  window.addEventListener("prajnaa_product_updated", handleCustomEvent);
  window.addEventListener("storage", handleStorage);

  return () => {
    if (bc) {
      try {
        bc.close();
      } catch {}
    }
    window.removeEventListener("prajnaa_product_updated", handleCustomEvent);
    window.removeEventListener("storage", handleStorage);
  };
}

/**
 * Fallback image helper ensuring Next.js never encounters empty src strings
 */
export function resolveSafeProductImage(image?: string | null, category?: string): string {
  if (image && typeof image === "string" && image.trim().length > 0) {
    return image.trim();
  }
  switch (category) {
    case "spices":
      return "/assets/prod-turmeric.jpg";
    case "pickles":
      return "/assets/prod-pickle.jpg";
    case "salts":
      return "/assets/prod-salt.jpg";
    case "seeds":
      return "/assets/prod-seeds.jpg";
    case "masalas":
      return "/assets/prod-masala.jpg";
    case "dry-fruits":
    default:
      return "/assets/cat-dryfruits.jpg";
  }
}

/**
 * Standardize any product object (from Firestore, Supabase, or localStorage)
 * into the customer shop `Product` interface.
 */
export function formatStoreProduct(p: any, inventoryOverride?: any): any {
  if (!p) return null;

  const isPre = Boolean(
    p.is_preorder ||
    p.isPreorder ||
    (Array.isArray(p.badges) &&
      p.badges.some((b: any) =>
        typeof b === "string"
          ? b.toLowerCase().includes("pre-order") || b.toLowerCase().includes("preorder")
          : (b.label || b.text || "").toLowerCase().includes("pre-order") ||
            (b.label || b.text || "").toLowerCase().includes("preorder")
      ))
  );

  const rawImages: string[] = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  const primaryImage = resolveSafeProductImage(rawImages[0] || p.image, p.category);
  const safeImages = rawImages.length > 0 ? rawImages : [primaryImage];

  const farmerProfile = p.farmer_profiles || p.farmer || null;
  const farmerName = farmerProfile?.full_name || farmerProfile?.name || p.farmer_name || "Verified Local Farmer";
  const farmerLocation = farmerProfile?.village && farmerProfile?.state
    ? `${farmerProfile.village}, ${farmerProfile.state}`
    : farmerProfile?.village || farmerProfile?.state || p.farmer_location || "Himalayan Region";

  // Authoritative Stock & Pre-order Resolution from live inventory
  let resolvedStock = p.stock !== undefined && p.stock !== null && !isNaN(Number(p.stock)) ? Number(p.stock) : 100;
  let resolvedPreorder = isPre;

  if (inventoryOverride) {
    resolvedStock = Number(inventoryOverride.quantity ?? resolvedStock);
    if (inventoryOverride.preorder_enabled !== undefined) {
      resolvedPreorder = Boolean(inventoryOverride.preorder_enabled);
    }
  } else if (typeof window !== "undefined") {
    try {
      const rawInv = localStorage.getItem("prajnaa_product_inventory") || localStorage.getItem("prajnaa_inventory");
      if (rawInv) {
        const invList = JSON.parse(rawInv);
        if (Array.isArray(invList)) {
          const rec = invList.find((r: any) =>
            (p.id && (r.product_id === p.id || r.product_slug === p.id)) ||
            (p.slug && (r.product_id === p.slug || r.product_slug === p.slug)) ||
            (p.name && r.product_name && r.product_name.trim().toLowerCase() === p.name.trim().toLowerCase())
          );
          if (rec) {
            resolvedStock = Number(rec.quantity ?? 0);
            if (rec.preorder_enabled !== undefined) {
              resolvedPreorder = Boolean(rec.preorder_enabled);
            }
          }
        }
      }
    } catch {}
  }

  return {
    id: p.id || p.slug,
    slug: p.slug || p.id,
    name: p.name || "Prajnaa Produce",
    category: p.category || "dry-fruits",
    farmerSlug: farmerProfile?.slug || p.farmerSlug || "lakshmi-devi",
    image: primaryImage,
    images: safeImages,
    price: Math.ceil(Number(p.price || 0) * 1.1), // 10% commission addition
    mrp: p.mrp ? Math.ceil(Number(p.mrp) * 1.1) : undefined,
    weight: p.unit || p.weight || "unit",
    stock: resolvedStock,
    rating: Number(p.rating || 4.8),
    reviews: Number(p.reviews || 0),
    description: p.description || "",
    badges: Array.isArray(p.badges) ? p.badges : [],
    is_preorder: resolvedPreorder,
    preOrder: {
      enabled: resolvedPreorder,
      status: "OPEN",
      reservationNote: p.reservation_note || p.reservationNote,
    },
    farmerName,
    farmerLocation,
    status: p.status || "published",
    created_at: p.created_at,
  };
}
