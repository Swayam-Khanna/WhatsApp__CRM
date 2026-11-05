import { supabase } from "@/integrations/supabase/client";
import { productBySlug, products as mockProducts } from "@/lib/mock/products";
import { sanitizeSvgString } from "@/lib/utils/stage-icon-library";
import { isFarmerImage } from "@/components/harvest-journey/journey-image";
import type {
  HarvestJourneyModel,
  HarvestStageModel,
  HarvestUpdateModel,
  HarvestStageType,
  IconType,
  DbStageStatus,
} from "@/lib/types/harvest";

// 8 Canonical Standard Presets in strict lifecycle sequence:
// Sprout (0), Harvest (1), Sun Drying (2), Washing (3), Hand Sorting (4), Quality Check (5), Eco-Packaging (6), Dispatch (7)
export const DEFAULT_STAGE_TYPES: HarvestStageType[] = [
  { id: "00000000-0000-0000-0000-000000000001", name: "Sprout / Planting", icon_type: "preset", icon_value: "sprout", is_custom: false },
  { id: "00000000-0000-0000-0000-000000000002", name: "Harvest / Ripening", icon_type: "preset", icon_value: "leaf", is_custom: false },
  { id: "00000000-0000-0000-0000-000000000003", name: "Sun Drying", icon_type: "preset", icon_value: "sun", is_custom: false },
  { id: "00000000-0000-0000-0000-000000000004", name: "Washing / Processing", icon_type: "preset", icon_value: "droplets", is_custom: false },
  { id: "00000000-0000-0000-0000-000000000005", name: "Hand Sorting", icon_type: "preset", icon_value: "hand", is_custom: false },
  { id: "00000000-0000-0000-0000-000000000006", name: "Quality Check", icon_type: "preset", icon_value: "search", is_custom: false },
  { id: "00000000-0000-0000-0000-000000000007", name: "Eco-Packaging", icon_type: "preset", icon_value: "package", is_custom: false },
  { id: "00000000-0000-0000-0000-000000000008", name: "Dispatch / Shipping", icon_type: "preset", icon_value: "truck", is_custom: false },
];

export function isHarvestStage(stage: any): boolean {
  if (!stage) return false;
  const l = String(stage.label || stage.name || stage.title || "").toLowerCase();
  const id = String(stage.id || stage.key || "").toLowerCase();
  const icon = String(stage.icon || stage.icon_value || "").toLowerCase();
  return l.includes("harvest") || l.includes("ripen") || l.includes("pluck") || l.includes("pick") || id.includes("harvest") || icon === "leaf";
}

export function isSunDryingStage(stage: any): boolean {
  if (!stage) return false;
  const l = String(stage.label || stage.name || stage.title || "").toLowerCase();
  const id = String(stage.id || stage.key || "").toLowerCase();
  const icon = String(stage.icon || stage.icon_value || "").toLowerCase();
  return (
    (l.includes("sun") && l.includes("dry")) ||
    l.includes("drying") ||
    l.includes("solar") ||
    l.includes("curing") ||
    id.includes("sun") ||
    id.includes("dry") ||
    (icon === "sun" && !l.includes("harvest"))
  );
}

/**
 * Standard default lifecycle rank for canonical stage names.
 * Sprout (0), Harvest (1), Sun Drying (2), Washing (3), Hand Sorting (4), Quality Check (5), Eco-Packaging (6), Dispatch (7)
 */
export function getCanonicalStageDefaultRank(stage: any): number {
  if (!stage) return 999;
  const label = String(stage.label || stage.name || stage.title || "").toLowerCase().trim();
  const icon = String(stage.icon || stage.icon_value || "").toLowerCase().trim();
  const id = String(stage.id || stage.key || "").toLowerCase().trim();

  // 0: Sprout / Planting / Cultivation
  if (label.includes("sprout") || label.includes("seed") || label.includes("plant") || label.includes("cultivat") || label.includes("soil") || label.includes("bloom") || icon === "sprout" || id.includes("sprout") || id.includes("cultivat")) return 0;
  // 1: Harvest / Ripening / Plucking (strictly precedes drying)
  if (isHarvestStage(stage)) return 1;
  // 2: Sun Drying / Solar Drying / Natural Curing
  if (isSunDryingStage(stage)) return 2;
  // 3: Washing / Processing / Spring Water Cleaning
  if (label.includes("wash") || label.includes("water") || label.includes("clean") || icon === "droplets" || id.includes("wash")) return 3;
  // 4: Hand Sorting / Grading (includes common typos like "soting")
  if (label.includes("sort") || label.includes("soting") || label.includes("hand") || label.includes("grad") || icon === "hand" || id.includes("sort") || id.includes("sot")) return 4;
  // 5: Quality Check / Lab Testing / Purity
  if (label.includes("qual") || label.includes("check") || label.includes("test") || label.includes("lab") || label.includes("purity") || icon === "search" || id.includes("qual") || id.includes("check")) return 5;
  // 6: Eco-Packaging / Packing
  if (label.includes("pack") || label.includes("eco") || label.includes("pouch") || label.includes("box") || icon === "package" || id.includes("pack")) return 6;
  // 7: Dispatch / Shipping / In Transit
  if (label.includes("dispatch") || label.includes("ship") || label.includes("transit") || label.includes("deliver") || icon === "truck" || id.includes("dispatch") || id.includes("ship")) return 7;

  return 999;
}

/**
 * Single source of truth for ordering harvest journey stages.
 * Harvest MUST strictly precede Sun Drying.
 * Standard preset stages strictly follow the canonical lifecycle sequence:
 * Harvest (1) -> Sun Drying (2) -> Washing (3) -> Hand Sorting (4) -> Quality Check (5) -> Eco-Packaging (6) -> Dispatch (7).
 * Custom stages preserve relative position or created_at order.
 * Contiguous contiguous positions (0, 1, 2, ...) are guaranteed.
 */
export function getSortedJourneyStages<T = any>(stages: T[]): T[] {
  if (!Array.isArray(stages) || stages.length === 0) return [];

  const cloned = [...stages];

  cloned.sort((a: any, b: any) => {
    // 1. Explicit user-configured position / sort_order is the single source of truth
    const posA = typeof a.position === "number" ? a.position : (typeof a.sort_order === "number" ? a.sort_order : null);
    const posB = typeof b.position === "number" ? b.position : (typeof b.sort_order === "number" ? b.sort_order : null);

    if (posA !== null && posB !== null && posA !== posB) {
      return posA - posB;
    }
    if (posA !== null && posB === null) return -1;
    if (posA === null && posB !== null) return 1;

    // 2. Canonical lifecycle ranks for unpositioned standard stages
    const rankA = getCanonicalStageDefaultRank(a);
    const rankB = getCanonicalStageDefaultRank(b);

    if (rankA !== 999 && rankB !== 999 && rankA !== rankB) {
      return rankA - rankB;
    }
    if (rankA !== 999 && rankB === 999) return -1;
    if (rankA === 999 && rankB !== 999) return 1;

    // 3. Strict fallback invariant only when unpositioned: Harvest precedes Sun Drying
    const isHarvA = isHarvestStage(a);
    const isHarvB = isHarvestStage(b);
    const isSunA = isSunDryingStage(a);
    const isSunB = isSunDryingStage(b);
    if (isHarvA && isSunB) return -1;
    if (isSunA && isHarvB) return 1;

    // 4. Tie-breaker: created_at ASC
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (timeA && timeB && timeA !== timeB) {
      return timeA - timeB;
    }

    return 0;
  });

  // Assign contiguous 0, 1, 2, ... positions so all downstream consumers have pure contiguous numbers
  cloned.forEach((s: any, idx: number) => {
    s.position = idx;
    s.sort_order = idx;
  });

  return cloned;
}

// UUID generator and validator for PostgreSQL schema compliance
function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isValidUuid(val?: string | null): boolean {
  if (!val || typeof val !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val.trim());
}

// In-memory fallback stores for offline/local resilience (attached to globalThis for Next.js API route persistence)
const globalForHarvest = globalThis as unknown as {
  memoryJourneys?: Map<string, HarvestJourneyModel>;
  memoryStages?: Map<string, HarvestStageModel>;
  memoryUpdates?: Map<string, HarvestUpdateModel>;
  memoryStageTypes?: Map<string, HarvestStageType>;
};

const memoryJourneys = globalForHarvest.memoryJourneys || (globalForHarvest.memoryJourneys = new Map<string, HarvestJourneyModel>());
const memoryStages = globalForHarvest.memoryStages || (globalForHarvest.memoryStages = new Map<string, HarvestStageModel>());
const memoryUpdates = globalForHarvest.memoryUpdates || (globalForHarvest.memoryUpdates = new Map<string, HarvestUpdateModel>());
const memoryStageTypes = globalForHarvest.memoryStageTypes || (globalForHarvest.memoryStageTypes = new Map<string, HarvestStageType>());

if (memoryStageTypes.size === 0) {
  DEFAULT_STAGE_TYPES.forEach((t) => memoryStageTypes.set(t.id, t));
}

function getDbClient() {
  return supabase;
}

// Timeout wrapper with generous 8000ms duration
async function withTimeout<T = any>(promiseLike: any, ms = 8000): Promise<T> {
  return Promise.race([
    Promise.resolve(promiseLike),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Database query timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// LocalStorage helpers for bulletproof cross-reload persistence
function saveToLocalStorage(key: string, data: any) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("[HarvestJourney] LocalStorage save warning:", e);
    }
  }
}

function getFromLocalStorage<T = any>(key: string): T | null {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("[HarvestJourney] LocalStorage read warning:", e);
    }
  }
  return null;
}

function normalizeStageModel(s: any, journeyId: string, index: number = 0): HarvestStageModel {
  const stageId = String(s.id || s.key || `stg-${index}`).trim();
  const rawStatus = String(s.status || "").toLowerCase();
  const status: DbStageStatus =
    rawStatus === "completed" || rawStatus === "done"
      ? "done"
      : rawStatus === "in_progress" || rawStatus === "current"
      ? "current"
      : "upcoming";

  const rawImgs = Array.isArray(s.images) && s.images.length > 0
    ? s.images
    : Array.isArray(s.media) && s.media.length > 0
    ? s.media
    : s.image_url
    ? [s.image_url]
    : [];

  const imgs = rawImgs.filter((img: any) => typeof img === "string" && !isFarmerImage(img));

  const rawTransPhoto = s.transformation_photo_id !== undefined && s.transformation_photo_id !== null
    ? s.transformation_photo_id
    : (imgs.length > 0 ? imgs[0] : null);
  const transPhotoId = !isFarmerImage(rawTransPhoto) ? rawTransPhoto : (imgs.length > 0 ? imgs[0] : null);

  const showInTrans = s.show_in_transformation !== undefined
    ? Boolean(s.show_in_transformation)
    : true;

  const iconVal = s.icon_value || s.icon || "sun";
  const iconType = s.icon_type || (s.icon && ["sprout","sun","leaf","droplets","search","hand","package","truck"].includes(s.icon) ? "preset" : "library");

  const pos = typeof s.position === "number" ? s.position : (typeof s.sort_order === "number" ? s.sort_order : index);

  const primaryImage = (!isFarmerImage(s.image_url) ? s.image_url : null) || (imgs.length > 0 ? imgs[0] : null);

  return {
    id: stageId,
    journey_id: s.journey_id || journeyId,
    label: s.label || s.name || s.title || `Stage ${index + 1}`,
    icon: iconVal,
    icon_type: iconType as IconType,
    icon_value: iconVal,
    stage_type_id: s.stage_type_id || null,
    status,
    stage_date: s.stage_date || s.dateLabel || s.completedAt || s.startedAt || "",
    description: s.description || s.shortSummary || s.farmNote || "",
    image_url: primaryImage,
    images: imgs,
    media: imgs,
    transformation_photo_id: transPhotoId,
    show_in_transformation: showInTrans,
    position: pos,
    sort_order: pos,
    created_at: s.created_at || new Date().toISOString(),
    updated_at: s.updated_at || new Date().toISOString(),
  };
}

export const harvestJourneyService = {
  /**
   * Check if a product is marked as preorder and resolve its database UUID
   */
  async checkProductIsPreorder(productIdOrSlug: string): Promise<{
    exists: boolean;
    isPreorder: boolean;
    productId?: string;
    productName?: string;
    slug?: string;
    embeddedJourney?: HarvestJourneyModel | null;
    fromDb?: boolean;
    fromMock?: boolean;
  }> {
    const db = getDbClient();
    const cleanIdOrSlug = String(productIdOrSlug || "").trim();
    if (!cleanIdOrSlug) return { exists: false, isPreorder: false };

    try {
      // 1. Try finding by UUID first if cleanIdOrSlug is a UUID
      let data: any = null;
      let error: any = null;

      if (isValidUuid(cleanIdOrSlug)) {
        const idRes = await withTimeout(
          db.from("farmer_products").select("*").eq("id", cleanIdOrSlug).maybeSingle(),
          5000
        );
        data = idRes.data;
        error = idRes.error;
      }

      // 2. If not found or not UUID, try finding by slug
      if (!data) {
        const slugRes = await withTimeout(
          db.from("farmer_products").select("*").eq("slug", cleanIdOrSlug).maybeSingle(),
          5000
        );
        if (slugRes.data) {
          data = slugRes.data;
          error = null;
        }
      }

      // 3. If still not found, try matching by name
      if (!data) {
        const nameRes = await withTimeout(
          db.from("farmer_products").select("*").ilike("name", cleanIdOrSlug).maybeSingle(),
          5000
        );
        if (nameRes.data) {
          data = nameRes.data;
          error = null;
        }
      }

      if (data) {
        const isPre = Boolean(
          data.is_preorder ||
          data.isPreorder ||
          data.preOrder?.enabled ||
          (Array.isArray(data.badges) &&
            data.badges.some((b: any) =>
              typeof b === "string"
                ? b.toLowerCase().includes("pre-order") || b.toLowerCase().includes("preorder")
                : (b.label || b.text || "").toLowerCase().includes("pre-order")
            ))
        );

        return {
          exists: true,
          isPreorder: isPre,
          productId: data.id || cleanIdOrSlug,
          productName: data.name || "Product",
          slug: data.slug || cleanIdOrSlug,
          embeddedJourney: data.harvest_journey || null,
          fromDb: true,
        };
      }
    } catch (e) {
      // Fall through to mock/memory check
    }

    // 4. Check mock products if DB doesn't have it
    const mock =
      productBySlug(cleanIdOrSlug) ||
      mockProducts.find(
        (p) => p.slug === cleanIdOrSlug || (p as any).id === cleanIdOrSlug || p.slug.includes(cleanIdOrSlug)
      );

    if (mock) {
      const isPre = Boolean(
        (mock as any).is_preorder ||
        mock.preOrder?.enabled ||
        (Array.isArray(mock.badges) &&
          mock.badges.some((b) => b.toLowerCase().includes("pre-order") || b.toLowerCase().includes("preorder")))
      );
      return {
        exists: true,
        isPreorder: isPre,
        productId: (mock as any).id || mock.slug,
        productName: mock.name,
        slug: mock.slug,
        embeddedJourney: (mock as any).harvestJourney || (mock as any).harvest_journey || null,
        fromMock: true,
      };
    }

    // 5. Check LocalStorage & Memory Journey
    for (const j of memoryJourneys.values()) {
      if (j.product_id === cleanIdOrSlug) {
        return {
          exists: true,
          isPreorder: true,
          productId: j.product_id,
          productName: "Pre-Order Harvest",
          slug: cleanIdOrSlug,
        };
      }
    }

    const localCached =
      getFromLocalStorage<HarvestJourneyModel>(`prajnaa_harvest_journey_${cleanIdOrSlug}`) ||
      getFromLocalStorage<HarvestJourneyModel>(`harvest_journey_${cleanIdOrSlug}`);

    if (localCached) {
      return {
        exists: true,
        isPreorder: true,
        productId: localCached.product_id || cleanIdOrSlug,
        productName: "Pre-Order Harvest",
        slug: cleanIdOrSlug,
        embeddedJourney: localCached,
      };
    }

    return { exists: false, isPreorder: false };
  },

  /**
   * Fetch journey by product ID or slug including ordered stages and newest-first updates
   */
  async getJourneyByProductId(productIdOrSlug: string): Promise<HarvestJourneyModel | null> {
    const db = getDbClient();
    const cleanIdOrSlug = String(productIdOrSlug || "").trim();
    if (!cleanIdOrSlug) return null;

    const productCheck = await this.checkProductIsPreorder(cleanIdOrSlug);
    const candidateIds = Array.from(
      new Set([productCheck.productId, cleanIdOrSlug, productCheck.slug].filter(Boolean))
    ) as string[];

    // If candidateIds don't contain a valid UUID, attempt to resolve from farmer_products
    if (!candidateIds.some((id) => isValidUuid(id))) {
      try {
        const { data: p } = await withTimeout(
          db.from("farmer_products").select("id").or(`slug.eq.${cleanIdOrSlug},id.eq.${cleanIdOrSlug}`).maybeSingle(),
          3000
        );
        if (p?.id && isValidUuid(p.id)) {
          candidateIds.unshift(p.id);
        }
      } catch (e) {}
    }

    // 1. Check in-memory journeys first (fastest and holds live admin modifications in Node server process)
    for (const cand of candidateIds) {
      const memByCand = memoryJourneys.get(cand);
      if (memByCand) {
        const memStages = Array.from(memoryStages.values()).filter((s) => s.journey_id === memByCand.id);
        const resolvedStages = (memByCand.stages && memByCand.stages.length >= memStages.length)
          ? memByCand.stages
          : (memStages.length > 0 ? getSortedJourneyStages(memStages) : memByCand.stages || []);
        if (resolvedStages.length > 0) {
          return { ...memByCand, stages: resolvedStages };
        }
      }
    }
    for (const j of memoryJourneys.values()) {
      if (
        candidateIds.includes(j.product_id) ||
        ((j as any).slug && candidateIds.includes((j as any).slug)) ||
        candidateIds.some((c) => c && c === j.product_id)
      ) {
        const memStages = Array.from(memoryStages.values()).filter((s) => s.journey_id === j.id);
        const resolvedStages = (j.stages && j.stages.length >= memStages.length)
          ? j.stages
          : (memStages.length > 0 ? getSortedJourneyStages(memStages) : j.stages || []);
        if (resolvedStages.length > 0) {
          return { ...j, stages: resolvedStages };
        }
      }
    }

    // 2. If product has a verified embedded journey in DB farmer_products, return it
    if (
      productCheck.fromDb &&
      productCheck.embeddedJourney &&
      Array.isArray(productCheck.embeddedJourney.stages) &&
      productCheck.embeddedJourney.stages.length > 0
    ) {
      const jId = productCheck.embeddedJourney.id || `hj-${productCheck.productId || cleanIdOrSlug}`;
      const normStages = productCheck.embeddedJourney.stages.map((st: any, idx: number) =>
        normalizeStageModel(st, jId, idx)
      );
      const normalizedJourney: HarvestJourneyModel = {
        ...productCheck.embeddedJourney,
        id: jId,
        product_id: productCheck.productId || cleanIdOrSlug,
        stages: getSortedJourneyStages(normStages),
      };
      this.syncToLocalAndMemory(normalizedJourney, candidateIds);
      return normalizedJourney;
    }

    // 2. Query harvest_journeys table ONLY with valid UUIDs to prevent Postgres 22P02 errors
    const validUuidCandidates = candidateIds.filter((id) => isValidUuid(id));

    try {
      for (const targetId of validUuidCandidates) {
        const { data: journey, error } = await withTimeout(
          db.from("harvest_journeys").select("*").eq("product_id", targetId).maybeSingle(),
          5000
        );

        if (!error && journey && journey.id) {
          const [stagesRes, updatesRes] = await Promise.all([
            withTimeout(
              db
                .from("harvest_stages")
                .select("*")
                .eq("journey_id", journey.id)
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: true }),
              5000
            ),
            withTimeout(
              db
                .from("harvest_updates")
                .select("*")
                .eq("journey_id", journey.id)
                .order("created_at", { ascending: false }),
              5000
            ),
          ]);

          const rawStages = stagesRes.data || [];
          const memStagesForJourney = Array.from(memoryStages.values()).filter((s) => s.journey_id === journey.id);
          const combinedStages = [...rawStages];
          for (const ms of memStagesForJourney) {
            if (!combinedStages.some((rs) => rs.id === ms.id)) {
              combinedStages.push(ms);
            }
          }

          const normalizedStages = combinedStages.map((s: any) => {
            const memStage = memoryStages.get(s.id);
            const rawImgs = Array.isArray(memStage?.images) && memStage.images.length > 0
              ? memStage.images
              : Array.isArray(s.images) && s.images.length > 0
              ? s.images
              : Array.isArray(s.media) && s.media.length > 0
              ? s.media
              : s.image_url
              ? [s.image_url]
              : [];
            const imgs = rawImgs.filter((img: any) => typeof img === "string" && !isFarmerImage(img));
            const rawTransPhoto = memStage?.transformation_photo_id !== undefined
              ? memStage.transformation_photo_id
              : (s.transformation_photo_id !== undefined && s.transformation_photo_id !== null
                  ? s.transformation_photo_id
                  : (imgs.length > 0 ? imgs[0] : null));
            const transPhotoId = !isFarmerImage(rawTransPhoto) ? rawTransPhoto : (imgs.length > 0 ? imgs[0] : null);
            const showInTrans = memStage?.show_in_transformation !== undefined
              ? memStage.show_in_transformation
              : (s.show_in_transformation !== undefined ? s.show_in_transformation : true);
            const primaryImage = (!isFarmerImage(s.image_url) ? s.image_url : null) ||
              (!isFarmerImage(memStage?.image_url) ? memStage?.image_url : null) ||
              (imgs.length > 0 ? imgs[0] : null);

            return {
              ...s,
              ...(memStage || {}),
              images: imgs,
              media: imgs,
              image_url: primaryImage,
              transformation_photo_id: transPhotoId,
              show_in_transformation: showInTrans,
            };
          });

          const fullJourney: HarvestJourneyModel = {
            ...journey,
            stages: getSortedJourneyStages(normalizedStages),
            updates: updatesRes.data || [],
          };

          this.syncToLocalAndMemory(fullJourney, candidateIds);
          return fullJourney;
        }

      }
    } catch (e) {
      console.warn("[getJourneyByProductId] DB query note:", e);
    }

    // 3. LocalStorage persistence fallback (instant & cross-reload safe)
    for (const targetId of candidateIds) {
      const cached =
        getFromLocalStorage<HarvestJourneyModel>(`prajnaa_harvest_journey_${targetId}`) ||
        getFromLocalStorage<HarvestJourneyModel>(`harvest_journey_${targetId}`);
      if (cached && cached.id) {
        // If cached is only an incomplete 2-stage placeholder, check if mockProd has a richer journey
        const mockProdCandidate =
          productBySlug(cleanIdOrSlug) ||
          mockProducts.find(
            (p) =>
              p.slug === cleanIdOrSlug ||
              (p as any).id === cleanIdOrSlug ||
              candidateIds.includes(p.slug) ||
              candidateIds.includes((p as any).id)
          );
        const mockJ = (mockProdCandidate as any)?.harvestJourney || (mockProdCandidate as any)?.harvest_journey;
        if (
          mockJ &&
          Array.isArray(mockJ.stages) &&
          mockJ.stages.length > 2 &&
          (cached.batch_number?.startsWith("BATCH-") || !cached.batch_number) &&
          (cached.stages?.length || 0) <= 2
        ) {
          this.syncToLocalAndMemory(mockJ, candidateIds);
          return mockJ;
        }

        if (Array.isArray(cached.stages)) {
          cached.stages = getSortedJourneyStages(
            cached.stages.map((st: any, idx: number) => normalizeStageModel(st, cached.id, idx))
          );
        }
        this.syncToLocalAndMemory(cached, candidateIds);
        return cached;
      }
    }

    // 4. Memory fallback
    for (const j of memoryJourneys.values()) {
      if (candidateIds.includes(j.product_id) || candidateIds.some((c) => c === j.product_id)) {
        const stages = getSortedJourneyStages(
          Array.from(memoryStages.values()).filter((s) => s.journey_id === j.id)
        );
        const updates = Array.from(memoryUpdates.values())
          .filter((u) => u.journey_id === j.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return { ...j, stages, updates };
      }
    }

    // 5. Mock product fallback
    const mockProd =
      productBySlug(cleanIdOrSlug) ||
      mockProducts.find(
        (p) =>
          p.slug === cleanIdOrSlug ||
          (p as any).id === cleanIdOrSlug ||
          candidateIds.includes(p.slug) ||
          candidateIds.includes((p as any).id)
      );
    if (mockProd && ((mockProd as any).harvestJourney || (mockProd as any).harvest_journey)) {
      const mockJourney = (mockProd as any).harvestJourney || (mockProd as any).harvest_journey;
      if (mockJourney && Array.isArray(mockJourney.stages) && mockJourney.stages.length > 0) {
        const jId = mockJourney.id || `hj-${mockProd.slug}`;
        const normStages = mockJourney.stages.map((st: any, idx: number) =>
          normalizeStageModel(st, jId, idx)
        );
        const sortedStages = getSortedJourneyStages(normStages);
        const normalizedJourney: HarvestJourneyModel = {
          ...mockJourney,
          id: jId,
          product_id: (mockProd as any).id || mockProd.slug,
          current_stage_id: mockJourney.current_stage_id || mockJourney.currentStageId || null,
          batch_number: mockJourney.batch_number || mockJourney.batchInfo?.batchNumber || `BATCH-${new Date().getFullYear()}-01`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          stages: sortedStages,
        };
        this.syncToLocalAndMemory(normalizedJourney, candidateIds);
        return normalizedJourney;
      }
    }

    return null;
  },

  /**
   * Fetch journey by journey ID
   */
  async getJourneyById(journeyId: string): Promise<HarvestJourneyModel | null> {
    const db = getDbClient();
    const cleanJourneyId = String(journeyId || "").trim();
    if (!cleanJourneyId) return null;

    if (isValidUuid(cleanJourneyId)) {
      try {
        const { data: journey, error } = await withTimeout(
          db.from("harvest_journeys").select("*").eq("id", cleanJourneyId).maybeSingle(),
          5000
        );

        if (!error && journey) {
          const [stagesRes, updatesRes] = await Promise.all([
            withTimeout(
              db
                .from("harvest_stages")
                .select("*")
                .eq("journey_id", journey.id)
                .order("sort_order", { ascending: true }),
              5000
            ),
            withTimeout(
              db
                .from("harvest_updates")
                .select("*")
                .eq("journey_id", journey.id)
                .order("created_at", { ascending: false }),
              5000
            ),
          ]);

          const rawStages = stagesRes.data || [];
          const memStagesForJourney = Array.from(memoryStages.values()).filter((s) => s.journey_id === journey.id);
          const combinedStages = [...rawStages];
          for (const ms of memStagesForJourney) {
            if (!combinedStages.some((rs) => rs.id === ms.id)) {
              combinedStages.push(ms);
            }
          }

          const normalizedStages = combinedStages.map((s: any) => {
            const memStage = memoryStages.get(s.id);
            const rawImgs = Array.isArray(memStage?.images) && memStage.images.length > 0
              ? memStage.images
              : Array.isArray(s.images) && s.images.length > 0
              ? s.images
              : Array.isArray(s.media) && s.media.length > 0
              ? s.media
              : s.image_url
              ? [s.image_url]
              : [];
            const imgs = rawImgs.filter((img: any) => typeof img === "string" && !isFarmerImage(img));
            const rawTransPhoto = memStage?.transformation_photo_id !== undefined
              ? memStage.transformation_photo_id
              : (s.transformation_photo_id !== undefined && s.transformation_photo_id !== null
                  ? s.transformation_photo_id
                  : (imgs.length > 0 ? imgs[0] : null));
            const transPhotoId = !isFarmerImage(rawTransPhoto) ? rawTransPhoto : (imgs.length > 0 ? imgs[0] : null);
            const showInTrans = memStage?.show_in_transformation !== undefined
              ? memStage.show_in_transformation
              : (s.show_in_transformation !== undefined ? s.show_in_transformation : true);
            const primaryImage = (!isFarmerImage(s.image_url) ? s.image_url : null) ||
              (!isFarmerImage(memStage?.image_url) ? memStage?.image_url : null) ||
              (imgs.length > 0 ? imgs[0] : null);

            return {
              ...s,
              ...(memStage || {}),
              images: imgs,
              media: imgs,
              image_url: primaryImage,
              transformation_photo_id: transPhotoId,
              show_in_transformation: showInTrans,
            };
          });

          const fullJourney: HarvestJourneyModel = {
            ...journey,
            stages: getSortedJourneyStages(normalizedStages),
            updates: updatesRes.data || [],
          };

          this.syncToLocalAndMemory(fullJourney);
          return fullJourney;
        }
      } catch (e) {
        console.warn("[getJourneyById] DB query note:", e);
      }
    }

    // LocalStorage fallback
    const cached = getFromLocalStorage<HarvestJourneyModel>(`prajnaa_harvest_journey_id_${cleanJourneyId}`);
    if (cached) {
      if (Array.isArray(cached.stages)) {
        cached.stages = getSortedJourneyStages(
          cached.stages.map((st: any, idx: number) => normalizeStageModel(st, cached.id, idx))
        );
      }
      this.syncToLocalAndMemory(cached);
      return cached;
    }

    // Memory fallback
    const mem = memoryJourneys.get(cleanJourneyId);
    if (mem) {
      const memStages = Array.from(memoryStages.values()).filter((s) => s.journey_id === mem.id);
      const stages = (mem.stages && mem.stages.length >= memStages.length)
        ? mem.stages
        : (memStages.length > 0 ? getSortedJourneyStages(memStages) : mem.stages || []);
      const updates = Array.from(memoryUpdates.values())
        .filter((u) => u.journey_id === mem.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return { ...mem, stages, updates };
    }


    // Farmer products fallback (embedded journey in Supabase)
    try {
      const { data: prods } = await withTimeout(
        db.from("farmer_products").select("id, slug, harvest_journey").not("harvest_journey", "is", null),
        5000
      );
      if (prods && Array.isArray(prods)) {
        for (const p of prods) {
          const hj = p.harvest_journey as HarvestJourneyModel;
          if (
            hj &&
            (hj.id === cleanJourneyId ||
              `hj-${p.id}` === cleanJourneyId ||
              `hj-${p.slug}` === cleanJourneyId ||
              p.id === cleanJourneyId ||
              p.slug === cleanJourneyId)
          ) {
            const jId = hj.id || cleanJourneyId;
            const normStages = (hj.stages || []).map((st: any, idx: number) =>
              normalizeStageModel(st, jId, idx)
            );
            const normalized: HarvestJourneyModel = {
              ...hj,
              id: jId,
              product_id: hj.product_id || p.id || p.slug,
              stages: getSortedJourneyStages(normStages),
            };
            this.syncToLocalAndMemory(normalized, [p.slug, p.id].filter(Boolean));
            return normalized;
          }
        }
      }
    } catch (e) {}

    // Mock products fallback
    for (const mp of mockProducts) {
      const hj = (mp as any).harvestJourney || (mp as any).harvest_journey;
      if (
        hj &&
        (hj.id === cleanJourneyId ||
          `hj-${mp.slug}` === cleanJourneyId ||
          `hj-${(mp as any).id}` === cleanJourneyId ||
          mp.slug === cleanJourneyId ||
          (mp as any).id === cleanJourneyId)
      ) {
        const jId = hj.id || cleanJourneyId;
        const normStages = (hj.stages || []).map((st: any, idx: number) =>
          normalizeStageModel(st, jId, idx)
        );
        const sortedStages = getSortedJourneyStages(normStages);
        const fullMockJourney: HarvestJourneyModel = {
          ...hj,
          id: jId,
          product_id: (mp as any).id || mp.slug,
          current_stage_id: hj.current_stage_id || hj.currentStageId || null,
          batch_number: hj.batch_number || hj.batchInfo?.batchNumber || `BATCH-${new Date().getFullYear()}-01`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          stages: sortedStages,
        };
        this.syncToLocalAndMemory(fullMockJourney, [mp.slug, (mp as any).id].filter(Boolean));
        return fullMockJourney;
      }
    }

    return null;
  },

  /**
   * Create a new harvest journey for a product
   */
  async createJourney(
    productId: string,
    batchNumber?: string,
    initialStage?: { label: string; description?: string; icon?: string; image_url?: string },
    options?: { is_preorder?: boolean; product_name?: string; slug?: string }
  ): Promise<HarvestJourneyModel> {
    const cleanId = String(productId || "").trim();
    const productCheck = await this.checkProductIsPreorder(cleanId);
    if (productCheck.exists && !productCheck.isPreorder && !options?.is_preorder) {
      throw new Error("Cannot create a Harvest Journey for a product that is not marked as pre-order.");
    }

    const slug = productCheck.slug || options?.slug || cleanId;
    const db = getDbClient();
    const now = new Date().toISOString();

    // 1. Resolve true product UUID from farmer_products
    let targetProductUuid = productCheck.productId || cleanId;
    if (!isValidUuid(targetProductUuid)) {
      try {
        const { data: p } = await withTimeout(
          db.from("farmer_products").select("id").or(`slug.eq.${cleanId},id.eq.${cleanId},slug.eq.${slug}`).maybeSingle(),
          4000
        );
        if (p?.id && isValidUuid(p.id)) {
          targetProductUuid = p.id;
        }
      } catch (e) {}
    }

    const journeyUuid = generateUuid();
    let createdJourney: any = null;

    if (isValidUuid(targetProductUuid)) {
      // First check if a journey already exists for this product UUID
      try {
        const { data: existing } = await withTimeout(
          db.from("harvest_journeys").select("*").eq("product_id", targetProductUuid).maybeSingle(),
          4000
        );
        if (existing) {
          createdJourney = existing;
        }
      } catch (e) {}

      if (!createdJourney) {
        const journeyPayload = {
          id: journeyUuid,
          product_id: targetProductUuid,
          batch_number: batchNumber || `BATCH-${new Date().getFullYear()}-01`,
          updated_at: now,
        };

        try {
          const { data, error } = await withTimeout(
            db.from("harvest_journeys").insert(journeyPayload).select().single(),
            5000
          );

          if (!error && data) {
            createdJourney = data;
          }
        } catch (e) {
          console.warn("[createJourney] DB insert note:", e);
        }
      }
    }

    if (!createdJourney) {
      createdJourney = {
        id: journeyUuid,
        product_id: targetProductUuid,
        batch_number: batchNumber || `BATCH-${new Date().getFullYear()}-01`,
        created_at: now,
        updated_at: now,
      };
    }

    createdJourney.stages = [];
    createdJourney.updates = [];

    // Persist to memory and local storage
    this.syncToLocalAndMemory(createdJourney, [cleanId, targetProductUuid, slug]);

    // Only create an initial stage if explicitly provided in arguments
    if (initialStage && initialStage.label) {
      await this.createStage(createdJourney.id, {
        label: initialStage.label.trim(),
        description: initialStage.description || null,
        icon: initialStage.icon || "sun",
        image_url: initialStage.image_url || null,
        status: (initialStage as any).status || "upcoming",
        sort_order: 1,
      });
    }

    // Also synchronize back to farmer_products document
    await this.syncToFarmerProducts(targetProductUuid, createdJourney);

    return (await this.getJourneyById(createdJourney.id)) || createdJourney;
  },

  /**
   * Update journey metadata (e.g. batch_number, final_pack_photo_url, final_pack_caption)
   */
  async updateJourney(
    journeyId: string,
    updates: {
      batch_number?: string;
      final_pack_photo_url?: string | null;
      final_pack_caption?: string | null;
      transformation_order?: string[] | null;
      stages?: HarvestStageModel[];
      product_id?: string;
    }
  ): Promise<HarvestJourneyModel> {
    const db = getDbClient();
    const now = new Date().toISOString();
    const cleanJourneyId = String(journeyId || "").trim();

    if (isValidUuid(cleanJourneyId)) {
      try {
        const dbUpdates: any = { updated_at: now };
        if (updates.batch_number !== undefined) dbUpdates.batch_number = updates.batch_number;
        if (updates.final_pack_photo_url !== undefined) dbUpdates.final_pack_photo_url = updates.final_pack_photo_url;
        if (updates.final_pack_caption !== undefined) dbUpdates.final_pack_caption = updates.final_pack_caption;
        if (updates.transformation_order !== undefined) dbUpdates.transformation_order = updates.transformation_order;
        await withTimeout(
          db.from("harvest_journeys").update(dbUpdates).eq("id", cleanJourneyId),
          5000
        );
      } catch (e) {
        console.warn("[updateJourney] DB update note:", e);
      }
    }

    let current: HarvestJourneyModel | null | undefined = (await this.getJourneyById(cleanJourneyId)) || memoryJourneys.get(cleanJourneyId);
    if (!current && updates.product_id) {
      current = await this.getJourneyByProductId(updates.product_id);
    }
    if (!current) {
      current = await this.getJourneyByProductId(cleanJourneyId);
    }
    if (!current) {
      current = {
        id: cleanJourneyId,
        product_id: updates.product_id || cleanJourneyId,
        batch_number: updates.batch_number || `BATCH-${new Date().getFullYear()}-01`,
        created_at: now,
        updated_at: now,
        stages: [],
        updates: [],
      };
    }

    const updatedStages = updates.stages ? getSortedJourneyStages(updates.stages) : (current.stages || []);
    const updated: HarvestJourneyModel = {
      ...current,
      ...updates,
      stages: updatedStages,
      updated_at: now,
    };
    this.syncToLocalAndMemory(updated, [cleanJourneyId, updates.product_id, current.product_id].filter(Boolean) as string[]);
    if (updated.product_id) {
      await this.syncToFarmerProducts(updated.product_id, updated);
    }
    return updated;
  },

  /**
   * Add a stage to a journey
   */
  async createStage(
    journeyId: string,
    stageData: {
      label: string;
      icon?: string | null;
      icon_type?: IconType | null;
      icon_value?: string | null;
      stage_type_id?: string | null;
      status?: DbStageStatus;
      stage_date?: string | null;
      description?: string | null;
      image_url?: string | null;
      images?: string[];
      sort_order?: number;
      position?: number;
      transformation_photo_id?: string | null;
      show_in_transformation?: boolean;
      product_id?: string;
    }
  ): Promise<HarvestStageModel> {
    if (!stageData.label || !stageData.label.trim()) {
      throw new Error("Stage label / name is required");
    }

    const db = getDbClient();
    const cleanJourneyId = String(journeyId || "").trim();
    const status: DbStageStatus = stageData.status || "upcoming";

    if (status === "current") {
      await this.ensureSingleCurrentStage(cleanJourneyId);
    }

    let existingJourney = await this.getJourneyById(cleanJourneyId);
    if (!existingJourney && stageData.product_id) {
      existingJourney = await this.getJourneyByProductId(stageData.product_id);
    }
    if (!existingJourney) {
      existingJourney = await this.getJourneyByProductId(cleanJourneyId);
    }
    if (!existingJourney) {
      for (const j of memoryJourneys.values()) {
        if (j.id === cleanJourneyId || j.product_id === stageData.product_id || j.product_id === cleanJourneyId) {
          existingJourney = j;
          break;
        }
      }
    }
    if (!existingJourney) {
      existingJourney = {
        id: cleanJourneyId,
        product_id: stageData.product_id || cleanJourneyId,
        batch_number: `BATCH-${new Date().getFullYear()}-01`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        stages: [],
        updates: [],
      };
      this.syncToLocalAndMemory(existingJourney, [stageData.product_id, cleanJourneyId].filter(Boolean) as string[]);
    }

    let position = typeof stageData.position === "number" ? stageData.position : stageData.sort_order;
    if (position === undefined || position === null) {
      const maxPos = (existingJourney?.stages || []).reduce(
        (max, s) => Math.max(max, typeof s.position === "number" ? s.position : (s.sort_order || 0)),
        -1
      );
      position = maxPos + 1;
    }
    const sortOrder = position;

    const rawImages = Array.isArray(stageData.images) && stageData.images.length > 0
      ? stageData.images
      : stageData.image_url
      ? [stageData.image_url]
      : [];
    const stageImages = rawImages.filter((img: any) => typeof img === "string" && !isFarmerImage(img));
    const primaryImage = (!isFarmerImage(stageData.image_url) ? stageData.image_url : null) || stageImages[0] || null;
    const rawTransPhoto = stageData.transformation_photo_id !== undefined
      ? stageData.transformation_photo_id
      : (stageImages.length > 0 ? stageImages[0] : null);
    const transPhotoId = !isFarmerImage(rawTransPhoto) ? rawTransPhoto : (stageImages.length > 0 ? stageImages[0] : null);
    const showInTrans = stageData.show_in_transformation !== undefined
      ? Boolean(stageData.show_in_transformation)
      : true;

    const stageUuid = generateUuid();
    const now = new Date().toISOString();
    let newStage: HarvestStageModel | null = null;

    if (isValidUuid(cleanJourneyId)) {
      const stagePayload: any = {
        id: stageUuid,
        journey_id: cleanJourneyId,
        label: stageData.label.trim(),
        icon: stageData.icon || stageData.icon_value || null,
        icon_type: stageData.icon_type || "preset",
        icon_value: stageData.icon_value || stageData.icon || null,
        stage_type_id: stageData.stage_type_id || null,
        status,
        stage_date: stageData.stage_date || null,
        description: stageData.description || null,
        image_url: primaryImage,
        transformation_photo_id: transPhotoId,
        show_in_transformation: showInTrans,
        sort_order: sortOrder,
        updated_at: now,
      };

      try {
        const { data, error } = await withTimeout(
          db.from("harvest_stages").insert(stagePayload).select().single(),
          5000
        );
        if (!error && data) {
          newStage = {
            ...data,
            images: stageImages,
            media: stageImages,
            image_url: primaryImage,
            transformation_photo_id: transPhotoId,
            show_in_transformation: showInTrans,
          };
        }
      } catch (e) {
        console.warn("[createStage] DB insert note:", e);
      }
    }

    if (!newStage) {
      newStage = {
        id: stageUuid,
        journey_id: cleanJourneyId,
        label: stageData.label.trim(),
        icon: stageData.icon || stageData.icon_value || null,
        icon_type: stageData.icon_type || "preset",
        icon_value: stageData.icon_value || stageData.icon || null,
        stage_type_id: stageData.stage_type_id || null,
        status,
        stage_date: stageData.stage_date || null,
        description: stageData.description || null,
        image_url: primaryImage,
        images: stageImages,
        media: stageImages,
        transformation_photo_id: transPhotoId,
        show_in_transformation: showInTrans,
        position: position,
        sort_order: sortOrder,
        created_at: now,
        updated_at: now,
      };
    } else {
      newStage.position = position;
      newStage.sort_order = sortOrder;
      newStage.images = stageImages;
      newStage.media = stageImages;
      newStage.transformation_photo_id = transPhotoId;
      newStage.show_in_transformation = showInTrans;
    }

    memoryStages.set(newStage.id, newStage);

    // Update parent journey
    const currentList = existingJourney.stages || [];
    const updatedStages = [...currentList.filter((s) => s.id !== newStage!.id), newStage];
    const sortedStages = getSortedJourneyStages(updatedStages);
    const updatedJourney: HarvestJourneyModel = {
      ...existingJourney,
      stages: sortedStages,
      updated_at: now,
    };
    this.syncToLocalAndMemory(
      updatedJourney,
      [stageData.product_id, cleanJourneyId, existingJourney.product_id].filter(Boolean) as string[]
    );
    if (updatedJourney.product_id) {
      await this.syncToFarmerProducts(updatedJourney.product_id, updatedJourney);
    }

    return newStage;
  },

  /**
   * Update a stage
   */
  async updateStage(
    stageId: string,
    stageData: Partial<{
      label: string;
      icon: string | null;
      icon_type: IconType | null;
      icon_value: string | null;
      stage_type_id: string | null;
      status: DbStageStatus;
      stage_date: string | null;
      description: string | null;
      image_url: string | null;
      images: string[];
      sort_order: number;
      transformation_photo_id: string | null;
      show_in_transformation: boolean;
      journey_id?: string;
      product_id?: string;
    }>
  ): Promise<HarvestStageModel> {
    const db = getDbClient();
    const cleanStageId = String(stageId || "").trim();
    let currentStage: any = memoryStages.get(cleanStageId);

    // 1. Check harvest_stages DB table if valid UUID
    if (!currentStage && isValidUuid(cleanStageId)) {
      try {
        const { data } = await withTimeout(
          db.from("harvest_stages").select("*").eq("id", cleanStageId).maybeSingle(),
          5000
        );
        if (data) currentStage = data;
      } catch (e) {}
    }

    // 2. Look inside all memory journeys
    if (!currentStage) {
      for (const j of memoryJourneys.values()) {
        const found = (j.stages || []).find(
          (s) => s.id === cleanStageId || (s as any).key === cleanStageId
        );
        if (found) {
          currentStage = { ...found, journey_id: found.journey_id || j.id };
          break;
        }
      }
    }

    // 3. If journey_id was provided, fetch journey to search within it
    if (!currentStage && (stageData as any).journey_id) {
      const parentJ = await this.getJourneyById((stageData as any).journey_id);
      if (parentJ) {
        const found = (parentJ.stages || []).find(
          (s) =>
            s.id === cleanStageId ||
            (s as any).key === cleanStageId ||
            (s.label && s.label.toLowerCase() === (stageData.label || "").toLowerCase()) ||
            ((s as any).name && (s as any).name.toLowerCase() === (stageData.label || "").toLowerCase())
        );
        if (found) {
          currentStage = { ...found, journey_id: parentJ.id };
        }
      }
    }

    // 4. If product_id was provided, fetch journey by product
    if (!currentStage && (stageData as any).product_id) {
      const prodJ = await this.getJourneyByProductId((stageData as any).product_id);
      if (prodJ) {
        const found = (prodJ.stages || []).find(
          (s) =>
            s.id === cleanStageId ||
            (s as any).key === cleanStageId ||
            (s.label && s.label.toLowerCase() === (stageData.label || "").toLowerCase()) ||
            ((s as any).name && (s as any).name.toLowerCase() === (stageData.label || "").toLowerCase())
        );
        if (found) {
          currentStage = { ...found, journey_id: prodJ.id };
        }
      }
    }

    // 5. Check Supabase farmer_products embedded journeys
    if (!currentStage) {
      try {
        const { data: prods } = await withTimeout(
          db.from("farmer_products").select("id, slug, harvest_journey").not("harvest_journey", "is", null),
          5000
        );
        if (prods && Array.isArray(prods)) {
          for (const p of prods) {
            const hj = p.harvest_journey as HarvestJourneyModel;
            if (hj && Array.isArray(hj.stages)) {
              const found = hj.stages.find(
                (s: any) =>
                  s.id === cleanStageId ||
                  s.key === cleanStageId ||
                  (s.label && s.label.toLowerCase() === (stageData.label || "").toLowerCase()) ||
                  (s.name && s.name.toLowerCase() === (stageData.label || "").toLowerCase())
              );
              if (found) {
                const jId = hj.id || `hj-${p.id || p.slug}`;
                currentStage = normalizeStageModel(found, jId);
                const normStages = hj.stages.map((st: any, idx: number) =>
                  normalizeStageModel(st, jId, idx)
                );
                this.syncToLocalAndMemory({
                  ...hj,
                  id: jId,
                  product_id: hj.product_id || p.id || p.slug,
                  stages: normStages,
                });
                break;
              }
            }
          }
        }
      } catch (e) {}
    }

    // 6. Check mockProducts for any journey containing this stage
    if (!currentStage) {
      for (const mp of mockProducts) {
        const hj = (mp as any).harvestJourney || (mp as any).harvest_journey;
        if (hj && Array.isArray(hj.stages)) {
          const found = hj.stages.find(
            (s: any) =>
              s.id === cleanStageId ||
              s.key === cleanStageId ||
              (s.label && s.label.toLowerCase() === (stageData.label || "").toLowerCase()) ||
              (s.name && s.name.toLowerCase() === (stageData.label || "").toLowerCase())
          );
          if (found) {
            const jId = hj.id || `hj-${mp.slug}`;
            currentStage = normalizeStageModel(found, jId);
            const normStages = hj.stages.map((st: any, idx: number) =>
              normalizeStageModel(st, jId, idx)
            );
            const fullMockJourney: HarvestJourneyModel = {
              ...hj,
              id: jId,
              product_id: (mp as any).id || mp.slug,
              batch_number: hj.batch_number || `BATCH-${new Date().getFullYear()}-01`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              stages: normStages,
            };
            this.syncToLocalAndMemory(fullMockJourney, [mp.slug, (mp as any).id].filter(Boolean));
            break;
          }
        }
      }
    }

    // 7. If still not found, construct / adopt rather than failing with "Stage not found"
    if (!currentStage) {
      const fallbackJourneyId =
        (stageData as any).journey_id ||
        ((stageData as any).product_id ? (await this.getJourneyByProductId((stageData as any).product_id))?.id : null) ||
        Array.from(memoryJourneys.keys())[0] ||
        "hj-default";

      currentStage = {
        id: cleanStageId || `stg-${Date.now()}`,
        journey_id: fallbackJourneyId,
        label: stageData.label || "Harvest Stage",
        status: stageData.status || "upcoming",
        sort_order: stageData.sort_order ?? 0,
        images: stageData.images || [],
        media: stageData.images || [],
        transformation_photo_id: stageData.transformation_photo_id || null,
        show_in_transformation: stageData.show_in_transformation !== undefined ? stageData.show_in_transformation : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    const rawStatus = String(stageData.status || currentStage.status || "upcoming").toLowerCase();
    const normStatus: DbStageStatus =
      rawStatus === "completed" || rawStatus === "done"
        ? "done"
        : rawStatus === "in_progress" || rawStatus === "current"
        ? "current"
        : "upcoming";

    if (normStatus === "current" && currentStage.status !== "current") {
      await this.ensureSingleCurrentStage(currentStage.journey_id, cleanStageId);
    }

    const existingImages = (currentStage.images || (currentStage.image_url ? [currentStage.image_url] : []))
      .filter((img: any) => typeof img === "string" && !isFarmerImage(img));
    const nextImages = (stageData.images !== undefined
      ? stageData.images
      : existingImages).filter((img: any) => typeof img === "string" && !isFarmerImage(img));
    const primaryImage = stageData.image_url !== undefined
      ? (!isFarmerImage(stageData.image_url) ? stageData.image_url : null)
      : (nextImages.length > 0 ? nextImages[0] : (!isFarmerImage(currentStage.image_url) ? currentStage.image_url : null));

    // Transformation photo fallback logic:
    // If explicitly provided, use it.
    // If images changed and current transformation photo is deleted/missing, fall back to nextImages[0] or null.
    let nextTransPhotoId = !isFarmerImage(currentStage.transformation_photo_id) ? currentStage.transformation_photo_id : null;
    if (stageData.transformation_photo_id !== undefined) {
      nextTransPhotoId = !isFarmerImage(stageData.transformation_photo_id) ? stageData.transformation_photo_id : null;
    } else if (stageData.images !== undefined) {
      if (!nextTransPhotoId || !nextImages.includes(nextTransPhotoId)) {
        nextTransPhotoId = nextImages.length > 0 ? nextImages[0] : null;
      }
    } else if (!nextTransPhotoId && nextImages.length > 0) {
      nextTransPhotoId = nextImages[0];
    }

    const nextShowInTrans = stageData.show_in_transformation !== undefined
      ? Boolean(stageData.show_in_transformation)
      : (currentStage.show_in_transformation !== undefined ? Boolean(currentStage.show_in_transformation) : true);

    const now = new Date().toISOString();
    const payloadToDb: any = {
      ...stageData,
      status: normStatus,
      image_url: primaryImage,
      transformation_photo_id: nextTransPhotoId,
      show_in_transformation: nextShowInTrans,
      updated_at: now,
    };
    delete payloadToDb.images;
    delete payloadToDb.media;
    delete payloadToDb.journey_id;
    delete payloadToDb.product_id;

    if (isValidUuid(cleanStageId)) {
      try {
        await withTimeout(
          db.from("harvest_stages").update(payloadToDb).eq("id", cleanStageId),
          5000
        );
      } catch (e) {
        console.warn("[updateStage] DB update note:", e);
      }
    }

    const updated: HarvestStageModel = {
      ...currentStage,
      ...stageData,
      id: cleanStageId || currentStage.id,
      journey_id: currentStage.journey_id || (stageData as any).journey_id || "hj-default",
      status: normStatus,
      image_url: primaryImage,
      images: nextImages,
      media: nextImages,
      transformation_photo_id: nextTransPhotoId,
      show_in_transformation: nextShowInTrans,
      updated_at: now,
    };
    memoryStages.set(cleanStageId, updated);
    if (updated.id && updated.id !== cleanStageId) {
      memoryStages.set(updated.id, updated);
    }

    // Sync to parent journey
    const parentJourneyId = updated.journey_id || (stageData as any).journey_id;
    let parent = parentJourneyId ? await this.getJourneyById(parentJourneyId) : null;
    if (!parent && (stageData as any).product_id) {
      parent = await this.getJourneyByProductId((stageData as any).product_id);
    }
    if (!parent) {
      for (const j of memoryJourneys.values()) {
        if ((j.stages || []).some((s) => s.id === cleanStageId || s.id === updated.id)) {
          parent = j;
          break;
        }
      }
    }

    if (parent) {
      const existingStages = parent.stages || [];
      const hasStage = existingStages.some((s) => s.id === cleanStageId || s.id === updated.id);
      let updatedStages: HarvestStageModel[];
      if (hasStage) {
        updatedStages = existingStages.map((s) =>
          s.id === cleanStageId || s.id === updated.id ? updated : s
        );
      } else {
        updatedStages = [...existingStages, updated];
      }
      const sortedStages = getSortedJourneyStages(updatedStages);
      // Auto-resolve current_stage_id based on latest stage statuses
      const explicitCurrent = sortedStages.find((s) => s.status === "current");
      const firstUncompleted = sortedStages.find((s) => (s.status as string) !== "done" && (s.status as string) !== "completed");
      const nextCurrentId = explicitCurrent?.id || firstUncompleted?.id || (sortedStages.length > 0 ? sortedStages[sortedStages.length - 1]?.id : null);

      const updatedJourney: HarvestJourneyModel = {
        ...parent,
        current_stage_id: nextCurrentId,
        stages: sortedStages,
        updated_at: now,
      };
      (updatedJourney as any).currentStageId = nextCurrentId;
      this.syncToLocalAndMemory(updatedJourney);
      if (updatedJourney.product_id) {
        await this.syncToFarmerProducts(updatedJourney.product_id, updatedJourney);
      }
    }

    return updated;
  },

  /**
   * Delete a stage
   */
  async deleteStage(stageId: string): Promise<{ success: boolean }> {
    const db = getDbClient();
    const cleanStageId = String(stageId || "").trim();
    let stage: any = memoryStages.get(cleanStageId);

    if (!stage && isValidUuid(cleanStageId)) {
      try {
        const { data } = await withTimeout(
          db.from("harvest_stages").select("id, journey_id").eq("id", cleanStageId).maybeSingle(),
          5000
        );
        if (data) stage = data;
      } catch (e) {}
    }

    if (!stage) {
      for (const j of memoryJourneys.values()) {
        const found = (j.stages || []).find((s) => s.id === cleanStageId || (s as any).key === cleanStageId);
        if (found) {
          stage = found;
          break;
        }
      }
    }

    if (isValidUuid(cleanStageId)) {
      try {
        await withTimeout(db.from("harvest_stages").delete().eq("id", cleanStageId), 5000);
      } catch (e) {}
    }

    memoryStages.delete(cleanStageId);

    if (stage?.journey_id) {
      const parent = await this.getJourneyById(stage.journey_id);
      if (parent) {
        const updatedStages = (parent.stages || []).filter((s) => s.id !== cleanStageId);
        const sortedStages = getSortedJourneyStages(updatedStages);
        const updatedJourney: HarvestJourneyModel = {
          ...parent,
          stages: sortedStages,
          updated_at: new Date().toISOString(),
        };
        this.syncToLocalAndMemory(updatedJourney);
        if (updatedJourney.product_id) {
          await this.syncToFarmerProducts(updatedJourney.product_id, updatedJourney);
        }
      }
    }

    return { success: true };
  },

  /**
   * Reorder stages in a journey (Single source of truth: position)
   */
  async reorderStages(
    journeyId: string,
    orderList: Array<{ id: string; sort_order?: number; position?: number }>
  ): Promise<HarvestStageModel[]> {
    const db = getDbClient();
    const now = new Date().toISOString();
    const cleanJourneyId = String(journeyId || "").trim();

    for (let idx = 0; idx < orderList.length; idx++) {
      const item = orderList[idx];
      const pos = typeof item.position === "number" ? item.position : (typeof item.sort_order === "number" ? item.sort_order : idx);

      if (isValidUuid(item.id)) {
        try {
          await withTimeout(
            db.from("harvest_stages").update({ sort_order: pos, updated_at: now }).eq("id", item.id),
            3000
          );
        } catch (e) {}
      }

      const mem = memoryStages.get(item.id);
      if (mem) {
        mem.position = pos;
        mem.sort_order = pos;
        mem.updated_at = now;
        memoryStages.set(item.id, mem);
      }
    }

    let journey = await this.getJourneyById(cleanJourneyId);
    if (!journey) {
      journey = await this.getJourneyByProductId(cleanJourneyId);
    }
    if (!journey) {
      for (const j of memoryJourneys.values()) {
        if (j.id === cleanJourneyId || j.product_id === cleanJourneyId || (j as any).slug === cleanJourneyId) {
          journey = j;
          break;
        }
      }
    }

    if (journey) {
      const orderMap = new Map(
        orderList.map((o, idx) => [
          o.id,
          typeof o.position === "number" ? o.position : (typeof o.sort_order === "number" ? o.sort_order : idx)
        ])
      );
      const updatedStages = (journey.stages || []).map((s) => {
        const newPos = orderMap.has(s.id) ? orderMap.get(s.id)! : (typeof s.position === "number" ? s.position : s.sort_order);
        return {
          ...s,
          position: newPos,
          sort_order: newPos,
        };
      });
      const sortedStages = getSortedJourneyStages(updatedStages);
      for (const s of sortedStages) {
        memoryStages.set(s.id, s);
      }

      const updatedJourney: HarvestJourneyModel = {
        ...journey,
        stages: sortedStages,
        updated_at: now,
      };
      this.syncToLocalAndMemory(updatedJourney, [journey.product_id, (journey as any).slug].filter(Boolean));
      if (updatedJourney.product_id) {
        await this.syncToFarmerProducts(updatedJourney.product_id, updatedJourney);
      }
      return sortedStages;
    }

    return [];
  },

  /**
   * Add a short farm update to a journey
   */
  async createUpdate(
    journeyId: string,
    updateData: { text: string; author?: string }
  ): Promise<HarvestUpdateModel> {
    if (!updateData.text || !updateData.text.trim()) {
      throw new Error("Update text cannot be empty");
    }

    const db = getDbClient();
    const cleanJourneyId = String(journeyId || "").trim();
    const now = new Date().toISOString();
    const updateUuid = generateUuid();
    let newUpdate: HarvestUpdateModel | null = null;

    if (isValidUuid(cleanJourneyId)) {
      const payload = {
        id: updateUuid,
        journey_id: cleanJourneyId,
        text: updateData.text.trim(),
        author: updateData.author?.trim() || "Prajnaa Farm Desk",
        created_at: now,
      };

      try {
        const { data, error } = await withTimeout(
          db.from("harvest_updates").insert(payload).select().single(),
          5000
        );
        if (!error && data) {
          newUpdate = data;
        }
      } catch (e) {
        console.warn("[createUpdate] DB insert note:", e);
      }
    }

    if (!newUpdate) {
      newUpdate = {
        id: updateUuid,
        journey_id: cleanJourneyId,
        text: updateData.text.trim(),
        author: updateData.author?.trim() || "Prajnaa Farm Desk",
        created_at: now,
      };
    }

    memoryUpdates.set(newUpdate.id, newUpdate);

    const parent = await this.getJourneyById(cleanJourneyId);
    if (parent) {
      const updatedUpdates = [newUpdate, ...(parent.updates || []).filter((u) => u.id !== newUpdate!.id)];
      const updatedJourney: HarvestJourneyModel = {
        ...parent,
        updates: updatedUpdates,
        updated_at: now,
      };
      this.syncToLocalAndMemory(updatedJourney);
      if (updatedJourney.product_id) {
        await this.syncToFarmerProducts(updatedJourney.product_id, updatedJourney);
      }
    }

    return newUpdate;
  },

  /**
   * Delete an update
   */
  async deleteUpdate(updateId: string): Promise<{ success: boolean }> {
    const db = getDbClient();
    const cleanUpdateId = String(updateId || "").trim();
    let update: any = memoryUpdates.get(cleanUpdateId);

    if (!update && isValidUuid(cleanUpdateId)) {
      try {
        const { data } = await withTimeout(
          db.from("harvest_updates").select("id, journey_id").eq("id", cleanUpdateId).maybeSingle(),
          5000
        );
        update = data;
      } catch (e) {}
    }

    if (isValidUuid(cleanUpdateId)) {
      try {
        await withTimeout(db.from("harvest_updates").delete().eq("id", cleanUpdateId), 5000);
      } catch (e) {}
    }

    memoryUpdates.delete(cleanUpdateId);

    if (update?.journey_id) {
      const parent = await this.getJourneyById(update.journey_id);
      if (parent) {
        const updatedUpdates = (parent.updates || []).filter((u) => u.id !== cleanUpdateId);
        const updatedJourney: HarvestJourneyModel = {
          ...parent,
          updates: updatedUpdates,
          updated_at: new Date().toISOString(),
        };
        this.syncToLocalAndMemory(updatedJourney);
        if (updatedJourney.product_id) {
          await this.syncToFarmerProducts(updatedJourney.product_id, updatedJourney);
        }
      }
    }

    return { success: true };
  },

  /**
   * Ensure only one stage in a journey has status = 'current'
   */
  async ensureSingleCurrentStage(journeyId: string, exceptStageId?: string): Promise<void> {
    const db = getDbClient();
    const cleanJourneyId = String(journeyId || "").trim();
    const now = new Date().toISOString();

    if (isValidUuid(cleanJourneyId)) {
      try {
        let query = db
          .from("harvest_stages")
          .update({ status: "done", updated_at: now })
          .eq("journey_id", cleanJourneyId)
          .eq("status", "current");

        if (exceptStageId && isValidUuid(exceptStageId)) {
          query = query.neq("id", exceptStageId);
        }
        await withTimeout(query, 5000);
      } catch (e) {}
    }

    for (const [id, stage] of memoryStages.entries()) {
      if (stage.journey_id === cleanJourneyId && stage.status === "current" && id !== exceptStageId) {
        stage.status = "done";
        stage.updated_at = now;
        memoryStages.set(id, stage);
      }
    }
  },

  /**
   * Sync journey to memory maps and localStorage
   */
  syncToLocalAndMemory(journey: HarvestJourneyModel, aliases: string[] = []) {
    if (!journey || !journey.id) return;
    this.syncToMemoryOnly(journey, aliases);

    // Save to LocalStorage
    saveToLocalStorage(`prajnaa_harvest_journey_id_${journey.id}`, journey);
    if (journey.product_id) {
      saveToLocalStorage(`prajnaa_harvest_journey_${journey.product_id}`, journey);
    }
    for (const alias of aliases) {
      if (alias) {
        saveToLocalStorage(`prajnaa_harvest_journey_${alias}`, journey);
      }
    }
  },

  /**
   * Sync to in-memory maps only
   */
  syncToMemoryOnly(journey: HarvestJourneyModel, aliases: string[] = []) {
    if (!journey || !journey.id) return;
    memoryJourneys.set(journey.id, journey);
    if (journey.product_id) {
      memoryJourneys.set(journey.product_id, journey);
    }
    if ((journey as any).slug) {
      memoryJourneys.set((journey as any).slug, journey);
    }
    for (const alias of aliases) {
      if (alias) {
        memoryJourneys.set(alias, journey);
      }
    }

    if (Array.isArray(journey.stages)) {
      for (const s of journey.stages) {
        if (s.id) memoryStages.set(s.id, s);
      }
    }
    if (Array.isArray(journey.updates)) {
      for (const u of journey.updates) {
        if (u.id) memoryUpdates.set(u.id, u);
      }
    }

    // Also synchronize live into mockProducts references
    for (const mp of mockProducts) {
      if (
        (mp as any).id === journey.product_id ||
        mp.slug === journey.product_id ||
        aliases.includes(mp.slug) ||
        aliases.includes((mp as any).id) ||
        (mp as any).harvestJourney?.id === journey.id
      ) {
        (mp as any).harvestJourney = journey;
        (mp as any).harvest_journey = journey;
      }
    }
  },

  /**
   * Directly synchronize the harvest journey object into farmer_products document
   */
  async syncToFarmerProducts(productIdOrSlug: string, journey: HarvestJourneyModel): Promise<void> {
    const db = getDbClient();
    const cleanId = String(productIdOrSlug || "").trim();
    if (!cleanId) return;

    try {
      if (isValidUuid(cleanId)) {
        await withTimeout(
          db.from("farmer_products").update({ harvest_journey: journey }).eq("id", cleanId),
          5000
        );
      } else {
        await withTimeout(
          db.from("farmer_products").update({ harvest_journey: journey }).eq("slug", cleanId),
          5000
        );
      }
    } catch (e) {
      // Ignore schema column difference note
    }
  },

  // =========================================================================
  // STAGE TYPES (PRESETS & REUSABLE CUSTOM TYPES)
  // =========================================================================

  /**
   * Retrieve all stage types (Presets first, then custom types)
   */
  async getStageTypes(): Promise<HarvestStageType[]> {
    const db = getDbClient();
    let dbTypes: HarvestStageType[] = [];

    try {
      const { data, error } = await withTimeout(
        db
          .from("harvest_stage_types")
          .select("*")
          .order("is_custom", { ascending: true })
          .order("created_at", { ascending: true }),
        5000
      );
      if (!error && Array.isArray(data)) {
        dbTypes = data as HarvestStageType[];
      }
    } catch (e) {
      console.warn("[getStageTypes] DB fetch warning:", e);
    }

    // Merge with memory & local storage
    const localTypes = getFromLocalStorage<HarvestStageType[]>("prajnaa_harvest_stage_types") || [];
    const mergedMap = new Map<string, HarvestStageType>();

    // 1. Load 8 standard presets first
    DEFAULT_STAGE_TYPES.forEach((t) => mergedMap.set(t.id, t));

    // 2. Add local storage types
    localTypes.forEach((t) => mergedMap.set(t.id, t));

    // 3. Add memory types
    memoryStageTypes.forEach((t) => mergedMap.set(t.id, t));

    // 4. Add DB types
    dbTypes.forEach((t) => {
      mergedMap.set(t.id, t);
      memoryStageTypes.set(t.id, t);
    });

    const allTypes = Array.from(mergedMap.values());
    // Sort: presets first (is_custom false), then custom types by created_at
    allTypes.sort((a, b) => {
      if (!a.is_custom && b.is_custom) return -1;
      if (a.is_custom && !b.is_custom) return 1;
      return (a.created_at || "").localeCompare(b.created_at || "");
    });

    saveToLocalStorage("prajnaa_harvest_stage_types", allTypes);
    return allTypes;
  },

  /**
   * Create a new custom stage type
   */
  async createStageType(payload: {
    name: string;
    icon_type: IconType;
    icon_value: string;
    is_custom?: boolean;
    created_by?: string | null;
  }): Promise<HarvestStageType> {
    const rawName = String(payload.name || "").trim();
    if (!rawName) {
      throw new Error("Stage type name is required");
    }
    if (rawName.length > 40) {
      throw new Error("Stage type name cannot exceed 40 characters");
    }

    // Uniqueness validation (case-insensitive across presets and existing custom types)
    const existingTypes = await this.getStageTypes();
    const isDuplicate = existingTypes.some(
      (t) => t.name.trim().toLowerCase() === rawName.toLowerCase()
    );
    if (isDuplicate) {
      throw new Error(`A stage type named "${rawName}" already exists`);
    }

    const iconType: IconType = payload.icon_type || "library";
    let iconValue = String(payload.icon_value || "").trim();
    if (!iconValue) {
      throw new Error("Stage icon is required");
    }

    // Sanitize SVG if uploaded
    if (iconType === "upload" && (iconValue.startsWith("<svg") || iconValue.includes("image/svg"))) {
      iconValue = sanitizeSvgString(iconValue);
    }

    const typeUuid = generateUuid();
    const now = new Date().toISOString();
    const newType: HarvestStageType = {
      id: typeUuid,
      name: rawName,
      icon_type: iconType,
      icon_value: iconValue,
      is_custom: payload.is_custom !== undefined ? payload.is_custom : true,
      created_by: payload.created_by || "admin",
      created_at: now,
      updated_at: now,
    };

    const db = getDbClient();
    try {
      const { data, error } = await withTimeout(
        db.from("harvest_stage_types").insert(newType).select().single(),
        5000
      );
      if (!error && data) {
        Object.assign(newType, data);
      }
    } catch (e) {
      console.warn("[createStageType] DB insert note:", e);
    }

    memoryStageTypes.set(newType.id, newType);
    const updatedList = await this.getStageTypes();
    saveToLocalStorage("prajnaa_harvest_stage_types", updatedList);

    return newType;
  },

  /**
   * Update an existing custom stage type
   */
  async updateStageType(
    id: string,
    payload: Partial<{
      name: string;
      icon_type: IconType;
      icon_value: string;
    }>
  ): Promise<HarvestStageType> {
    const cleanId = String(id || "").trim();
    const existingTypes = await this.getStageTypes();
    const target = existingTypes.find((t) => t.id === cleanId);

    if (!target) {
      throw new Error("Stage type not found");
    }
    if (!target.is_custom) {
      throw new Error("Standard preset stage types cannot be edited");
    }

    if (payload.name) {
      const trimmed = payload.name.trim();
      if (!trimmed) throw new Error("Stage type name cannot be empty");
      if (trimmed.length > 40) throw new Error("Stage type name cannot exceed 40 characters");

      const duplicate = existingTypes.some(
        (t) => t.id !== cleanId && t.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Another stage type named "${trimmed}" already exists`);
      }
    }

    let iconVal = payload.icon_value !== undefined ? payload.icon_value.trim() : target.icon_value;
    if (payload.icon_type === "upload" && iconVal && (iconVal.startsWith("<svg") || iconVal.includes("image/svg"))) {
      iconVal = sanitizeSvgString(iconVal);
    }

    const now = new Date().toISOString();
    const updated: HarvestStageType = {
      ...target,
      name: payload.name ? payload.name.trim() : target.name,
      icon_type: payload.icon_type || target.icon_type,
      icon_value: iconVal || target.icon_value,
      updated_at: now,
    };

    const db = getDbClient();
    try {
      await withTimeout(
        db.from("harvest_stage_types").update({
          name: updated.name,
          icon_type: updated.icon_type,
          icon_value: updated.icon_value,
          updated_at: now,
        }).eq("id", cleanId),
        5000
      );
    } catch (e) {
      console.warn("[updateStageType] DB update note:", e);
    }

    memoryStageTypes.set(cleanId, updated);
    const refreshed = await this.getStageTypes();
    saveToLocalStorage("prajnaa_harvest_stage_types", refreshed);

    return updated;
  },

  /**
   * Delete a custom stage type (Safety guard: Preset types cannot be deleted.
   * In-use stages are safely preserved with fallback icon without breaking).
   */
  async deleteStageType(id: string): Promise<{ success: boolean; inUseCount: number; message: string }> {
    const cleanId = String(id || "").trim();
    const existingTypes = await this.getStageTypes();
    const target = existingTypes.find((t) => t.id === cleanId);

    if (!target) {
      throw new Error("Stage type not found");
    }
    if (!target.is_custom) {
      throw new Error("Standard preset stage types cannot be deleted");
    }

    // 1. Calculate how many stages are using this type
    let inUseCount = 0;
    for (const stage of memoryStages.values()) {
      if (
        stage.stage_type_id === cleanId ||
        (stage.label && stage.label.toLowerCase() === target.name.toLowerCase())
      ) {
        inUseCount++;
      }
    }

    const db = getDbClient();
    try {
      // Check DB usage count
      const { count } = await withTimeout(
        db
          .from("harvest_stages")
          .select("id", { count: "exact", head: true })
          .eq("stage_type_id", cleanId),
        5000
      );
      if (typeof count === "number") {
        inUseCount = Math.max(inUseCount, count);
      }

      // Safe unlink: set stage_type_id to null so existing stages are never broken
      await withTimeout(
        db.from("harvest_stages").update({ stage_type_id: null }).eq("stage_type_id", cleanId),
        5000
      );

      // Delete from harvest_stage_types table
      await withTimeout(
        db.from("harvest_stage_types").delete().eq("id", cleanId),
        5000
      );
    } catch (e) {
      console.warn("[deleteStageType] DB delete note:", e);
    }

    // Remove from memory and local storage
    memoryStageTypes.delete(cleanId);
    const refreshed = Array.from(memoryStageTypes.values());
    saveToLocalStorage("prajnaa_harvest_stage_types", refreshed);

    const message =
      inUseCount > 0
        ? `Stage type "${target.name}" deleted. ${inUseCount} existing stage(s) in use will continue to render safely.`
        : `Stage type "${target.name}" deleted successfully.`;

    return {
      success: true,
      inUseCount,
      message,
    };
  },

  /**
   * Safe-to-run-twice migration / repair function that assigns explicit `position`
   * (0, 1, 2, ...) to all stages in a journey.
   *
   * Canonical default order:
   * Sprout (0), Harvest (1), Sun Drying (2), Washing (3), Hand Sorting (4), Quality Check (5), Eco-Packaging (6), Dispatch (7)
   *
   * Custom stages keep their relative order and go after the default stage they follow.
   * For BATCH-2026-01: Harvest, Sun Drying, Sorting, Quality Check, Packing.
   */
  async assignPositionsToBatchStages(journeyId: string): Promise<HarvestStageModel[]> {
    const cleanId = String(journeyId || "").trim();
    const journey = await this.getJourneyById(cleanId);
    if (!journey || !Array.isArray(journey.stages) || journey.stages.length === 0) {
      return [];
    }

    const stages = getSortedJourneyStages(journey.stages);

    const db = getDbClient();
    const now = new Date().toISOString();

    // Assign 0-indexed contiguous positions
    const reorderedList = stages.map((s, idx) => ({
      id: s.id,
      position: idx,
      sort_order: idx,
    }));

    for (const item of reorderedList) {
      if (isValidUuid(item.id)) {
        try {
          await withTimeout(
            db.from("harvest_stages").update({ sort_order: item.sort_order, updated_at: now }).eq("id", item.id),
            3000
          );
        } catch (e) {}
      }

      const mem = memoryStages.get(item.id);
      if (mem) {
        mem.position = item.position;
        mem.sort_order = item.sort_order;
        mem.updated_at = now;
        memoryStages.set(item.id, mem);
      }
    }

    const updatedStages = stages.map((s, idx) => ({
      ...s,
      position: idx,
      sort_order: idx,
    }));

    const updatedJourney: HarvestJourneyModel = {
      ...journey,
      stages: updatedStages,
      updated_at: now,
    };

    this.syncToLocalAndMemory(updatedJourney);
    if (updatedJourney.product_id) {
      await this.syncToFarmerProducts(updatedJourney.product_id, updatedJourney);
    }

    return updatedStages;
  },
};
