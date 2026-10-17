import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";

/**
 * Robust helper to resolve farmer image paths from Supabase storage,
 * external URLs, or local fallback assets.
 */
export function resolveFarmerImage(url?: string | null): string {
  if (!url || typeof url !== "string" || !url.trim()) {
    return "/assets/farmer-1.jpg";
  }
  const trimmed = url.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  // Supabase storage path, e.g. "farmers/1234_abc.jpg" or "profiles/..."
  try {
    const bucket = "profiles";
    const path = trimmed.startsWith("profiles/") ? trimmed.replace(/^profiles\//, "") : trimmed;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (data?.publicUrl) return data.publicUrl;
  } catch {}
  return "/assets/farmer-1.jpg";
}

const isUuid = (str: string): boolean =>
  typeof str === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

export interface FarmerRatingState {
  ratings: Record<string, number | null>;
  homepageVisibility: Record<string, boolean>;

  setRating: (farmerIdOrSlug: string, rating: number | null, isAdmin?: boolean) => Promise<void>;
  toggleHomepageVisibility: (farmerIdOrSlug: string, value?: boolean, currentFallback?: boolean) => Promise<void>;
  getRating: (farmerIdOrSlug: string, fallback?: number | null) => number | null;
  getHomepageVisibility: (farmerIdOrSlug: string, fallback?: boolean) => boolean;
}

export const useFarmerStore = create<FarmerRatingState>()(
  persist(
    (set, get) => ({
      ratings: {
        "lakshmi-devi": 5,
        "ramesh-singh": 5,
        "asha-patel": 4,
        "vikram-rao": 4,
      },
      homepageVisibility: {
        "lakshmi-devi": true,
        "ramesh-singh": true,
        "asha-patel": true,
        "vikram-rao": true,
      },

      setRating: async (farmerIdOrSlug: string, rating: number | null, isAdmin = true) => {
        if (!isAdmin || !farmerIdOrSlug) return;

        set((state) => ({
          ratings: {
            ...state.ratings,
            [farmerIdOrSlug]: rating,
          },
        }));

        // Broadcast update event across tabs & windows safely
        if (typeof window !== "undefined") {
          try {
            window.dispatchEvent(new CustomEvent("prajnaa-farmer-updated", { detail: { farmerIdOrSlug, rating } }));
          } catch {}
          if (typeof BroadcastChannel !== "undefined") {
            try {
              const bc = new BroadcastChannel("prajnaa-farmers-sync");
              bc.postMessage({ type: "RATING_UPDATED", farmerIdOrSlug, rating });
              bc.close();
            } catch {}
          }
        }

        try {
          const query = supabase.from("farmer_profiles").update({ rating } as any);
          if (isUuid(farmerIdOrSlug)) {
            await query.eq("id", farmerIdOrSlug);
          } else {
            await query.eq("slug", farmerIdOrSlug);
          }
        } catch {
          // Non-blocking sync
        }
      },

      toggleHomepageVisibility: async (farmerIdOrSlug: string, value?: boolean, currentFallback: boolean = false) => {
        if (!farmerIdOrSlug) return;
        const storeVal = get().homepageVisibility[farmerIdOrSlug];
        const current = storeVal !== undefined ? storeVal : currentFallback;
        const nextVal = value !== undefined ? value : !current;

        set((state) => ({
          homepageVisibility: {
            ...state.homepageVisibility,
            [farmerIdOrSlug]: nextVal,
          },
        }));

        // Broadcast update event across tabs & windows safely
        if (typeof window !== "undefined") {
          try {
            window.dispatchEvent(new CustomEvent("prajnaa-farmer-updated", { detail: { farmerIdOrSlug, showOnHomepage: nextVal } }));
          } catch {}
          if (typeof BroadcastChannel !== "undefined") {
            try {
              const bc = new BroadcastChannel("prajnaa-farmers-sync");
              bc.postMessage({ type: "HOMEPAGE_VISIBILITY_UPDATED", farmerIdOrSlug, nextVal });
              bc.close();
            } catch {}
          }
        }

        try {
          const updatePayload: Record<string, any> = { show_on_homepage: nextVal };
          // If featuring on homepage, also ensure status is approved so public queries & RLS allow viewing
          if (nextVal) {
            updatePayload.status = "approved";
          }
          const query = supabase.from("farmer_profiles").update(updatePayload as any);
          if (isUuid(farmerIdOrSlug)) {
            await query.eq("id", farmerIdOrSlug);
          } else {
            await query.eq("slug", farmerIdOrSlug);
          }
        } catch {
          // Non-blocking sync
        }
      },

      getRating: (farmerIdOrSlug: string, fallback: number | null = null) => {
        if (!farmerIdOrSlug) return fallback;
        const val = get().ratings[farmerIdOrSlug];
        return val !== undefined ? val : fallback;
      },

      getHomepageVisibility: (farmerIdOrSlug: string, fallback: boolean = false) => {
        if (!farmerIdOrSlug) return fallback;
        const val = get().homepageVisibility[farmerIdOrSlug];
        return val !== undefined ? val : fallback;
      },
    }),
    {
      name: "prajnaa-farmer-ratings-v1",
    }
  )
);

// Auto-rehydrate and listen to cross-tab storage and broadcast events safely
if (typeof window !== "undefined") {
  try {
    useFarmerStore.persist.rehydrate();
  } catch {}

  try {
    window.addEventListener("storage", (e) => {
      if (e.key === "prajnaa-farmer-ratings-v1") {
        useFarmerStore.persist.rehydrate();
      }
    });
  } catch {}

  if (typeof BroadcastChannel !== "undefined") {
    try {
      const bc = new BroadcastChannel("prajnaa-farmers-sync");
      bc.onmessage = () => {
        useFarmerStore.persist.rehydrate();
      };
    } catch {}
  }
}
