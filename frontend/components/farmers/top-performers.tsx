"use client";

import { useMemo, useEffect } from "react";
import { Link } from "@/lib/tanstack-compat";
import { ArrowRight, Star } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader } from "@/components/store/section-header";
import { Reveal } from "@/components/reveal";
import { farmers as mockFarmers } from "@/lib/mock/farmers";
import { useFarmerStore, resolveFarmerImage } from "@/lib/farmers-store";

export function TopPerformersSection() {
  const ratings = useFarmerStore((s) => s.ratings);
  const homepageVisibility = useFarmerStore((s) => s.homepageVisibility);
  const getRating = useFarmerStore((s) => s.getRating);
  const getHomepageVisibility = useFarmerStore((s) => s.getHomepageVisibility);
  const qc = useQueryClient();

  useEffect(() => {
    try {
      useFarmerStore.persist.rehydrate();
    } catch {}

    if (typeof window === "undefined") return;

    let debounceTimer: NodeJS.Timeout | null = null;
    const handleUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        qc.refetchQueries({ queryKey: ["public-featured-farmers-top-component"] });
      }, 300);
    };

    window.addEventListener("prajnaa-farmer-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel("prajnaa-farmers-sync");
        bc.onmessage = handleUpdate;
      } catch {}
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("prajnaa-farmer-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
    };
  }, [qc]);

  const { data: dbFarmers = [] } = useQuery({
    queryKey: ["public-featured-farmers-top-component"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farmer_profiles")
        .select("id,full_name,farm_name,village,state,crops,headline,story,portrait_url,slug,years_farming,farming_method,rating,show_on_homepage,status")
        .order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const mappedDbFarmers = useMemo(() => {
    return dbFarmers.map((f: any) => {
      const slug = f.slug || f.id;
      const id = f.id || slug;
      const rating = getRating(slug, getRating(id, f.rating ?? null));
      const showOnHomepage = getHomepageVisibility(slug, getHomepageVisibility(id, f.show_on_homepage ?? false));
      return {
        slug,
        id,
        name: f.full_name,
        image: resolveFarmerImage(f.portrait_url),
        village: f.village || "India",
        state: f.state || "Farm",
        yearsExperience: f.years_farming || 0,
        method: f.farming_method || "Natural Farming",
        rating,
        showOnHomepage,
      };
    });
  }, [dbFarmers, ratings, homepageVisibility, getRating, getHomepageVisibility]);

  const mappedMockFarmers = useMemo(() => {
    return mockFarmers.map((f) => ({
      ...f,
      image: resolveFarmerImage(f.image),
      rating: getRating(f.slug, f.rating ?? 5),
      showOnHomepage: getHomepageVisibility(f.slug, f.showOnHomepage ?? true),
    }));
  }, [ratings, homepageVisibility, getRating, getHomepageVisibility]);

  const topFarmersList = useMemo(() => {
    const combinedMap = new Map<string, any>();
    for (const f of mappedDbFarmers) {
      combinedMap.set(f.slug, f);
      if (f.id) combinedMap.set(f.id, f);
    }
    for (const f of mappedMockFarmers) {
      if (!combinedMap.has(f.slug)) {
        combinedMap.set(f.slug, f);
      }
    }
    const all = Array.from(new Set(combinedMap.values()));
    const featured = all.filter((f) => f.showOnHomepage === true);
    return featured.sort((a, b) => {
      const rA = a.rating != null ? a.rating : -1;
      const rB = b.rating != null ? b.rating : -1;
      if (rB !== rA) return rB - rA;
      return (b.yearsExperience || 0) - (a.yearsExperience || 0);
    });
  }, [mappedMockFarmers, mappedDbFarmers]);

  return (
    <section className="container-prj mt-24">
      <Reveal>
        <SectionHeader
          eyebrow="Top Performer Farmers"
          title="Top Performing Farmers"
          subtitle="Meet our highest-rated verified farmers delivering 100% natural, traceable produce directly from their fields."
          action={
            <Link
              to="/farmers"
              className="font-subhead inline-flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80"
            >
              Meet all farmers <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      </Reveal>

      <div className="mt-8 flex items-center justify-start gap-4 sm:gap-8 md:gap-10 overflow-x-auto pb-4 pt-2 max-w-full touch-pan-x scrollbar-none [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {topFarmersList.map((f, i) => (
          <Reveal key={f.slug} delay={i * 80} className="shrink-0 w-28 sm:w-36 md:w-40">
            <Link
              to={`/farmer/${f.slug}`}
              className="group flex flex-col items-center text-center select-none w-full"
            >
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-border/40 p-1 group-hover:border-primary/60 transition-all duration-300 shadow-sm group-hover:shadow-md bg-background">
                <img
                  src={f.image}
                  alt={f.name}
                  className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
                />
                {f.rating != null && (
                  <div className="absolute bottom-1 right-1 bg-background/90 backdrop-blur-xs border border-amber-400/40 text-amber-500 rounded-full px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-0.5 shadow-xs">
                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    <span>{f.rating}.0</span>
                  </div>
                )}
              </div>
              <h4 className="font-display font-semibold text-xs sm:text-base text-foreground mt-3 group-hover:text-primary transition-colors truncate w-full px-1">
                {f.name}
              </h4>
              <p className="font-subhead text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate w-full px-1">
                {f.village}, {f.state}
              </p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
