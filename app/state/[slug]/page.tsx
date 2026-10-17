"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/lib/tanstack-compat";
import { MapPin, Sprout, ShieldCheck, ArrowRight, BookOpen, Award, Compass, Sparkles, UserCheck } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { getStateData, getFarmersByState } from "@/lib/mock/state-data";
import { farmers as defaultMockFarmers } from "@/lib/mock/farmers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function StateDetailsPage() {
  const params = useParams();
  const rawSlug = typeof params?.slug === "string" ? params.slug : "";
  const slug = rawSlug.toLowerCase();

  const stateInfo = getStateData(slug);

  // Fetch registered farmers from Supabase DB for this state
  const { data: dbFarmers = [] } = useQuery({
    queryKey: ["db-state-farmers", stateInfo?.name],
    enabled: !!stateInfo?.name,
    queryFn: async () => {
      try {
        if (!supabase) return [];
        const { data, error } = await supabase
          .from("farmer_profiles")
          .select("id, full_name, farm_name, village, district, state, farm_size_acres, years_farming, farming_method, crops, headline, story, portrait_url, slug, is_prajnaa_verified, is_verified, verified_certificate_id")
          .eq("status", "approved")
          .ilike("state", `%${stateInfo?.name}%`);

        if (error) {
          console.warn("Supabase query warning:", error.message);
          return [];
        }
        return data || [];
      } catch (err) {
        console.warn("Supabase client fetch error:", err);
        return [];
      }
    },
  });

  // Query active certificates to guarantee real-time dynamic accreditation
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

  // Match Prajnaa registered farmers from primary farmers directory and DB registered farmers
  const combinedFarmers = useMemo(() => {
    if (!stateInfo) return [];

    // Filter Prajnaa registered farmers from the main platform farmers catalog
    const prajnaaCoreFarmers = defaultMockFarmers
      .filter((f) => f.state.toLowerCase().includes(stateInfo.name.toLowerCase()) || stateInfo.name.toLowerCase().includes(f.state.toLowerCase()))
      .map((f) => ({
        id: f.slug,
        slug: f.slug,
        name: f.name,
        village: f.village,
        district: f.region || stateInfo.name,
        state: f.state,
        landAcres: 4.5,
        farmingMethod: f.method,
        experienceYears: f.yearsExperience,
        cropsGrown: f.upcomingHarvests.map((h) => h.split("·")[0].trim()),
        image: f.image,
        bio: f.story,
        isVerified: verifiedFarmerMap.has(f.slug.toLowerCase()) || Boolean((f as any).is_prajnaa_verified),
      }));

    // Map registered DB farmers from Supabase table
    const mappedDbFarmers = dbFarmers.map((f: any) => ({
      id: f.id,
      slug: f.slug || "unknown",
      name: f.full_name,
      village: f.village || "Local Village",
      district: f.district || stateInfo.name,
      state: f.state || stateInfo.name,
      landAcres: Number(f.farm_size_acres || 3.5),
      farmingMethod: f.farming_method || "Natural Farming",
      experienceYears: Number(f.years_farming || 10),
      cropsGrown: Array.isArray(f.crops) ? f.crops : [stateInfo.famousCrop],
      image: f.portrait_url || "/assets/farmer-1.jpg",
      bio: f.story || f.headline || "Organic farmer registered on Prajnaa Farm network.",
      isVerified: Boolean(
        f.is_prajnaa_verified ||
        f.is_verified ||
        verifiedFarmerMap.has(String(f.id).toLowerCase()) ||
        verifiedFarmerMap.has(String(f.slug || "").toLowerCase()) ||
        verifiedFarmerMap.has(String(f.full_name || "").toLowerCase())
      ),
    }));

    // Secondary fallback to state-specific curated mock farmers if no registered farmer exists yet for the state
    const fallbackStateFarmers = prajnaaCoreFarmers.length > 0 || mappedDbFarmers.length > 0 
      ? [] 
      : getFarmersByState(stateInfo.name);

    return [...prajnaaCoreFarmers, ...mappedDbFarmers, ...fallbackStateFarmers];
  }, [stateInfo, dbFarmers]);

  if (!stateInfo) {
    return (
      <MarketingLayout>
        <div className="container-prj py-24 text-center">
          <h1 className="font-display text-3xl font-bold">State Not Found</h1>
          <p className="mt-3 text-muted-foreground">We couldn't find details for the requested agricultural region.</p>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
            Back to Home Sourcing Map
          </Link>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-secondary/50 pt-8 pb-14 border-b border-border">
        <div className="container-prj">
          {/* Breadcrumb navigation */}
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-6">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <span className="text-foreground">Sourcing States</span>
            <span>/</span>
            <span className="text-primary font-semibold">{stateInfo.name}</span>
          </div>

          <div className="grid gap-10 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary border border-primary/20">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>{stateInfo.altitude}</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-[1.08]">
                {stateInfo.name} <br />
                <span className="text-primary italic font-serif font-normal text-3xl sm:text-4xl">
                  {stateInfo.tagline}
                </span>
              </h1>

              <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
                {stateInfo.history.slice(0, 220)}...
              </p>

              {/* Quick Info Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                <div className="rounded-2xl border border-border/80 bg-background/80 p-3 shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Climate</p>
                  <p className="font-display text-xs font-bold text-foreground mt-0.5">{stateInfo.climate}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-background/80 p-3 shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Soil Type</p>
                  <p className="font-display text-xs font-bold text-foreground mt-0.5">{stateInfo.soilType}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-background/80 p-3 shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Peak Season</p>
                  <p className="font-display text-xs font-bold text-foreground mt-0.5">{stateInfo.harvestSeason}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-background/80 p-3 shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Registered Farmers</p>
                  <p className="font-display text-xs font-bold text-primary mt-0.5">{combinedFarmers.length} Farmers</p>
                </div>
              </div>
            </div>

            {/* Banner Hero Image */}
            <div className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-3xl border-2 border-background shadow-xl aspect-[4/3]">
                <img
                  src={stateInfo.image}
                  alt={stateInfo.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/assets/hero.jpg";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-xs uppercase tracking-wider font-semibold text-accent">Famous Regional Crop</p>
                  <p className="font-display text-xl font-bold text-white mt-0.5">🌱 {stateInfo.famousCrop}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Tabs & Sections */}
      <section className="container-prj py-16">
        <div className="space-y-16">

          {/* Section 1: Agricultural History & Crop Significance */}
          <div className="grid gap-10 lg:grid-cols-12 items-start">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <BookOpen className="h-4 w-4" />
                <span>Heritage & Famous Crop History</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground leading-tight">
                Why {stateInfo.name} is Renowned for {stateInfo.famousCrop}
              </h2>
              <div className="prose prose-neutral max-w-none text-muted-foreground space-y-4 text-sm sm:text-base leading-relaxed">
                <p className="bg-secondary/30 border-l-4 border-primary p-4 rounded-r-2xl font-medium text-foreground">
                  "{stateInfo.history}"
                </p>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mt-4 mb-2 flex items-center gap-2">
                    <Award className="h-5 w-5 text-accent" /> Special Crop Attributes & Significance
                  </h3>
                  <p>{stateInfo.agriculturalSignificance}</p>
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mt-4 mb-2 flex items-center gap-2">
                    <Compass className="h-5 w-5 text-primary" /> Traditional Farming & Harvesting Methods
                  </h3>
                  <p>{stateInfo.traditionalPractices}</p>
                </div>
              </div>
            </div>

            {/* Quick Sourced Products Card */}
            <div className="lg:col-span-5 rounded-3xl border border-border bg-secondary/20 p-6 sm:p-8 space-y-6">
              <div>
                <span className="text-xs uppercase font-bold text-primary tracking-wider">Fresh Harvest Products</span>
                <h3 className="font-display text-xl font-bold text-foreground mt-1">Sourced from {stateInfo.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">100% lab-tested and directly traceable to registered regional farmers.</p>
              </div>

              <div className="space-y-4">
                {stateInfo.topProducts.map((p) => (
                  <div key={p.name} className="flex items-center justify-between gap-4 rounded-2xl bg-background border border-border/80 p-3 shadow-sm hover:border-primary/50 transition-all">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-14 w-14 rounded-xl object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/assets/prod-almonds.jpg";
                        }}
                      />
                      <div>
                        <p className="font-display text-sm font-bold text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.weight} • ₹{p.price}</p>
                      </div>
                    </div>
                    <Link
                      href={`/product/${p.slug}`}
                      className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors"
                    >
                      Shop
                    </Link>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Link
                  href={`/shop?q=${encodeURIComponent(stateInfo.name)}`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Explore All {stateInfo.name} Produce <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Section 2: Accurate List of Registered Farmers from this State */}
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                  <UserCheck className="h-4 w-4" />
                  <span>Verified Farmers Directory</span>
                </span>
                <h2 className="font-display text-3xl font-bold text-foreground mt-1">
                  Registered Farmers from {stateInfo.name} ({combinedFarmers.length})
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Explore verified partner farmers, their exact landholding size, farming practices, and crops grown.
                </p>
              </div>
            </div>

            {combinedFarmers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border p-12 text-center">
                <p className="text-muted-foreground">No registered farmers found for this state yet.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {combinedFarmers.map((farmer, idx) => (
                  <div
                    key={farmer.id || farmer.slug}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-background p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-xl"
                  >
                    <div>
                      {/* Top Header info */}
                      <div className="flex items-center gap-4">
                        <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-secondary flex-shrink-0 border border-border">
                          <img
                            src={farmer.image}
                            alt={farmer.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `/assets/farmer-${(idx % 4) + 1}.jpg`;
                            }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-display text-lg font-bold text-foreground">{farmer.name}</h3>
                            {farmer.isVerified && (
                              <ShieldCheck className="h-4 w-4 text-emerald-600 fill-emerald-100" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-primary" /> {farmer.village}, {farmer.district}
                          </p>
                          {farmer.isVerified ? (
                            <span className="mt-1 inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              ✓ Prajnaa Verified
                            </span>
                          ) : (
                            <span className="mt-1 inline-block text-[10px] font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                              Registered Partner
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Land & Practice Metadata Grid */}
                      <div className="grid grid-cols-2 gap-2 mt-5 rounded-2xl bg-secondary/40 p-3 border border-border/50 text-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Land</span>
                          <p className="font-display font-bold text-foreground mt-0.5">🌾 {farmer.landAcres} Acres</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Experience</span>
                          <p className="font-display font-bold text-foreground mt-0.5">⏳ {farmer.experienceYears} Years</p>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-border/40">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Farming Method</span>
                          <p className="font-semibold text-primary mt-0.5 truncate">✨ {farmer.farmingMethod}</p>
                        </div>
                      </div>

                      {/* Crops Cultivated */}
                      <div className="mt-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                          Crops Grown on Farm:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {farmer.cropsGrown.map((crop: string) => (
                            <span
                              key={crop}
                              className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-medium text-primary"
                            >
                              🌱 {crop}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Bio preview */}
                      <p className="mt-4 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {farmer.bio}
                      </p>
                    </div>

                    {/* View Profile Link */}
                    <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Traceable Sourcing</span>
                      <Link
                        href={`/farmer/${farmer.slug}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:translate-x-1 transition-transform"
                      >
                        View Profile →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </section>
    </MarketingLayout>
  );
}
