"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketingLayout } from "@/components/marketing/layout";
import { FarmerCard } from "@/components/store/farmer-card";
import { farmers as mockFarmers } from "@/lib/mock/farmers";
import { useFarmerStore, resolveFarmerImage } from "@/lib/farmers-store";

function FarmersPage() {
  const ratings = useFarmerStore((s) => s.ratings);
  const getRating = useFarmerStore((s) => s.getRating);

  useEffect(() => {
    try {
      useFarmerStore.persist.rehydrate();
    } catch {}
  }, []);

  const { data: dbFarmers = [] } = useQuery({
    queryKey: ["public-all-farmers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farmer_profiles")
        .select(
          "id,full_name,farm_name,village,state,crops,headline,story,portrait_url,slug,years_farming,farming_method,rating,show_on_homepage,status,is_prajnaa_verified,is_verified,verified_certificate_id,verified_certificate_number",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Query active certificates to ensure real-time dynamic accreditation
  const { data: activeCertificates = [] } = useQuery({
    queryKey: ["public-active-certificates"],
    queryFn: async () => {
      try {
        const { getAllCertificates } = await import("@/lib/certificate/certificate-service");
        const all = await getAllCertificates();
        return all.filter((c) => c.status === "ACTIVE" && c.show_on_profile !== false);
      } catch {
        return [];
      }
    },
  });

  const verifiedFarmerMap = useMemo(() => {
    const set = new Set<string>();
    for (const c of activeCertificates) {
      if (c.farmer_id) set.add(String(c.farmer_id).toLowerCase());
      if (c.farmer_slug) set.add(String(c.farmer_slug).toLowerCase());
      if (c.farmer_name) set.add(String(c.farmer_name).toLowerCase());
    }
    return set;
  }, [activeCertificates]);

  const mappedDbFarmers = useMemo(() => {
    return dbFarmers.map((f: any) => {
      const slug = f.slug || f.id;
      const id = f.id || slug;
      const rating = getRating(slug, getRating(id, f.rating ?? null));
      const isVerified = Boolean(
        f.is_prajnaa_verified ||
        f.is_verified ||
        verifiedFarmerMap.has(String(id).toLowerCase()) ||
        verifiedFarmerMap.has(String(slug).toLowerCase()) ||
        verifiedFarmerMap.has(String(f.full_name || "").toLowerCase())
      );

      return {
        id,
        slug,
        name: f.full_name,
        image: resolveFarmerImage(f.portrait_url),
        village: f.village || "India",
        state: f.state || "Farm",
        region: "Local Farm",
        yearsExperience: f.years_farming || 0,
        method: f.farming_method || "Natural Farming",
        storyPreview: f.headline || "",
        story: f.story || "",
        upcomingHarvests: f.crops || [],
        productSlugs: [],
        rating,
        is_prajnaa_verified: isVerified,
        isVerified,
      };
    });
  }, [dbFarmers, ratings, getRating, verifiedFarmerMap]);

  const combinedFarmers = useMemo(() => {
    const combinedMap = new Map<string, any>();
    for (const f of mappedDbFarmers) {
      combinedMap.set(f.slug, f);
    }
    for (const f of mockFarmers) {
      if (!combinedMap.has(f.slug)) {
        const isVerified = verifiedFarmerMap.has(f.slug.toLowerCase()) || Boolean(f.is_prajnaa_verified);
        combinedMap.set(f.slug, {
          ...f,
          image: resolveFarmerImage(f.image),
          rating: getRating(f.slug, f.rating ?? 5),
          is_prajnaa_verified: isVerified,
          isVerified,
        });
      }
    }
    const list = Array.from(combinedMap.values());
    return list.sort((a, b) => {
      const rA = a.rating != null ? a.rating : -1;
      const rB = b.rating != null ? b.rating : -1;
      if (rB !== rA) return rB - rA;
      return (b.yearsExperience || 0) - (a.yearsExperience || 0);
    });
  }, [mappedDbFarmers, ratings, getRating, verifiedFarmerMap]);

  return (
    <MarketingLayout>
      <div className="container-prj pt-6 md:pt-8 pb-16">
        <p className="font-subhead text-xs uppercase tracking-[0.18em] text-primary">Our farmers</p>
        <h1 className="font-display mt-1 text-2xl md:text-3xl font-semibold tracking-tight">
          The people behind your produce.
        </h1>
        <p className="mt-1.5 max-w-xl text-xs md:text-sm text-muted-foreground">
          A growing network of {combinedFarmers.length} farms across India. Every product on Prajnaa
          is traceable to one of these names.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {combinedFarmers.map((f) => (
            <FarmerCard key={f.slug} farmer={f as any} />
          ))}
        </div>
      </div>
    </MarketingLayout>
  );
}

export default FarmersPage;
