"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@/lib/tanstack-compat";
import {
  ShieldCheck,
  Star,
  MapPin,
  Loader2,
  Sprout,
  Award,
  ShoppingBag,
  MessageSquare,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Camera
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { farmerBySlug } from "@/lib/mock/farmers";
import { productsByFarmer } from "@/lib/mock/products";
import { supabase } from "@/integrations/supabase/client";
import { ContactFarmerModal } from "@/components/farmer/contact-farmer-modal";
import { PrajnaaCertificate } from "@/components/certificate/prajnaa-certificate";
import type { FarmerCertificate } from "@/lib/types/certificate";
import { useCart } from "@/lib/cart-store";
import { resolveFarmerImage } from "@/lib/farmers-store";
import { getStoredCustomProducts } from "@/lib/services/productSyncService";
import { formatStock } from "@/lib/weight-utils";
import { Newsletter } from "@/components/marketing/newsletter";
import { resolveFarmerExtData, parseFarmerStoryAndMeta } from "@/lib/farmer/farmer-ext-storage";
import { toast } from "sonner";
import LandLedger from "@/components/LandLedger";
import TrustCertifications from "@/components/TrustCertifications";

export default function FarmerPage() {
  const params = useParams();
  const slug = params?.slug;
  const slugStr = typeof slug === "string" ? slug : (Array.isArray(slug) ? slug[0] : "");
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [activeFarmSlide, setActiveFarmSlide] = useState(0);

  // Load official certificate
  const { data: cert } = useQuery<FarmerCertificate | null>({
    queryKey: ["farmer-public-certificate", slugStr],
    queryFn: async () => {
      const res = await fetch(`/api/farmer/certificate?slug=${slugStr}`);
      const json = await res.json();
      return json.data ?? null;
    },
  });

  // Try DB first (lookup by slug or id)
  const { data: dbFarmer, isLoading } = useQuery({
    queryKey: ["public-farmer", slugStr],
    queryFn: async () => {
      if (!supabase || !slugStr) return null;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugStr);
      let query = supabase
        .from("farmer_profiles")
        .select(
          "id,user_id,slug,full_name,farm_name,village,district,state,pincode,farm_size_acres,years_farming,farming_method,crops,headline,story,cover_image_url,portrait_url,status,approved_at,created_at,updated_at,rating,show_on_homepage,is_prajnaa_verified,is_verified,verified_certificate_id,verified_certificate_number"
        );
      if (isUuid) {
        query = query.eq("id", slugStr);
      } else {
        query = query.eq("slug", slugStr);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: dbProducts = [] } = useQuery({
    enabled: !!dbFarmer?.id,
    queryKey: ["public-farmer-products", dbFarmer?.id, dbFarmer?.slug],
    queryFn: async () => {
      if (!supabase) return [];
      try {
        const { data, error } = await supabase
          .from("farmer_products")
          .select("*")
          .or(`farmer_id.eq.${dbFarmer!.id},farmer_id.eq.${dbFarmer!.slug || ""}`)
          .eq("status", "published");
        if (!error && data) return data;
      } catch (err) {
        console.warn("[FarmerProducts] Error querying with .or:", err);
      }
      const { data: fallbackData } = await supabase
        .from("farmer_products")
        .select("*")
        .eq("farmer_id", dbFarmer!.id);
      return fallbackData ?? [];
    },
  });

  // Combine DB farmer or Mock farmer
  const mock = farmerBySlug(slugStr);
  const farmerData = dbFarmer
    ? mapDbFarmerToFarmer(dbFarmer)
    : mock || getFallbackFarmer(slugStr);

  const mockProducts = productsByFarmer(slugStr);

  // Check dynamic verification status: active official certificate or DB verified flag
  const isFarmerVerified = Boolean(
    (cert && cert.status === "ACTIVE" && cert.show_on_profile !== false) ||
    dbFarmer?.is_prajnaa_verified ||
    dbFarmer?.is_verified
  );

  // Retrieve actual verified products for this farmer (no fake generated harvests)
  const farmerRealProducts = useMemo(() => {
    if (!dbFarmer) {
      if (!mock) return [];
      return mockProducts.map((p) => {
        const stockGrams = Math.round(Number(p.stock || 0) * 1000);
        return {
          id: p.slug,
          slug: p.slug,
          name: p.name,
          grade: "Standard Grade A",
          quantityAvailableKg: Math.round(Number(p.stock || 0)),
          stockGrams,
          pricePerKg: p.price,
          availabilityStatus: p.stock > 0 ? ("In season" as const) : ("Sold out" as const),
          image: p.image,
        };
      });
    }

    let stored: any[] = [];
    if (typeof window !== "undefined") {
      try {
        stored = getStoredCustomProducts();
      } catch {
        stored = [];
      }
    }

    const allCandidateProducts = [...(dbProducts || []), ...stored];
    const farmerIdStr = String(dbFarmer.id || "").trim().toLowerCase();
    const farmerSlugStr = String(dbFarmer.slug || "").trim().toLowerCase();
    const farmerNameStr = String(dbFarmer.full_name || "").trim().toLowerCase();

    const filtered = allCandidateProducts.filter((p: any) => {
      const pFarmerId = String(p.farmer_id || p.farmerId || p.farmer?.id || "").trim().toLowerCase();
      const pFarmerSlug = String(p.farmerSlug || p.farmer?.slug || p.farmer_profiles?.slug || "").trim().toLowerCase();
      const pFarmerName = String(p.farmer?.full_name || p.farmer_profiles?.full_name || "").trim().toLowerCase();

      return (
        (farmerIdStr && pFarmerId === farmerIdStr) ||
        (farmerSlugStr && (pFarmerId === farmerSlugStr || pFarmerSlug === farmerSlugStr)) ||
        (farmerNameStr && pFarmerName === farmerNameStr)
      );
    });

    const seen = new Set<string>();
    const unique = filtered.filter((p: any) => {
      const key = String(p.id || p.slug || "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.map((p: any) => {
      const stockGrams = Number(
        p.stock_grams ?? (p.stock !== undefined ? (Number(p.stock) > 1000 ? Number(p.stock) : Number(p.stock) * 1000) : 0)
      );
      const pricePerKg = Number(p.price_per_kg || p.price || 0);

      return {
        id: p.id || p.slug,
        slug: p.slug || p.id,
        name: p.name,
        grade: p.grade || "A Grade Fresh Harvest",
        quantityAvailableKg: Math.floor(stockGrams / 1000),
        stockGrams,
        pricePerKg,
        availabilityStatus: stockGrams > 0 ? ("In season" as const) : ("Sold out" as const),
        image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : p.image || "/assets/prod-almonds.jpg",
      };
    });
  }, [dbFarmer, dbProducts, mock, mockProducts]);

  const queryClient = useQueryClient();

  // Listen for newly submitted reviews across the app
  useEffect(() => {
    const handleNewReview = () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-product-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["public-farmer"] });
    };
    window.addEventListener("prajnaa:review-submitted", handleNewReview);
    return () => window.removeEventListener("prajnaa:review-submitted", handleNewReview);
  }, [queryClient]);

  // Collect all product slugs associated with this farmer
  const farmerProductSlugs = useMemo(() => {
    const slugs = new Set<string>();
    if (farmerRealProducts) {
      farmerRealProducts.forEach((p: any) => {
        if (p.slug) slugs.add(String(p.slug).trim().toLowerCase());
        if (p.id) slugs.add(String(p.id).trim().toLowerCase());
      });
    }
    if (mockProducts) {
      mockProducts.forEach((p: any) => {
        if (p.slug) slugs.add(String(p.slug).trim().toLowerCase());
      });
    }
    if (dbProducts) {
      dbProducts.forEach((p: any) => {
        if (p.slug) slugs.add(String(p.slug).trim().toLowerCase());
        if (p.id) slugs.add(String(p.id).trim().toLowerCase());
      });
    }
    return Array.from(slugs);
  }, [farmerRealProducts, mockProducts, dbProducts]);

  // Query reviews for all products produced by this farmer
  const { data: dbFarmerReviews = [] } = useQuery({
    queryKey: ["farmer-product-reviews", slugStr, dbFarmer?.id, farmerProductSlugs],
    queryFn: async () => {
      if (!supabase) return [];
      try {
        const targetSlugs = new Set<string>(farmerProductSlugs);

        // Also query DB farmer_products for any additional slugs linked by farmer_id
        if (dbFarmer?.id) {
          try {
            const { data: moreProds } = await supabase
              .from("farmer_products")
              .select("slug, id, name")
              .or(`farmer_id.eq.${dbFarmer.id},farmer_id.eq.${dbFarmer.slug || slugStr}`);
            if (moreProds) {
              moreProds.forEach((p: any) => {
                if (p.slug) targetSlugs.add(String(p.slug).trim().toLowerCase());
                if (p.id) targetSlugs.add(String(p.id).trim().toLowerCase());
              });
            }
          } catch {}
        }

        const candidateSlugs = Array.from(targetSlugs);
        if (candidateSlugs.length === 0) return [];

        let revs: any[] | null = null;
        try {
          const { data, error } = await supabase
            .from("product_reviews")
            .select("*")
            .in("product_slug", candidateSlugs)
            .order("created_at", { ascending: false });
          if (!error && data) revs = data;
        } catch {
          revs = null;
        }

        // Also check local storage for any client-submitted reviews for these products
        let localReviews: any[] = [];
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("prajnaa_client_reviews");
            if (raw) {
              const allLocal = JSON.parse(raw);
              localReviews = allLocal.filter((lr: any) =>
                candidateSlugs.includes(String(lr.product_slug).trim().toLowerCase())
              );
            }
          } catch {}
        }

        const combinedRaw = [...(localReviews || []), ...(revs || [])];
        const uniqueRaw: any[] = [];
        const seenIds = new Set<string>();
        combinedRaw.forEach((r) => {
          if (r && r.id && !seenIds.has(r.id)) {
            seenIds.add(r.id);
            uniqueRaw.push(r);
          }
        });

        if (uniqueRaw.length === 0) return [];

        // Fetch user profiles for reviewer details
        const userIds = uniqueRaw.map((r: any) => r.user_id).filter(Boolean);
        let profilesMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name, city, state")
            .in("id", userIds);
          if (profs) {
            profs.forEach((p: any) => {
              profilesMap[p.id] = p;
            });
          }
        }

        return uniqueRaw.map((r: any) => {
          const prof = profilesMap[r.user_id];
          const matchedProd =
            farmerRealProducts.find((p: any) => p.slug === r.product_slug || p.id === r.product_slug) ||
            mockProducts.find((p: any) => p.slug === r.product_slug);
          const productName =
            matchedProd?.name ||
            (r.product_slug
              ? r.product_slug
                  .split("-")
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ")
              : undefined);

          const dateStr = r.created_at
            ? new Date(r.created_at).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : undefined;

          return {
            id: r.id,
            buyerName: r.author || prof?.full_name || "Verified Buyer",
            buyerLocation:
              r.location ||
              (prof?.city && prof?.state
                ? `${prof.city}, ${prof.state}`
                : prof?.city || prof?.state || "India"),
            rating: Number(r.rating) || 5,
            comment: r.body,
            title: r.title,
            productName,
            productSlug: r.product_slug,
            date: dateStr,
          };
        });
      } catch (err) {
        console.error("Error fetching farmer product reviews:", err);
        return [];
      }
    },
    staleTime: 1000 * 30,
  });

  // Combine real database reviews with any fallback reviews
  const allFarmerReviews = useMemo(() => {
    const existing = farmerData.reviews || [];
    const combined: any[] = [...dbFarmerReviews];
    for (const r of existing) {
      if (!combined.some((item: any) => item.id === r.id)) {
        combined.push(r);
      }
    }
    return combined;
  }, [dbFarmerReviews, farmerData.reviews]);

  // Compute dynamic buyer rating average
  const dynamicRatingAvg = useMemo(() => {
    if (allFarmerReviews.length > 0) {
      const sum = allFarmerReviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0);
      return (sum / allFarmerReviews.length).toFixed(1);
    }
    return farmerData.ratingAvg
      ? typeof farmerData.ratingAvg === "number"
        ? farmerData.ratingAvg.toFixed(1)
        : farmerData.ratingAvg
      : null;
  }, [allFarmerReviews, farmerData.ratingAvg]);

  if (isLoading) {
    return (
      <MarketingLayout>
        <div className="bg-[#F9F7F2] min-h-[60vh] grid place-items-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-[#1F3B2C]" />
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <div className="bg-[#FAF8F5] text-neutral-800 font-sans min-h-screen pb-8 sm:pb-12">
        {/* Top Bar & Breadcrumb Navigation */}
        <div className="border-b border-[#E6E0D4] bg-white/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="container-prj py-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-subhead font-medium text-neutral-600">
              <Link href="/" className="hover:text-[#0F3D2E] transition-colors">
                Home
              </Link>
              <span>›</span>
              <Link href="/farmers" className="hover:text-[#0F3D2E] transition-colors">
                Sourcing States
              </Link>
              <span>›</span>
              <span className="text-[#0F3D2E] font-semibold">{farmerData.state}</span>
              <span>›</span>
              <span className="text-neutral-500">{farmerData.district || farmerData.village}</span>
              <span>›</span>
              <span className="text-[#8D3C1B] font-bold">{farmerData.name}</span>
            </div>
            {isFarmerVerified && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#0F3D2E]/10 px-3 py-1 font-subhead text-[11px] font-bold text-[#0F3D2E] animate-in fade-in duration-200">
                <ShieldCheck className="h-3.5 w-3.5 text-[#0F3D2E]" /> Prajnaa Verified Direct Origin
              </span>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <section className="container-prj pt-10 pb-12">
          <div className="grid gap-10 md:grid-cols-12 items-center">
            {/* Left: Compact Portrait Photo with Initials Fallback */}
            <div className="md:col-span-4 flex justify-center md:justify-start">
              <div className="relative overflow-hidden rounded-3xl border-2 border-[#E6E0D4] bg-white shadow-md aspect-square w-full max-w-[280px] sm:max-w-[300px] group">
                {farmerData.image ? (
                  <img
                    src={farmerData.image}
                    alt={farmerData.name}
                    className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      const fallback = e.currentTarget.parentElement?.querySelector(".initials-fallback");
                      if (fallback) (fallback as HTMLElement).style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="initials-fallback hidden absolute inset-0 bg-[#0F3D2E] items-center justify-center text-white"
                  style={{ display: farmerData.image ? "none" : "flex" }}
                >
                  <span className="font-display text-5xl font-bold text-[#E8A317]">
                    {farmerData.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .substring(0, 2)}
                  </span>
                </div>
                {isFarmerVerified && (
                  <div className="absolute top-3 left-3 animate-in fade-in duration-200">
                    <span className="bg-[#0F3D2E]/90 text-white backdrop-blur font-subhead text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-white/20">
                      ✓ Verified Producer
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Eyebrow, Heading, Location, Quote, and 4 Key Stats */}
            <div className="md:col-span-8 space-y-5">
              <div>
                <p className="font-subhead text-xs uppercase font-bold tracking-[0.18em] text-[#8D3C1B]">
                  {farmerData.crops?.[0]?.name || "Heirloom Produce"} • {farmerData.generationLabel || "Heritage Farmer"}
                </p>
                <h1 className="font-display mt-2 text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0F3D2E] tracking-tight leading-[1.05]">
                  {farmerData.name}
                </h1>
                <p className="mt-2 text-sm text-neutral-600 font-subhead font-medium flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#8D3C1B]" />
                  {farmerData.village}, {farmerData.district ? `${farmerData.district}, ` : ""}{farmerData.state}
                </p>
              </div>

              {farmerData.quote && (
                <div className="border-l-4 border-[#E8A317] bg-[#0F3D2E]/5 p-4 rounded-r-2xl">
                  <blockquote className="font-display italic text-base sm:text-lg text-[#0F3D2E] leading-relaxed">
                    &ldquo;{farmerData.quote}&rdquo;
                  </blockquote>
                </div>
              )}

              {/* 4 Key Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="rounded-2xl border border-[#E6E0D4] bg-white p-3.5 shadow-2xs">
                  <span className="font-subhead text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Total Land
                  </span>
                  <span className="font-display text-2xl font-bold text-[#0F3D2E] mt-0.5 block">
                    {farmerData.totalLandAcres ? (
                      <>
                        {farmerData.totalLandAcres}{" "}
                        <span className="font-sans text-xs font-normal text-muted-foreground">Acres</span>
                      </>
                    ) : (
                      <span className="text-base text-neutral-400 font-sans font-medium">—</span>
                    )}
                  </span>
                </div>
                <div className="rounded-2xl border border-[#E6E0D4] bg-white p-3.5 shadow-2xs">
                  <span className="font-subhead text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Experience
                  </span>
                  <span className="font-display text-2xl font-bold text-[#0F3D2E] mt-0.5 block">
                    {farmerData.yearsExperience ? (
                      <>
                        {farmerData.yearsExperience}{" "}
                        <span className="font-sans text-xs font-normal text-muted-foreground">Years</span>
                      </>
                    ) : (
                      <span className="text-base text-neutral-400 font-sans font-medium">—</span>
                    )}
                  </span>
                </div>
                <div className="rounded-2xl border border-[#E6E0D4] bg-white p-3.5 shadow-2xs">
                  <span className="font-subhead text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Elevation
                  </span>
                  <span className="font-display text-2xl font-bold text-[#0F3D2E] mt-0.5 block">
                    {farmerData.altitudeM || "—"}
                  </span>
                </div>
                <div className="rounded-2xl border border-[#E6E0D4] bg-white p-3.5 shadow-2xs">
                  <span className="font-subhead text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Buyer Rating
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {dynamicRatingAvg ? (
                      <>
                        <Star className="h-4 w-4 text-[#E8A317] fill-[#E8A317]" />
                        <span className="font-display text-2xl font-bold text-[#0F3D2E]">
                          {dynamicRatingAvg}
                        </span>
                        {allFarmerReviews.length > 0 && (
                          <span className="text-[11px] text-muted-foreground font-sans ml-1">
                            ({allFarmerReviews.length} {allFarmerReviews.length === 1 ? "review" : "reviews"})
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="font-subhead text-xs text-muted-foreground">New Producer</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsContactModalOpen(true)}
                  className="rounded-full bg-[#0F3D2E] px-7 py-3 font-subhead text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0c2b20] transition shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" /> Inquire Sourcing for {farmerData.name.split(" ")[0]}'s Harvest
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Story Section */}
        {farmerData.story && (() => {
          // Dynamic farm photos tailored to farmer or fallback
          const defaultFarmPhotos = [
            {
              url: farmerData.slug === "ramesh-singh" ? "/assets/farm-ramesh-1.jpg" : ((farmerData as any).cover_image_url || "/assets/himalayan-valley-landscape.jpg"),
              caption: `${farmerData.name}'s Heritage Farm`,
              subcaption: `${farmerData.village}, ${farmerData.state} • ${farmerData.method || "Natural Cultivation"}`
            },
            {
              url: "/assets/himalayan-landscape.jpg",
              caption: "Terraced Fields & Living Soil",
              subcaption: `Natural ecosystem nurtured with organic compost & zero synthetic inputs`
            },
            {
              url: farmerData.crops?.[0]?.photoUrl || "/assets/cat-nuts.jpg",
              caption: `Harvest Season: ${farmerData.crops?.[0]?.name || "Heirloom Produce"}`,
              subcaption: `Direct source origin • Season: ${farmerData.crops?.[0]?.season || "Current Cycle"}`
            }
          ];

          const farmPhotos =
            (farmerData as any).farmPhotos && (farmerData as any).farmPhotos.length > 0
              ? (farmerData as any).farmPhotos
              : (farmerData as any).galleryPhotos && (farmerData as any).galleryPhotos.length > 0
              ? (farmerData as any).galleryPhotos
              : defaultFarmPhotos;
          const currentSlide = farmPhotos[activeFarmSlide % farmPhotos.length];

          const prevSlide = () => {
            setActiveFarmSlide((prev) => (prev === 0 ? farmPhotos.length - 1 : prev - 1));
          };

          const nextSlide = () => {
            setActiveFarmSlide((prev) => (prev + 1) % farmPhotos.length);
          };

          return (
            <section className="container-prj py-8">
              <SectionHeader label="His / Her Story" title={`About ${farmerData.name}`} />

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* Left: 50% About Story Card */}
                <div className="rounded-3xl border border-[#E6E0D4] bg-white p-7 sm:p-9 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0F3D2E]/5 border border-[#0F3D2E]/15 text-[#0F3D2E] text-xs font-subhead font-bold uppercase tracking-wider">
                      <Sprout className="h-3.5 w-3.5 text-[#0F3D2E]" />
                      Authentic Farm Heritage
                    </div>
                    <p className="font-sans text-base sm:text-lg leading-relaxed text-foreground/85">
                      {farmerData.story}
                    </p>
                    {farmerData.storyPreview && farmerData.storyPreview !== farmerData.story && (
                      <p className="font-sans text-sm sm:text-base leading-relaxed text-neutral-600 border-t border-[#E6E0D4]/70 pt-4">
                        {farmerData.storyPreview}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 pt-5 border-t border-[#E6E0D4] flex flex-wrap items-center justify-between gap-3 text-xs font-subhead text-neutral-500">
                    <span className="flex items-center gap-1.5 font-semibold text-[#0F3D2E]">
                      <CheckCircle2 className="h-4 w-4 text-[#0F3D2E]" /> 100% Traceable Direct Origin
                    </span>
                    <span className="font-medium">
                      {farmerData.yearsExperience}+ Years Sustainable Farming
                    </span>
                  </div>
                </div>

                {/* Right: 50% Farm Photos Slider */}
                <div className="relative rounded-3xl border border-[#E6E0D4] bg-[#0F3D2E] text-white shadow-2xs overflow-hidden flex flex-col min-h-[340px] sm:min-h-[380px] group">
                  {/* Photo Canvas */}
                  <div className="relative w-full h-full min-h-[260px] sm:min-h-[300px] flex-1 overflow-hidden bg-neutral-900">
                    <img
                      key={currentSlide.url}
                      src={currentSlide.url}
                      alt={currentSlide.caption}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/assets/himalayan-valley-landscape.jpg";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none" />

                    {/* Top Badge: Photo Count & Indicator */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                      <span className="bg-black/60 backdrop-blur-md text-white font-subhead text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5">
                        <Camera className="h-3 w-3 text-[#E8A317]" /> Farm Gallery ({activeFarmSlide + 1}/{farmPhotos.length})
                      </span>

                      {/* Dot indicators */}
                      <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                        {farmPhotos.map((_: any, i: number) => (
                          <button
                            key={i}
                            onClick={() => setActiveFarmSlide(i)}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              activeFarmSlide === i ? "w-5 bg-[#E8A317]" : "w-2 bg-white/40 hover:bg-white/70"
                            }`}
                            aria-label={`Go to slide ${i + 1}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Bottom Caption Overlay */}
                    <div className="absolute bottom-4 left-4 right-16 z-10 text-white">
                      <p className="font-display text-lg sm:text-xl font-bold leading-tight drop-shadow-sm">
                        {currentSlide.caption}
                      </p>
                      <p className="font-sans text-xs sm:text-sm text-neutral-200 mt-1 line-clamp-1 drop-shadow-xs">
                        {currentSlide.subcaption}
                      </p>
                    </div>

                    {/* Navigation Buttons */}
                    <button
                      onClick={prevSlide}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/20 opacity-80 hover:opacity-100 transition shadow-md z-20 cursor-pointer"
                      aria-label="Previous farm image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/20 opacity-80 hover:opacity-100 transition shadow-md z-20 cursor-pointer"
                      aria-label="Next farm image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Land & Crops Section (Signature Land Ledger) */}
        <section className="container-prj py-8">
          <SectionHeader
            label="Land Allocation & Crops"
            title="Land Ledger & Seasonal Cultivation"
          />

          <div className="mt-6">
            <LandLedger farmerId={farmerData.slug || farmerData.id || slugStr} />
          </div>
        </section>

        {/* Practices & Certifications Section */}
        <section className="container-prj py-8">
          <SectionHeader
            label="Trust & Ecology"
            title="Farming Practices & Certifications"
          />
          <div className="mt-6 grid gap-6 md:grid-cols-2 items-stretch">
            {/* Left: Eco-Farming Practices Card */}
            <div className="rounded-3xl border border-[#E6E0D4] bg-white dark:bg-[#121915] dark:border-[#243329] p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <h4 className="font-display text-base font-bold text-[#0F3D2E] dark:text-[#a3d9c9] flex items-center gap-2 mb-4">
                  <Sprout className="h-5 w-5 text-emerald-700" /> Eco-Farming Practices
                </h4>
                <div className="flex flex-wrap gap-2">
                  {farmerData.practices && farmerData.practices.length > 0 ? (
                    farmerData.practices.map((p) => (
                      <span
                        key={p}
                        className="rounded-full bg-[#0F3D2E]/10 border border-[#0F3D2E]/20 dark:bg-[#0f3d2e]/30 dark:border-[#0f3d2e]/40 px-3 py-1.5 font-subhead text-xs font-semibold text-[#0F3D2E] dark:text-[#8ce3b9]"
                      >
                        🌱 {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">Traditional Natural Practices</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Verified Certifications Card with Admin Flow */}
            <TrustCertifications farmerId={farmerData.slug || farmerData.id || slugStr} />
          </div>
        </section>

        {/* Available to Buy Inventory Section */}
        <section className="container-prj py-8">
          <SectionHeader
            label="Direct Sourcing"
            title={`Available Harvest from ${farmerData.name}`}
          />

          <div className="mt-8 overflow-hidden rounded-3xl border border-[#E6E0D4] bg-white shadow-2xs">
            <InventoryTable
              products={farmerRealProducts}
              farmerName={farmerData.name}
            />
          </div>
        </section>

        {/* What Buyers Say Reviews Section */}
        {allFarmerReviews && allFarmerReviews.length > 0 && (
          <section className="container-prj py-8">
            <SectionHeader
              label="Verified Reviews"
              title={`What Sourcing Buyers Say (${allFarmerReviews.length})`}
            />
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {allFarmerReviews.map((rev: any) => (
                <div
                  key={rev.id}
                  className="rounded-3xl border border-[#E6E0D4] bg-white p-6 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-display font-bold text-[#0F3D2E] text-base">
                          {rev.buyerName}
                        </p>
                        <p className="text-xs text-muted-foreground font-sans">{rev.buyerLocation}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-[#E8A317]/15 px-2.5 py-1 rounded-full">
                        <Star className="h-3.5 w-3.5 text-[#E8A317] fill-[#E8A317]" />
                        <span className="font-subhead text-xs font-bold text-[#8D3C1B]">
                          {Number(rev.rating).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {rev.title && (
                      <h5 className="font-display text-sm font-bold text-[#0F3D2E]">
                        "{rev.title}"
                      </h5>
                    )}

                    <p className="font-sans text-sm text-foreground/80 leading-relaxed italic">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E6E0D4]/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                    {rev.productName && rev.productSlug ? (
                      <Link
                        href={`/product/${rev.productSlug}`}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80 hover:bg-emerald-100 transition truncate max-w-[220px]"
                      >
                        <Sprout className="h-3 w-3 text-emerald-700" />
                        Reviewed {rev.productName} →
                      </Link>
                    ) : (
                      <span className="font-subhead text-[10px] uppercase font-bold text-muted-foreground">
                        Verified Harvest Review
                      </span>
                    )}
                    {rev.date && (
                      <span className="text-[11px] text-muted-foreground font-sans">{rev.date}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Closing Contact CTA Banner */}
        <section className="container-prj mt-10">
          <div className="relative overflow-hidden rounded-3xl bg-[#0F3D2E] p-8 sm:p-12 text-white shadow-xl">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <span className="font-subhead text-xs font-bold uppercase tracking-wider text-[#E8A317]">
                  Direct Traceable Sourcing
                </span>
                <h3 className="font-display text-3xl sm:text-4xl font-bold text-white">
                  Shop Harvest Sourced from {farmerData.name}'s Farm
                </h3>
                <p className="text-sm text-white/80 max-w-xl font-sans">
                  Harvest is verified, quality-tested, and dispatched directly from the farm in {farmerData.village}, {farmerData.state} through Prajnaa Sourcing.
                </p>
              </div>
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="rounded-full bg-[#8D3C1B] px-8 py-4 font-subhead text-xs font-bold uppercase tracking-wider text-white hover:bg-[#8D3C1B]/90 transition shadow-lg flex items-center gap-2 cursor-pointer flex-shrink-0"
              >
                <MessageSquare className="h-4 w-4" /> Request Sourcing Assistance
              </button>
            </div>
          </div>
        </section>

        {/* Prajnaa Direct Origin Guarantees Animated Marquee Feature Bar */}
        <section className="my-12 sm:my-16 border-t border-b border-[#E6E0D4] bg-[#FAF8F5] py-5 overflow-hidden relative [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="flex w-max items-center animate-marquee-fast">
            {[1, 2].map((loopKey) => (
              <div key={loopKey} className="flex items-center gap-12 whitespace-nowrap shrink-0 pr-12" aria-hidden={loopKey === 2 ? "true" : undefined}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#0F3D2E]/10 flex items-center justify-center text-[#0F3D2E] font-bold text-lg flex-shrink-0">
                    🌱
                  </div>
                  <div>
                    <h5 className="font-display text-sm font-bold text-[#0F3D2E]">100% Traceable</h5>
                    <p className="text-[11px] text-muted-foreground font-sans">Direct from village farmsteads</p>
                  </div>
                </div>

                <span className="text-[#0F3D2E]/20 text-xs">✦</span>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#0F3D2E]/10 flex items-center justify-center text-[#0F3D2E] font-bold text-lg flex-shrink-0">
                    🧪
                  </div>
                  <div>
                    <h5 className="font-display text-sm font-bold text-[#0F3D2E]">Lab Tested Pure</h5>
                    <p className="text-[11px] text-muted-foreground font-sans">Zero synthetic chemical residue</p>
                  </div>
                </div>

                <span className="text-[#0F3D2E]/20 text-xs">✦</span>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#0F3D2E]/10 flex items-center justify-center text-[#0F3D2E] font-bold text-lg flex-shrink-0">
                    📦
                  </div>
                  <div>
                    <h5 className="font-display text-sm font-bold text-[#0F3D2E]">Eco Packaging</h5>
                    <p className="text-[11px] text-muted-foreground font-sans">Compostable & plastic-free</p>
                  </div>
                </div>

                <span className="text-[#0F3D2E]/20 text-xs">✦</span>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#0F3D2E]/10 flex items-center justify-center text-[#0F3D2E] font-bold text-lg flex-shrink-0">
                    🤝
                  </div>
                  <div>
                    <h5 className="font-display text-sm font-bold text-[#0F3D2E]">78% Farmer Payout</h5>
                    <p className="text-[11px] text-muted-foreground font-sans">Direct support for farm families</p>
                  </div>
                </div>

                <span className="text-[#0F3D2E]/20 text-xs">✦</span>
              </div>
            ))}
          </div>
        </section>

        {/* Certifications & Official Prajnaa Verified Accreditation Section */}
        {cert && cert.status === "ACTIVE" && cert.show_on_profile !== false && (
          <section className="container-prj py-8">
            <SectionHeader
              label="Accreditation & Trust"
              title="Prajnaa Verified Accreditation"
            />
            <div className="mt-6 rounded-3xl border border-[#E6E0D4] bg-white p-6 sm:p-8 shadow-2xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F3D2E] text-[#E8A317] shadow-sm shrink-0">
                    <Award className="h-8 w-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-0.5 font-subhead text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" /> PRAJNAA VERIFIED PRODUCER
                      </span>
                      <span className="font-subhead text-xs font-bold text-muted-foreground">
                        {cert.certificate_number}
                      </span>
                    </div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-[#0F3D2E] mt-1.5">
                      {cert.title}
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-xl mt-1 leading-relaxed font-sans">
                      This farm has satisfied all on-site inspection criteria for chemical-free traditional farming, pure origin traceability, and ethical smallholder compensation.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setIsCertificateModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0F3D2E] px-6 py-3 font-subhead text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0c2b20] transition shadow-sm cursor-pointer"
                  >
                    <Award className="h-4 w-4" /> View Official Certificate
                  </button>
                  <a
                    href={cert.verification_url || `/certificate/verify/${cert.certificate_number}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E0D4] bg-background px-4 py-3 font-subhead text-xs font-bold text-[#0F3D2E] hover:bg-secondary transition"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Verify Online
                  </a>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-[#E6E0D4] pt-4 text-xs font-sans">
                <div>
                  <span className="font-subhead text-[10px] uppercase font-bold text-muted-foreground block">Certificate No.</span>
                  <span className="font-subhead font-bold text-[#0F3D2E]">{cert.certificate_number}</span>
                </div>
                <div>
                  <span className="font-subhead text-[10px] uppercase font-bold text-muted-foreground block">Status</span>
                  <span className="font-subhead font-bold text-emerald-700">✓ Active & Verified</span>
                </div>
                <div>
                  <span className="font-subhead text-[10px] uppercase font-bold text-muted-foreground block">Issued Date</span>
                  <span className="font-medium text-neutral-700">{new Date(cert.issued_at).toLocaleDateString("en-IN")}</span>
                </div>
                <div>
                  <span className="font-subhead text-[10px] uppercase font-bold text-muted-foreground block">Valid Until</span>
                  <span className="font-medium text-neutral-700">{new Date(cert.valid_until).toLocaleDateString("en-IN")}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Contact Farmer Modal */}
        <ContactFarmerModal
          farmerName={farmerData.name}
          farmerSlug={slugStr}
          farmerPhone={(farmerData as any).phone}
          location={`${farmerData.village}, ${farmerData.state}`}
          farmerPhoto={farmerData.image}
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
        />

        {/* Official Certificate Modal */}
        {isCertificateModalOpen && cert && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsCertificateModalOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
          >
            <div className="relative my-auto w-full max-w-2xl md:max-w-3xl rounded-2xl sm:rounded-3xl border border-[#E6E0D4] bg-white p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
              <div className="mb-3 flex items-center justify-between pb-2.5 border-b border-[#E6E0D4] shrink-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 sm:h-5 w-4 sm:w-5 text-[#0F3D2E]" />
                  <h3 className="font-display text-sm sm:text-base font-bold text-[#0F3D2E]">
                    Official Prajnaa Verified Accreditation Certificate
                  </h3>
                </div>
                <button
                  onClick={() => setIsCertificateModalOpen(false)}
                  className="rounded-full border border-[#E6E0D4] p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition-colors cursor-pointer"
                  aria-label="Close Certificate Modal"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto pr-0.5 flex-1">
                <PrajnaaCertificate certificate={cert} onClose={() => setIsCertificateModalOpen(false)} />
              </div>
            </div>
          </div>
        )}

        {/* Newsletter Section (Matching Home Page Reference) */}
        <div className="mt-8 sm:mt-12">
          <Newsletter />
        </div>
      </div>
    </MarketingLayout>
  );
}

// Section Header Helper
function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="flex items-center gap-4">
      <div>
        <span className="font-subhead text-xs uppercase font-bold tracking-[0.18em] text-[#8D3C1B]">
          {label}
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F3D2E] mt-0.5">
          {title}
        </h2>
      </div>
      <div className="h-px flex-1 bg-[#E6E0D4] hidden sm:block" />
    </div>
  );
}



// Available Inventory Products Table
function InventoryTable({
  products,
  farmerName
}: {
  products: any[];
  farmerName?: string;
}) {
  const add = useCart((s) => s.add);

  if (!products || products.length === 0) {
    return (
      <div className="py-12 px-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-[#0F3D2E]/10 flex items-center justify-center mb-3">
          <Sprout className="h-6 w-6 text-[#0F3D2E]" />
        </div>
        <h3 className="font-display text-base font-bold text-[#0F3D2E]">
          No active harvest or products listed yet
        </h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
          {farmerName || "This farmer"} has not listed any harvest inventory yet. Verified seasonal produce and harvest batches will appear here as soon as products are added.
        </p>
      </div>
    );
  }

  const handleAddToCart = (p: any) => {
    add({
      slug: p.slug || p.id,
      name: p.name,
      price: p.pricePerKg || p.price,
      weight: "1 kg",
      image: p.image || "/assets/prod-almonds.jpg",
    } as any);
    toast.success(`Added ${p.name} to cart!`);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs font-sans">
        <thead className="bg-[#FAF8F5] text-[#0F3D2E] font-subhead font-bold uppercase tracking-wider text-[11px] border-b border-[#E6E0D4]">
          <tr>
            <th className="p-4 sm:p-5">Product Name</th>
            <th className="p-4 sm:p-5">Grade</th>
            <th className="p-4 sm:p-5">Quantity Available</th>
            <th className="p-4 sm:p-5">Price / kg</th>
            <th className="p-4 sm:p-5">Status</th>
            <th className="p-4 sm:p-5 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E6E0D4]">
          {products.map((p) => {
            const stockGrams = typeof p.stockGrams === "number"
              ? p.stockGrams
              : typeof p.stock_grams === "number"
              ? p.stock_grams
              : typeof p.quantityAvailableKg === "number"
              ? p.quantityAvailableKg * 1000
              : 0;
            const stockDisplay = formatStock(stockGrams);
            const isAvailable = stockGrams > 0;

            return (
              <tr key={p.id} className="hover:bg-[#FAF8F5]/80 transition">
                <td className="p-4 sm:p-5 font-display font-bold text-[#0F3D2E] text-sm sm:text-base">
                  <Link href={`/product/${p.slug || p.id}`} className="hover:underline hover:text-[#8D3C1B] transition">
                    {p.name}
                  </Link>
                </td>
                <td className="p-4 sm:p-5 text-neutral-600 font-medium font-sans">{p.grade}</td>
                <td className="p-4 sm:p-5 font-subhead text-neutral-700 font-bold">
                  {stockDisplay}
                </td>
                <td className="p-4 sm:p-5 font-display text-[#8D3C1B] text-base font-bold">
                  ₹{p.pricePerKg} <span className="text-[11px] text-muted-foreground font-normal font-sans">/kg</span>
                </td>
                <td className="p-4 sm:p-5">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full font-subhead text-[10px] font-bold uppercase tracking-wider ${
                      isAvailable
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {isAvailable ? "In season" : "Sold out"}
                  </span>
                </td>
                <td className="p-4 sm:p-5 text-right">
                  <button
                    onClick={() => handleAddToCart(p)}
                    disabled={!isAvailable}
                    className="rounded-full bg-[#0F3D2E] px-4 py-2 font-subhead text-xs font-bold text-white hover:bg-[#0c2b20] disabled:opacity-40 transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" /> Buy Harvest
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Helpers for DB mapping & fallback
function mapDbFarmerToFarmer(db: any) {
  const farmSize = db.farm_size_acres != null ? Number(db.farm_size_acres) : (db.total_land_area != null ? Number(db.total_land_area) : null);
  const yearsFarming = db.years_farming != null ? Number(db.years_farming) : null;
  const cropsList: string[] = Array.isArray(db.crops)
    ? db.crops.filter(Boolean)
    : typeof db.crops === "string"
    ? db.crops.split(",").map((c: string) => c.trim()).filter(Boolean)
    : [];

  const { cleanStory } = parseFarmerStoryAndMeta(db.story);
  const ext = resolveFarmerExtData(db);

  // Structured active crops
  const activeCrops =
    ext.crops && ext.crops.length > 0
      ? ext.crops
      : cropsList.map((c: string, idx: number) => ({
          id: `c-db-${idx}`,
          name: c,
          photoUrl: "/assets/prod-almonds.jpg",
          landAcres: farmSize ? Number((farmSize / (cropsList.length || 1)).toFixed(1)) : 0,
          season: "Current Harvest",
          method: db.farming_method || "Natural Farming",
          lastYieldKg: "Seasonal Yield",
        }));

  const totalAcres =
    farmSize ||
    (activeCrops.length > 0
      ? parseFloat(activeCrops.reduce((s, c) => s + (Number(c.landAcres) || 0), 0).toFixed(1))
      : null);

  return {
    id: db.id,
    slug: db.slug,
    name: db.full_name,
    phone: db.phone || "",
    image: resolveFarmerImage(db.portrait_url),
    cover_image_url: db.cover_image_url || null,
    village: db.village || "Local Farm",
    district: db.district || "",
    state: db.state || "",
    region: db.district ? `${db.district}, ${db.state}` : db.state,
    yearsExperience: yearsFarming,
    generationLabel: "Verified Registered Farmer",
    altitudeM: ext.altitudeM || db.altitude || null,
    totalLandAcres: totalAcres,
    method: db.farming_method || "Natural Farming",
    storyPreview: ext.storyPreview || db.headline || (cleanStory ? cleanStory.slice(0, 120) : ""),
    story: cleanStory,
    quote: db.headline || "",
    upcomingHarvests: cropsList.length > 0 ? cropsList : [],
    productSlugs: [],
    ratingAvg: typeof db.rating === "number" && db.rating > 0 ? db.rating : null,
    practices: [
      db.farming_method || "Natural Farming",
      "Zero Chemical Pesticides",
      "Direct Origin Traceable",
    ].filter(Boolean),
    certifications: ["Prajnaa Direct Origin Verified"],
    crops: activeCrops,
    farmPhotos: ext.galleryPhotos && ext.galleryPhotos.length > 0 ? ext.galleryPhotos : [],
    inventoryProducts: [],
    reviews: ext.reviews && ext.reviews.length > 0 ? ext.reviews : [],
  };
}

function getFallbackFarmer(slugStr: string) {
  return {
    id: "f-fallback",
    slug: slugStr,
    name: slugStr ? slugStr.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ") : "Regional Partner Farmer",
    image: "/assets/farmer-1.jpg",
    village: "Valley Farm",
    district: "Mountain Region",
    state: "India",
    region: "Agricultural Belt",
    yearsExperience: 20,
    generationLabel: "Heritage Farmer",
    altitudeM: "1,200m",
    totalLandAcres: 5.0,
    method: "Natural Organic Cultivation",
    storyPreview: "Tending ancestral farmland with zero synthetic inputs.",
    story: "Practicing sustainable natural farming techniques for over two decades, nourishing the soil with organic compost and bio-inputs.",
    quote: "Pure land yields pure food.",
    upcomingHarvests: ["Natural Harvest"],
    productSlugs: [],
    ratingAvg: 4.8,
    practices: ["Natural Organic Cultivation", "Zero Chemical Preservatives"],
    certifications: ["Verified Smallholder Cooperative"],
    crops: [
      {
        id: "c-fb-1",
        name: "Organic Produce",
        photoUrl: "/assets/prod-almonds.jpg",
        landAcres: 3.5,
        season: "Harvest Season",
        method: "Natural Organic Cultivation",
        lastYieldKg: "1,500 kg"
      }
    ],
    inventoryProducts: [],
    reviews: []
  };
}
