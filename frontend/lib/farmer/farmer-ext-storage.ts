/**
 * Farmer Extended Profile Storage & Utilities
 * Handles structured data for Active Crops, Signature Land Ledger, Farm Gallery, and Verified Reviews.
 * Seamlessly synchronizes with Supabase DB story column and LocalStorage fallback.
 */

export interface ActiveCrop {
  id: string;
  name: string;
  photoUrl: string;
  landAcres: number;
  season: string;
  method: string;
  lastYieldKg: string;
}

export interface GalleryPhoto {
  url: string;
  caption: string;
  subcaption: string;
}

export interface FarmerReview {
  id: string;
  buyerName: string;
  buyerLocation: string;
  rating: number;
  comment: string;
}

export interface FarmerExtData {
  storyPreview?: string;
  altitudeM?: string;
  crops?: ActiveCrop[];
  galleryPhotos?: GalleryPhoto[];
  reviews?: FarmerReview[];
}

const META_REGEX = /<!--PRAJNAA_META:([\s\S]*?)-->/;

/**
 * Serializes story with structured metadata payload
 */
export function serializeFarmerStoryWithMeta(rawStory: string, meta: FarmerExtData): string {
  const cleanStory = (rawStory || "").replace(META_REGEX, "").trim();
  const payloadStr = JSON.stringify(meta);
  return `${cleanStory}\n\n<!--PRAJNAA_META:${payloadStr}-->`;
}

/**
 * Extracts metadata payload and clean story from text
 */
export function parseFarmerStoryAndMeta(rawStory: string | null | undefined): {
  cleanStory: string;
  meta: FarmerExtData | null;
} {
  if (!rawStory) {
    return { cleanStory: "", meta: null };
  }

  const match = rawStory.match(META_REGEX);
  let meta: FarmerExtData | null = null;

  if (match && match[1]) {
    try {
      meta = JSON.parse(match[1]);
    } catch (e) {
      console.warn("[farmer-ext-storage] Failed to parse embedded metadata:", e);
    }
  }

  const cleanStory = rawStory.replace(META_REGEX, "").trim();
  return { cleanStory, meta };
}

/**
 * Read from localStorage with multi-key fallback
 */
export function getFarmerLocalExt(idOrSlug: string): FarmerExtData | null {
  if (typeof window === "undefined" || !idOrSlug) return null;
  try {
    const raw = localStorage.getItem(`prajnaa_farmer_ext_${idOrSlug}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("[farmer-ext-storage] localStorage read error:", e);
  }
  return null;
}

/**
 * Write to localStorage
 */
export function saveFarmerLocalExt(idOrSlug: string, meta: FarmerExtData): void {
  if (typeof window === "undefined" || !idOrSlug) return null as any;
  try {
    localStorage.setItem(`prajnaa_farmer_ext_${idOrSlug}`, JSON.stringify(meta));
  } catch (e) {
    console.warn("[farmer-ext-storage] localStorage write error:", e);
  }
}

/**
 * Resolve full extended metadata by checking DB column, embedded story meta, and localStorage
 */
export function resolveFarmerExtData(dbFarmer: any, fallbackFarmer?: any): FarmerExtData {
  if (!dbFarmer) {
    return {
      storyPreview: fallbackFarmer?.storyPreview || "",
      altitudeM: fallbackFarmer?.altitudeM || "",
      crops: fallbackFarmer?.crops || [],
      galleryPhotos: fallbackFarmer?.farmPhotos || [],
      reviews: fallbackFarmer?.reviews || [],
    };
  }

  const farmerId = String(dbFarmer.id || "");
  const farmerSlug = String(dbFarmer.slug || "");

  // 1. Check local storage
  const localById = farmerId ? getFarmerLocalExt(farmerId) : null;
  const localBySlug = farmerSlug ? getFarmerLocalExt(farmerSlug) : null;
  const localMeta = localById || localBySlug;

  // 2. Check embedded story meta
  const { meta: storyMeta } = parseFarmerStoryAndMeta(dbFarmer.story);

  // 3. Check direct DB properties if any exist
  const dbCrops = Array.isArray(dbFarmer.crops_data) ? dbFarmer.crops_data : null;
  const dbGallery = Array.isArray(dbFarmer.gallery_photos) ? dbFarmer.gallery_photos : null;
  const dbReviews = Array.isArray(dbFarmer.reviews_data) ? dbFarmer.reviews_data : null;
  const dbStoryPreview = dbFarmer.story_preview || null;

  // Merge with priority: direct DB columns > story embedded meta > localStorage > fallback
  const crops: ActiveCrop[] =
    dbCrops ||
    storyMeta?.crops ||
    localMeta?.crops ||
    fallbackFarmer?.crops ||
    [];

  const galleryPhotos: GalleryPhoto[] =
    dbGallery ||
    storyMeta?.galleryPhotos ||
    localMeta?.galleryPhotos ||
    fallbackFarmer?.farmPhotos ||
    [];

  const reviews: FarmerReview[] =
    dbReviews ||
    storyMeta?.reviews ||
    localMeta?.reviews ||
    fallbackFarmer?.reviews ||
    [];

  const storyPreview: string =
    dbStoryPreview ||
    storyMeta?.storyPreview ||
    localMeta?.storyPreview ||
    fallbackFarmer?.storyPreview ||
    "";

  const altitudeM: string =
    dbFarmer.altitude ||
    storyMeta?.altitudeM ||
    localMeta?.altitudeM ||
    fallbackFarmer?.altitudeM ||
    "";

  return {
    storyPreview,
    altitudeM,
    crops,
    galleryPhotos,
    reviews,
  };
}
