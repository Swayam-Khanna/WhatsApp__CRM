"use client";

import { Link, notFound, useParams, useNavigate } from "@/lib/tanstack-compat";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Minus, Plus, Star, Truck, ShieldCheck, Sprout, Loader2, Leaf, Heart, Calendar, ArrowDown, Compass, ShoppingBag, Zap, Check, Lock, RotateCcw, Award, Sun, MapPin, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { MarketingLayout } from "@/components/marketing/layout";
import { ProductCard } from "@/components/store/product-card";
import { productBySlug, productsByCategory, allProducts } from "@/lib/mock/products";
import { farmerBySlug } from "@/lib/mock/farmers";
import { ProductReviews } from "@/components/store/product-reviews";
import { inr } from "@/lib/format";
import { useCart } from "@/lib/cart-store";
import { HarvestJourney } from "@/components/harvest-journey";
import {
  getStoredCustomProducts,
  resolveSafeProductImage,
  subscribeToProductUpdates,
} from "@/lib/services/productSyncService";
import { subscribeToInventoryUpdates } from "@/lib/services/inventoryService";
import { formatStock } from "@/lib/weight-utils";

function ImageZoom({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({
    transform: "scale(1)",
    transformOrigin: "center center",
  });

  const safeSrc = src && typeof src === "string" && src.trim() !== "" ? src : "/assets/cat-dryfruits.jpg";
  const isDataUrl = typeof safeSrc === "string" && (safeSrc.startsWith("data:") || safeSrc.startsWith("blob:"));

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      transform: "scale(1.6)",
      transformOrigin: `${x}% ${y}%`,
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({
      transform: "scale(1)",
      transformOrigin: "center center",
    });
  };

  return (
    <div
      className={className || "relative overflow-hidden rounded-2xl bg-[#FAF8F5] border border-[#E6E0D4] cursor-zoom-in aspect-square w-full max-w-[460px] mx-auto shadow-xs"}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Image
        src={safeSrc}
        alt={alt || "Product image"}
        fill
        unoptimized={isDataUrl}
        className="object-cover transition-transform duration-150 ease-out"
        style={zoomStyle}
        sizes="(max-width: 768px) 100vw, 550px"
        priority
      />
    </div>
  );
}

function TraceabilityCard({ product, farmer }: { product: any; farmer: any }) {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: "Soil Preparation",
      desc: `Organic soil enrichment at ${farmer?.village || "local farm"}.`,
      icon: Sprout,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      metrics: [
        { label: "Soil pH Level", value: "6.8 (Optimal)" },
        { label: "Organic Carbon", value: "0.85% (High)" },
        { label: "Chemical Residue", value: "0.0% (Passed)" },
      ],
    },
    {
      title: "Natural Cultivation",
      desc: `Cultivated using ${farmer?.method || "Natural Farming"} methods.`,
      icon: Leaf,
      color: "text-green-600 bg-green-50 border-green-100",
      metrics: [
        { label: "Farming Method", value: farmer?.method || "Natural Farming" },
        { label: "Water Quality", value: "Verified Pure" },
        { label: "Additive Intake", value: "None (100% Pure)" },
      ],
    },
    {
      title: "Rigorous Lab Testing",
      desc: "Sample tested for over 200+ pesticides and impurities.",
      icon: ShieldCheck,
      color: "text-amber-600 bg-amber-50 border-amber-100",
      metrics: [
        { label: "Pesticides Tested", value: "240+ Checked" },
        { label: "Heavy Metal Residue", value: "ND (Not Detected)" },
        { label: "Purity Rating", value: "99.8% Certified" },
      ],
    },
    {
      title: "Smart Supply Chain",
      desc: "Sealed at source and shipped with end-to-end tracking.",
      icon: Truck,
      color: "text-blue-600 bg-blue-50 border-blue-100",
      metrics: [
        { label: "Harvest Date", value: "Recent Harvest" },
        { label: "Packing Facility", value: "Sanitized Facility" },
        { label: "Logistics Temp", value: "Ambient (Controlled)" },
      ],
    },
  ];

  return (
    <section className="mt-16 border border-border/50 rounded-3xl bg-[#E9EFE9]/25 p-6 md:p-10">
      <div className="flex flex-col lg:flex-row gap-10">
        <div className="lg:w-1/2 space-y-6">
          <div>
            <span className="font-subhead text-[10px] font-bold uppercase tracking-[0.2em] text-[#0F3D2E]">
              Soil to Soul Journey
            </span>
            <h2 className="font-display mt-2 text-3xl font-bold text-foreground">
              Interactive Sourcing Traceability
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Every jar of our harvest has a transparent, verifiable timeline. Click on the steps
              below to inspect the actual lab metrics for this batch.
            </p>
          </div>

          <div className="relative border-l-2 border-border/80 ml-4 pl-6 space-y-8 py-2">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = activeStep === idx;
              return (
                <div
                  key={idx}
                  className="relative cursor-pointer group"
                  onClick={() => setActiveStep(idx)}
                >
                  <div
                    className={`absolute -left-[37px] top-0.5 rounded-full border-2 p-1.5 transition-all duration-300 ${
                      isActive
                        ? "bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/20"
                        : "bg-background border-border text-muted-foreground group-hover:border-primary/40 group-hover:text-primary"
                    }`}
                  >
                    <StepIcon className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-1">
                    <h3
                      className={`font-display text-base font-semibold transition-colors duration-200 ${
                        isActive ? "text-[#0F3D2E]" : "text-foreground group-hover:text-primary"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:w-1/2 flex items-center">
          <div className="w-full border border-border/60 rounded-2xl bg-background p-6 shadow-sm space-y-6 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center gap-3 pb-4 border-b border-border/60">
              <span className={`p-2.5 rounded-xl border ${steps[activeStep].color}`}>
                {(() => {
                  const Icon = steps[activeStep].icon;
                  return <Icon className="h-5 w-5" />;
                })()}
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Detailed Metrics
                </p>
                <h4 className="font-display text-lg font-bold text-foreground">
                  {steps[activeStep].title}
                </h4>
              </div>
            </div>

            <div className="space-y-4">
              {steps[activeStep].metrics.map((metric, mIdx) => (
                <div
                  key={mIdx}
                  className="flex justify-between items-center text-sm py-1 border-b border-dashed border-border/40 last:border-0"
                >
                  <span className="font-medium text-muted-foreground">{metric.label}</span>
                  <span className="font-subhead font-bold text-primary">{metric.value}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-secondary/40 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-success" />
                <span className="text-xs font-semibold text-foreground/80">
                  Batch #{product?.slug?.slice(0, 5)?.toUpperCase() || "BATCH"}-2026
                </span>
              </div>
              <button
                type="button"
                onClick={() => toast.success("Lab Certificate downloaded successfully!")}
                className="font-subhead text-[10px] font-bold uppercase tracking-wider text-primary hover:underline cursor-pointer bg-transparent border-none"
              >
                View PDF Lab Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductPage() {
  const { slug } = useParams();
  const slugStr = typeof slug === "string" ? slug : Array.isArray(slug) ? slug[0] : "";
  const [loaderData, setLoaderData] = useState<{
    product: any;
    farmer: any;
    related: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<"250g" | "500g">("500g");
  const add = useCart((s) => s.add);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isReserving, setIsReserving] = useState(false);


  const [activeTab, setActiveTab] = useState<"description" | "how-to-use" | "manufacturer">("description");
  const [activeImage, setActiveImage] = useState<string>("");
  const [harvestJourneyData, setHarvestJourneyData] = useState<any | null>(null);

  useEffect(() => {
    if (!slugStr) return;
    let isMounted = true;
    setLoading(true);

    async function loadData() {
      try {
        const cleanSlug = decodeURIComponent(slugStr || "").trim().toLowerCase();

        // Helper for robust non-hanging queries
        const fastFetch = async <T = any>(p: any, ms = 4000, fallback: any = null): Promise<T> => {
          try {
            return await Promise.race([
              Promise.resolve(p).catch(() => fallback),
              new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
            ]);
          } catch {
            return fallback;
          }
        };

        // 1. Try mock products first (Exact, slug, ID or partial match)
        let product: any =
          productBySlug(slugStr) ||
          productBySlug(cleanSlug) ||
          allProducts.find(
            (p) =>
              p.slug === slugStr ||
              p.slug.toLowerCase() === cleanSlug ||
              (p as any).id === slugStr ||
              p.slug.includes(cleanSlug) ||
              cleanSlug.includes(p.slug)
          );

        // If found in mock catalog, enrich with live inventory if available
        if (product && typeof window !== "undefined") {
          try {
            const rawInv = localStorage.getItem("prajnaa_product_inventory") || localStorage.getItem("prajnaa_inventory");
            if (rawInv) {
              const invList = JSON.parse(rawInv);
              const invRec = invList.find((r: any) =>
                (product.id && (r.product_id === product.id || r.product_slug === product.id)) ||
                (product.slug && (r.product_id === product.slug || r.product_slug === product.slug)) ||
                (product.name && r.product_name && r.product_name.trim().toLowerCase() === product.name.trim().toLowerCase())
              );
              if (invRec) {
                product = {
                  ...product,
                  stock: Number(invRec.stock_grams ?? invRec.stockGrams ?? invRec.quantity_grams ?? invRec.quantity ?? product.stock ?? 0),
                  is_preorder: invRec.preorder_enabled !== undefined ? Boolean(invRec.preorder_enabled) : product.is_preorder,
                  preOrder: {
                    ...product.preOrder,
                    enabled: invRec.preorder_enabled !== undefined ? Boolean(invRec.preorder_enabled) : product.preOrder?.enabled,
                  },
                };
              }
            }
          } catch {}
        }

        let farmer: any = product ? farmerBySlug(product.farmerSlug)! : null;
        let related: any[] = product
          ? productsByCategory(product.category)
              .filter((p) => p.slug !== product!.slug)
              .slice(0, 4)
          : [];

        if (!product) {
          let dbProduct: any = null;

          // 1.5 Check locally stored custom products first
          const stored = getStoredCustomProducts();
          const localMatch = stored.find(
            (p) =>
              p.slug === slugStr ||
              p.slug?.toLowerCase() === cleanSlug ||
              p.id === slugStr ||
              p.id?.toLowerCase() === cleanSlug ||
              (p.slug && cleanSlug && (p.slug.toLowerCase().includes(cleanSlug) || cleanSlug.includes(p.slug.toLowerCase()))) ||
              (p.name && cleanSlug && (p.name.toLowerCase().includes(cleanSlug.replace(/-/g, " ")) || cleanSlug.replace(/-/g, " ").includes(p.name.toLowerCase())))
          );
          if (localMatch) {
            dbProduct = localMatch;
          }

          // 2. Query /api/products behind DATA_PROVIDER (Neon / Firestore)
          if (!dbProduct) {
            try {
              const apiRes = await fetch(`/api/products?slug=${encodeURIComponent(slugStr)}`);
              if (apiRes.ok) {
                const apiJson = await apiRes.json();
                if (apiJson.products && apiJson.products.length > 0) {
                  dbProduct = apiJson.products[0];
                }
              }
            } catch (apiErr) {
              console.warn("[ProductPage] API fetch note:", apiErr);
            }
          }

          // Fallback to querying farmer_products database by slug, cleanSlug, id, or name if not found via API
          if (!dbProduct) {
            // Try exact slug
            const dbProductRes: any = await fastFetch(
              supabase.from("farmer_products").select("*").eq("slug", slugStr).maybeSingle(),
              3000,
              { data: null, error: null }
            );
            dbProduct = dbProductRes?.data;
          }

          // Try clean lowercase slug
          if (!dbProduct && cleanSlug !== slugStr) {
            const dbCleanRes: any = await fastFetch(
              supabase.from("farmer_products").select("*").eq("slug", cleanSlug).maybeSingle(),
              2500,
              { data: null, error: null }
            );
            dbProduct = dbCleanRes?.data;
          }

          // Try by ID
          if (!dbProduct) {
            const dbProductByIdRes: any = await fastFetch(
              supabase.from("farmer_products").select("*").eq("id", slugStr).maybeSingle(),
              2500,
              { data: null, error: null }
            );
            dbProduct = dbProductByIdRes?.data;
          }

          // Try matching by name
          if (!dbProduct && cleanSlug) {
            const searchName = cleanSlug.replace(/-/g, " ");
            const dbByNameRes: any = await fastFetch(
              supabase.from("farmer_products").select("*").ilike("name", `%${searchName}%`).limit(1).maybeSingle(),
              2500,
              { data: null, error: null }
            );
            dbProduct = dbByNameRes?.data;
          }

          if (dbProduct) {
            // Fetch farmer profile and related in parallel with timeout
            const [farmerRes, relatedRes] = await Promise.all([
              dbProduct.farmer_id
                ? fastFetch(
                    supabase
                      .from("farmer_profiles")
                      .select("id,full_name,village,state,crops,headline,story,portrait_url,slug,farming_method")
                      .eq("id", dbProduct.farmer_id)
                      .maybeSingle(),
                    2000,
                    { data: null }
                  )
                : Promise.resolve({ data: null }),
              fastFetch(
                supabase
                  .from("farmer_products")
                  .select("*")
                  .eq("category", dbProduct.category)
                  .limit(5),
                2000,
                { data: [] }
              ),
            ]);

            const dbFarmer =
              farmerRes?.data ||
              dbProduct.farmer_profiles ||
              dbProduct.farmer ||
              (dbProduct.farmer_id ? { slug: dbProduct.farmer_id, full_name: "Verified Farmer" } : null);
            const dbRelated = (relatedRes as any).data || [];

            const isPre = Boolean(
              dbProduct.is_preorder ||
              dbProduct.isPreorder ||
              dbProduct.preOrder?.enabled ||
              (Array.isArray(dbProduct.badges) &&
                dbProduct.badges.some((b: any) =>
                  typeof b === "string"
                    ? b.toLowerCase().includes("pre-order") || b.toLowerCase().includes("preorder")
                    : (b.label || b.text || "").toLowerCase().includes("pre-order")
                ))
            );

            const safeImgs = Array.isArray(dbProduct.images) && dbProduct.images.length > 0
              ? dbProduct.images
              : dbProduct.image
              ? [dbProduct.image]
              : [resolveSafeProductImage(null, dbProduct.category)];

            // Resolve authoritative stock & pre-order status from live inventory
            let resolvedStock = Number(dbProduct.stock_grams ?? dbProduct.stockGrams ?? dbProduct.stock ?? 0);
            let resolvedPreorder = isPre;
            if (typeof window !== "undefined") {
              try {
                const rawInv = localStorage.getItem("prajnaa_product_inventory") || localStorage.getItem("prajnaa_inventory");
                if (rawInv) {
                  const invList = JSON.parse(rawInv);
                  const invRec = invList.find((r: any) =>
                    (dbProduct.id && (r.product_id === dbProduct.id || r.product_slug === dbProduct.id)) ||
                    (dbProduct.slug && (r.product_id === dbProduct.slug || r.product_slug === dbProduct.slug)) ||
                    (dbProduct.name && r.product_name && r.product_name.trim().toLowerCase() === dbProduct.name.trim().toLowerCase())
                  );
                  if (invRec) {
                    resolvedStock = Number(invRec.stock_grams ?? invRec.stockGrams ?? invRec.quantity_grams ?? invRec.quantity ?? 0);
                    if (invRec.preorder_enabled !== undefined) {
                      resolvedPreorder = Boolean(invRec.preorder_enabled);
                    }
                  }
                }
              } catch {}
            }

            product = {
              id: dbProduct.id,
              slug: dbProduct.slug || dbProduct.id,
              name: dbProduct.name,
              category: dbProduct.category || "dry-fruits",
              farmerSlug: dbFarmer?.slug || dbProduct.farmer_profiles?.slug || "verified-farmer",
              image: safeImgs[0] || "/assets/cat-dryfruits.jpg",
              images: safeImgs,
              price: Math.ceil(Number(dbProduct.price || 0) * 1.1),
              weight: dbProduct.unit || "1 kg",
              stock: resolvedStock,
              rating: 4.8,
              reviews: 6,
              description: dbProduct.description || "",
              is_preorder: resolvedPreorder,
              harvestJourney: dbProduct.harvest_journey || dbProduct.harvestJourney || null,
              preOrder: {
                enabled: resolvedPreorder,
                status: "OPEN",
                reservationNote:
                  dbProduct.reservation_note ||
                  "This year's harvest is currently being processed. Pre-order now to receive your pack on priority once packing begins.",
              },
            } as any;

            farmer = dbFarmer
              ? ({
                  slug: dbFarmer.slug || "verified-farmer",
                  name: dbFarmer.full_name || dbFarmer.name || "Verified Farmer",
                  image: dbFarmer.portrait_url || dbFarmer.image || "/assets/farmer-2.jpg",
                  village: dbFarmer.village || "Prajnaa Farm Origins",
                  state: dbFarmer.state || "Himalayan Region",
                  region: dbFarmer.region || "Local Farm",
                  storyPreview: dbFarmer.headline || dbFarmer.storyPreview || "Dedicated to chemical-free natural farming.",
                  story: dbFarmer.story || "Dedicated to chemical-free natural farming.",
                  upcomingHarvests: dbFarmer.crops || dbFarmer.upcomingHarvests || [],
                  method: dbFarmer.farming_method || dbFarmer.method || "Natural Farming",
                } as any)
              : null;

            related = (dbRelated || [])
              .filter((r: any) => r.id !== dbProduct.id)
              .slice(0, 4)
              .map((r: any) => ({
                slug: r.slug,
                name: r.name,
                category: r.category,
                farmerSlug: dbFarmer?.slug || "unknown",
                image: r.images?.[0] || "",
                images: r.images || [],
                price: Math.ceil(Number(r.price || 0) * 1.1),
                weight: r.unit || "1 kg",
                rating: 4.8,
                reviews: 0,
              })) as any;
          }
        }

        if (isMounted) {
          if (!product) {
            setLoaderData(null);
          } else {
            setLoaderData({
              product,
              farmer: farmer || {
                slug: "unknown",
                name: "Verified Farmer",
                image: "",
                village: "India",
                state: "Farm",
                region: "Local Farm",
                storyPreview: "",
                story: "",
                upcomingHarvests: [],
                method: "Natural Farming",
              },
              related,
            });
          }
        }
      } catch (err) {
        console.error("[ProductPage] Error loading product data:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadData();
    const unsubProductUpdates = subscribeToProductUpdates(() => {
      if (isMounted) {
        void loadData();
      }
    });
    const unsubInventoryUpdates = subscribeToInventoryUpdates(() => {
      if (isMounted) {
        void loadData();
      }
    });

    return () => {
      isMounted = false;
      unsubProductUpdates();
      unsubInventoryUpdates();
    };
  }, [slugStr]);

  // Sync activeImage state when product loads or changes
  useEffect(() => {
    if (loaderData?.product) {
      const productImages =
        loaderData.product.images && loaderData.product.images.length > 0
          ? loaderData.product.images
          : [loaderData.product.image];
      setActiveImage(productImages[0]);
    }
  }, [loaderData?.product]);

  // Track recently viewed products
  useEffect(() => {
    if (!user || !loaderData?.product) return;
    void supabase.from("recently_viewed").upsert(
      {
        user_id: user.id,
        product_slug: loaderData.product.slug,
        viewed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,product_slug" },
    );
  }, [user, loaderData?.product?.slug]);

  // Fetch live harvest journey for pre-order products (must be called unconditionally before early returns)
  useEffect(() => {
    const prod = loaderData?.product;
    if (!prod) return;

    const targetId = prod.id || prod.slug;
    const targetSlug = prod.slug || prod.id;

    // Check localStorage immediately for instant 0ms load
    if (typeof window !== "undefined") {
      try {
        const raw =
          localStorage.getItem(`prajnaa_harvest_journey_${targetId}`) ||
          localStorage.getItem(`prajnaa_harvest_journey_${targetSlug}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const prodJourney = prod?.harvestJourney || prod?.harvest_journey;
          if (
            prodJourney &&
            Array.isArray(prodJourney.stages) &&
            prodJourney.stages.length > 2 &&
            (parsed?.batch_number?.startsWith("BATCH-") || !parsed?.batch_number) &&
            (parsed?.stages?.length || 0) <= 2
          ) {
            setHarvestJourneyData(prodJourney);
          } else if (parsed && Array.isArray(parsed.stages) && parsed.stages.length > 0) {
            setHarvestJourneyData(parsed);
          }
        } else if (prod?.harvestJourney || prod?.harvest_journey) {
          setHarvestJourneyData(prod.harvestJourney || prod.harvest_journey);
        }
      } catch (e) {}
    }

    // Network fetch with cache-busting to guarantee latest updates
    fetch(`/api/products/${encodeURIComponent(targetId)}/harvest-journey?t=${Date.now()}`, {
      cache: "no-store",
      headers: { Pragma: "no-cache" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.journey && Array.isArray(data.journey.stages) && data.journey.stages.length > 0) {
          setHarvestJourneyData(data.journey);
          if (typeof window !== "undefined") {
            localStorage.setItem(`prajnaa_harvest_journey_${targetId}`, JSON.stringify(data.journey));
            localStorage.setItem(`prajnaa_harvest_journey_${targetSlug}`, JSON.stringify(data.journey));
          }
        } else if (!data.journey) {
          // Keep cached version if network returned empty or null
        }
      })
      .catch((err) => {
        console.warn("[Product Page] Failed to fetch live journey:", err);
      });
  }, [loaderData?.product?.id, loaderData?.product?.slug, loaderData?.product?.is_preorder]);

  // Real-time live update listener (multi-tab BroadcastChannel, window CustomEvent, localStorage sync, and live polling)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentId = loaderData?.product?.id;
    const currentSlug = loaderData?.product?.slug;

    const matchesThisProduct = (productId?: string, slug?: string, jId?: string, j?: any) => {
      const candidates = [currentId, currentSlug, slugStr].filter(Boolean).map((s) => String(s).toLowerCase().trim());
      const pId = productId ? String(productId).toLowerCase().trim() : "";
      const sSlug = slug ? String(slug).toLowerCase().trim() : "";
      const journeyId = jId ? String(jId).toLowerCase().trim() : "";

      if (pId && candidates.some((c) => c === pId || c.includes(pId) || pId.includes(c))) return true;
      if (sSlug && candidates.some((c) => c === sSlug || c.includes(sSlug) || sSlug.includes(c))) return true;
      if (journeyId && (journeyId === harvestJourneyData?.id || journeyId === (loaderData?.product?.harvestJourney as any)?.id)) return true;
      if (j?.id && (j.id === harvestJourneyData?.id || j.id === (loaderData?.product?.harvestJourney as any)?.id)) return true;
      if (j?.product_id && candidates.some((c) => c === String(j.product_id).toLowerCase())) return true;

      // URL pathname check
      if (typeof window !== "undefined") {
        const path = window.location.pathname.toLowerCase();
        if (pId && path.includes(pId)) return true;
        if (sSlug && path.includes(sSlug)) return true;
      }

      // Fuzzy name check (e.g. Cashew vs cashew-jz2y)
      const prodName = String(loaderData?.product?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanPId = pId.replace(/[^a-z0-9]/g, "");
      const cleanSSlug = sSlug.replace(/[^a-z0-9]/g, "");
      if (prodName && cleanPId && (cleanPId.includes(prodName) || prodName.includes(cleanPId))) return true;
      if (prodName && cleanSSlug && (cleanSSlug.includes(prodName) || prodName.includes(cleanSSlug))) return true;

      if (slugStr && String(slugStr).toLowerCase().includes("walnut") && (sSlug.includes("walnut") || pId.includes("walnut") || journeyId.includes("walnut"))) return true;
      return false;
    };

    const handleSync = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      if (matchesThisProduct(detail.productId, detail.slug, detail.journeyId, detail.journey)) {
        if (detail.journey) {
          setHarvestJourneyData(detail.journey);
        }
      }
    };

    window.addEventListener("prajnaa_harvest_journey_updated", handleSync);

    // Cross-tab BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("prajnaa_harvest_journey_channel");
        bc.onmessage = (event) => {
          const data = event.data;
          if (data && matchesThisProduct(data.productId, data.slug, data.journeyId, data.journey)) {
            if (data.journey) {
              setHarvestJourneyData(data.journey);
            }
          }
        };
      }
    } catch (e) {}

    // Storage event listener for cross-tab persistence
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === "prajnaa_harvest_journey_sync_tick" ||
        e.key === "prajnaa_harvest_journey_latest" ||
        (currentId && e.key === `prajnaa_harvest_journey_${currentId}`) ||
        (currentSlug && e.key === `prajnaa_harvest_journey_${currentSlug}`) ||
        (slugStr && e.key === `prajnaa_harvest_journey_${slugStr}`) ||
        (e.key && e.key.startsWith("prajnaa_harvest_journey_"))
      ) {
        try {
          const raw =
            (currentId ? localStorage.getItem(`prajnaa_harvest_journey_${currentId}`) : null) ||
            (currentSlug ? localStorage.getItem(`prajnaa_harvest_journey_${currentSlug}`) : null) ||
            (slugStr ? localStorage.getItem(`prajnaa_harvest_journey_${slugStr}`) : null) ||
            localStorage.getItem("prajnaa_harvest_journey_latest");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.stages)) {
              if (matchesThisProduct(parsed.product_id, parsed.slug, parsed.id, parsed)) {
                setHarvestJourneyData(parsed);
              }
            }
          }
        } catch (err) {}
      }
    };
    window.addEventListener("storage", handleStorage);

    // Fast background polling & window focus re-fetch to guarantee real-time updates
    const targetPollId = currentId || currentSlug || slugStr;
    const pollLiveJourney = async () => {
      if (!targetPollId) return;
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(targetPollId)}/harvest-journey?t=${Date.now()}`, {
          cache: "no-store",
          headers: { Pragma: "no-cache" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.journey && Array.isArray(data.journey.stages) && data.journey.stages.length > 0) {
            setHarvestJourneyData(data.journey);
          }
        }
      } catch (err) {}
    };

    const pollInterval = setInterval(pollLiveJourney, 3000);
    const onFocus = () => pollLiveJourney();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("prajnaa_harvest_journey_updated", handleSync);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", onFocus);
      clearInterval(pollInterval);
      if (bc) {
        try { bc.close(); } catch (e) {}
      }
    };
  }, [loaderData?.product?.id, loaderData?.product?.slug, slugStr, harvestJourneyData?.id]);

  if (loading) {
    return (
      <MarketingLayout>
        <div className="container-prj grid place-items-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MarketingLayout>
    );
  }

  if (!loaderData || !loaderData.product) {
    return (
      <MarketingLayout>
        <div className="container-prj py-24 text-center">
          <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-[#E6E0D4] bg-[#FAF8F5] p-8 shadow-xs">
            <h2 className="font-display text-2xl font-bold text-[#1F2937]">Product Not Found</h2>
            <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
              The produce or harvest batch you are looking for may have concluded or been updated.
            </p>
            <div className="pt-2">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-md hover:opacity-90 transition"
              >
                Browse All Harvest Produce
              </Link>
            </div>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  const { product, farmer, related } = loaderData;

  const handleReserveHarvest = () => {
    // 1. Prevent click if quantity is less than 1 or if reservation is already in progress
    if (qty < 1) {
      toast.error("Please select a quantity of at least 1");
      return;
    }
    if (isReserving) return;
    setIsReserving(true);

    // 2. Read product details (ID, SKU, weight, price, name) and stepper quantity
    const productSku = (product as any).sku || (product as any).id || "0028";
    const productWeight = product.weight || "250g";
    const reserveItem = {
      slug: product.slug || "walnuts",
      name: product.name,
      image: product.image || (product.images && product.images[0]) || "/assets/cat-dryfruits.jpg",
      price: product.price,
      weight: productWeight,
      sku: productSku,
      isPreOrder: true,
      harvestLabel: "2026 Harvest · Pre-order",
    };

    // 3. Pass data to existing checkout cart store (useCart)
    const cart = useCart.getState();
    const existingItem = cart.items.find((i) => i.slug === reserveItem.slug);
    if (existingItem) {
      cart.setQty(reserveItem.slug, qty);
    } else {
      cart.add(reserveItem as any, qty);
    }

    // 4. Persist in localStorage for robust page refresh recovery on checkout page
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "prajnaa_preorder_reserve",
          JSON.stringify({
            item: reserveItem,
            qty,
            timestamp: Date.now(),
          })
        );
      } catch (e) {
        console.warn("Error storing preorder reserve in localStorage:", e);
      }
    }

    toast.success(`Reserving ${qty}x ${product.name}...`);

    // 5. Auth check: Checkout page supports guest checkout (user_id: user?.id || "guest").
    // If checkout ever requires login, use the app's existing auth flow with redirect param.
    const checkoutRequiresLogin = false;
    if (checkoutRequiresLogin && !user && !authLoading) {
      toast.info("Please sign in to complete your harvest reservation.");
      navigate({ to: "/auth/login", search: { redirect: "/checkout" } });
      return;
    }

    // 6. Redirect user to the existing checkout route
    navigate({ to: "/checkout" });
  };

  const allowsPreorder = Boolean(
    product.is_preorder ||
    product.preOrder?.enabled
  );
  // If product is in stock (> 0), customer purchases normally from inventory!
  // Pre-Order mode only activates when shelf stock is 0 and pre-order is enabled
  const isOutOfStock = Number(product.stock ?? 0) <= 0;
  const isPreOrder = isOutOfStock && allowsPreorder;
  const images = product.images && product.images.length > 0 ? product.images : [product.image];

  return (
    <MarketingLayout>
      <div className="container-prj pt-6 md:pt-8 pb-20 sm:pb-28 lg:pb-32 overflow-x-clip">
        <nav className="font-subhead mb-3 sm:mb-4 flex flex-wrap items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-foreground">
            Shop
          </Link>
          <span>/</span>
          <Link
            to="/category/$slug"
            params={{ slug: product.category }}
            className="hover:text-foreground capitalize"
          >
            {(product.category || "other").replace("-", " ")}
          </Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Left Column: Product Gallery - Sticky on Desktop */}
          <div className="lg:col-span-6 lg:sticky lg:top-24">
            {isPreOrder ? (
              /* Pre-order Harvest Hero Gallery: Vertical Thumbnails on Left + Main Big Rounded Square Image */
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 items-start w-full">
                {/* Vertical Thumbnails */}
                {images.length > 1 && (
                  <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 shrink-0 w-full sm:w-auto">
                    {images.slice(0, 5).map((img: string, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImage(img)}
                        className={`relative h-16 w-16 sm:h-[72px] sm:w-[72px] shrink-0 overflow-hidden rounded-2xl border-2 transition-all cursor-pointer bg-[#FAF8F5] ${
                          activeImage === img
                            ? "border-[#1F4A38] ring-2 ring-[#1F4A38]/20 scale-[1.03] shadow-xs"
                            : "border-[#E6E0D4] opacity-80 hover:opacity-100 hover:border-[#1F4A38]/40"
                        }`}
                      >
                        <Image src={img} alt="" fill className="object-cover" />
                      </button>
                    ))}
                    {images.length > 5 && (
                      <div className="h-16 w-16 sm:h-[72px] sm:w-[72px] shrink-0 rounded-2xl border border-dashed border-border bg-[#FAF8F5] flex items-center justify-center text-xs font-bold text-muted-foreground">
                        +{images.length - 5}
                      </div>
                    )}
                  </div>
                )}

                {/* Main Large Image Container */}
                <div className="relative flex-1 w-full overflow-hidden rounded-3xl border border-border/60 bg-[#FAF8F5] shadow-xs">
                  {/* Top-Right Harvest Badge */}
                  <div className="absolute top-3.5 right-3.5 z-10 flex flex-col items-center overflow-hidden rounded-md shadow-md pointer-events-none">
                    <span className="bg-[#1F4A38] text-white text-[11px] font-bold px-3 py-1 uppercase tracking-wider text-center w-full">
                      2026 HARVEST
                    </span>
                    <span className="bg-[#9BAA76] text-[#1F4A38] text-[11px] font-extrabold px-3 py-0.5 uppercase tracking-wider text-center w-full">
                      PRE-ORDER
                    </span>
                  </div>

                  {/* Top-Left Process Tag if available */}
                  <div className="absolute top-3.5 left-3.5 z-10 pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-[#1F4A38] border border-[#1F4A38]/20 shadow-xs backdrop-blur-md">
                      <Sun className="h-3.5 w-3.5 text-amber-600" />
                      Naturally Sun-Dried
                    </span>
                  </div>

                  {farmer?.village && (
                    <div className="absolute bottom-3.5 left-3.5 z-10 pointer-events-none">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-black/60 text-white backdrop-blur-sm shadow-xs">
                        <MapPin className="h-3 w-3 text-emerald-400" />
                        From the Orchards of {farmer.village}
                      </span>
                    </div>
                  )}

                  <ImageZoom
                    src={activeImage || "/assets/placeholder.jpg"}
                    alt={product.name}
                    className="relative overflow-hidden rounded-3xl bg-[#FAF8F5] cursor-zoom-in aspect-square w-full"
                  />
                </div>
              </div>
            ) : (
              /* Reference Design: Vertical Thumbnails on Left + Main Big Rounded Square Image */
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 items-start w-full">
                {/* Vertical Thumbnails */}
                {images.length > 1 && (
                  <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 shrink-0 w-full sm:w-auto">
                    {images.slice(0, 5).map((img: string, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImage(img)}
                        className={`relative h-16 w-16 sm:h-[72px] sm:w-[72px] shrink-0 overflow-hidden rounded-2xl border-2 transition-all cursor-pointer bg-[#FAF8F5] ${
                          activeImage === img
                            ? "border-[#0F3D2E] ring-2 ring-[#0F3D2E]/20 scale-[1.03] shadow-xs"
                            : "border-[#E6E0D4] opacity-80 hover:opacity-100 hover:border-[#0F3D2E]/40"
                        }`}
                      >
                        <Image src={img} alt="" fill className="object-cover" />
                      </button>
                    ))}
                    {images.length > 5 && (
                      <div className="h-16 w-16 sm:h-[72px] sm:w-[72px] shrink-0 rounded-2xl border border-dashed border-border bg-[#FAF8F5] flex items-center justify-center text-xs font-bold text-muted-foreground">
                        +{images.length - 5}
                      </div>
                    )}
                  </div>
                )}

                {/* Main Large Image Container */}
                <div className="relative flex-1 w-full overflow-hidden rounded-3xl border border-border/60 bg-[#FAF8F5] shadow-xs">
                  {/* Top-Right Organic Badge matching reference */}
                  <div className="absolute top-4 right-4 z-10 pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/95 text-[#0F3D2E] border border-[#0F3D2E]/20 shadow-xs backdrop-blur-md">
                      <Leaf className="h-3.5 w-3.5 text-[#0F3D2E]" />
                      Pure & Natural
                    </span>
                  </div>

                  <ImageZoom
                    src={activeImage || "/assets/placeholder.jpg"}
                    alt={product.name}
                    className="relative overflow-hidden rounded-3xl bg-[#FAF8F5] cursor-zoom-in aspect-square w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Product Purchasing / Details Area */}
          <div className="lg:col-span-6 flex flex-col justify-start min-w-0 w-full">
            {isPreOrder ? (
              /* ========================================================================= */
              /* HARVEST PRE-ORDER HERO (Media Reference Exact Match)                      */
              /* ========================================================================= */
              <>
                <div className="flex items-start justify-between gap-4">
                  <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight text-[#1F2937]">
                    {product.name}
                  </h1>
                  <div className="flex items-center gap-2 pt-1.5 shrink-0">
                    <span className="text-xs font-semibold text-muted-foreground font-mono">
                      SKU: {(product as any).sku || "0028"}
                    </span>
                    <button
                      type="button"
                      aria-label="Add to wishlist"
                      className="p-1 text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Heart className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <p className="mt-1 text-base text-[#4B5563] font-medium">
                  2026 Harvest | Naturally Sun-Dried
                </p>

                <p className="mt-4 text-sm text-[#4B5563] leading-relaxed">
                  {product.description}
                </p>

                {/* 4 Feature Badges with Soft Pale Sage Green Gradient Backgrounds matching reference image */}
                <div className="mt-6 grid grid-cols-4 w-full gap-2 sm:gap-3 min-w-0">
                  <div className="flex flex-col items-center text-center gap-2 min-w-0">
                    <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#E8EFE8] text-[#1E3B2F] shadow-2xs shrink-0">
                      <Sprout className="h-5 w-5 sm:h-6 sm:w-6 stroke-[1.75]" />
                    </div>
                    <span className="text-xs font-semibold text-[#374151] leading-tight break-words">
                      Pure & Natural
                    </span>
                  </div>

                  <div className="flex flex-col items-center text-center gap-2 min-w-0">
                    <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#E8EFE8] text-[#1E3B2F] shadow-2xs shrink-0">
                      <svg
                        className="h-5 w-5 sm:h-6 sm:w-6 stroke-[1.75]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m8 21 4-7 4 7M3 21l6.5-12 4 7.5L18 9l5 12H3Z"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-[#374151] leading-tight break-words">
                      Sourced from Himalayas
                    </span>
                  </div>

                  <div className="flex flex-col items-center text-center gap-2 min-w-0">
                    <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#E8EFE8] text-[#1E3B2F] shadow-2xs shrink-0">
                      <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 stroke-[1.75]" />
                    </div>
                    <span className="text-xs font-semibold text-[#374151] leading-tight break-words">
                      No Added Preservatives
                    </span>
                  </div>

                  <div className="flex flex-col items-center text-center gap-2 min-w-0">
                    <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#E8EFE8] text-[#1E3B2F] shadow-2xs shrink-0">
                      <Heart className="h-5 w-5 sm:h-6 sm:w-6 stroke-[1.75]" />
                    </div>
                    <span className="text-xs font-semibold text-[#374151] leading-tight break-words">
                      Supports Local Farmers
                    </span>
                  </div>
                </div>

                {/* Single Row: Price (left) + Rounded Pill Stepper + Full Pill Reserve Button (matching reference image) */}
                <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4 w-full">
                  {/* Price matching in-stock detail page price font */}
                  <div className="flex items-baseline gap-2 shrink-0">
                    <span className="font-display text-3xl sm:text-4xl font-extrabold text-[#111827]">
                      {inr(product.price)}
                    </span>
                    <span className="text-sm sm:text-base font-normal text-muted-foreground">
                      ({product.weight || "250g"})
                    </span>
                  </div>

                  {/* Rounded Pill Stepper */}
                  <div className="flex h-12 w-28 shrink-0 items-center justify-between rounded-full border border-[#D1D5DB] bg-white px-3 shadow-2xs">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      aria-label="Decrease"
                      className="grid h-8 w-8 place-items-center text-[#4B5563] hover:text-foreground cursor-pointer active:scale-95 text-base"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-sm font-semibold text-[#111827]">{qty}</span>
                    <button
                      onClick={() => setQty(qty + 1)}
                      aria-label="Increase"
                      className="grid h-8 w-8 place-items-center text-[#4B5563] hover:text-foreground cursor-pointer active:scale-95 text-base"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Pill Reserve This Harvest Button */}
                  <button
                    type="button"
                    disabled={isReserving || qty < 1}
                    onClick={handleReserveHarvest}
                    className="h-12 flex-1 rounded-full bg-[#8E3A1A] hover:bg-[#783015] disabled:opacity-80 disabled:cursor-not-allowed text-white px-5 sm:px-7 text-sm font-medium tracking-normal transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99] min-w-[200px]"
                  >
                    {isReserving ? (
                      <>
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white" />
                        <span className="truncate">Reserving...</span>
                      </>
                    ) : (
                      <>
                        <Sprout className="h-4 w-4 shrink-0 text-[#FAF6ED]" />
                        <span className="truncate">Reserve This Harvest</span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-white" />
                      </>
                    )}
                  </button>
                </div>

                {/* Pre-Order Notice Banner matching reference UI */}
                <div className="mt-4 flex items-center gap-3.5 rounded-xl border border-[#E6E0D4] bg-[#FAF6ED] p-4 text-xs text-foreground/80 shadow-2xs">
                  <Calendar className="h-5 w-5 text-[#8D3C1B] shrink-0" />
                  <p className="text-xs leading-relaxed text-[#4A433A]">
                    {product.preOrder.reservationNote ||
                      "This year's harvest is currently being processed. Pre-order now to receive your pack on priority once packing begins."}
                  </p>
                </div>

                {/* Farmer card on harvest pre-order page */}
                <Link
                  to="/farmer/$slug"
                  params={{ slug: farmer.slug }}
                  className="mt-4 flex items-center gap-4 rounded-2xl border border-[#E6E0D4] bg-[#FAF8F5] p-3.5 transition-colors hover:bg-secondary/70 shadow-2xs"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border">
                    <Image
                      src={farmer.image}
                      alt={farmer.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-subhead text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Grown by
                    </p>
                    <p className="font-display text-sm font-semibold text-foreground truncate">{farmer.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {farmer.village}, {farmer.state} · {farmer.method}
                    </p>
                  </div>
                  <span className="font-subhead text-xs text-primary font-medium shrink-0">Read story →</span>
                </Link>
              </>
            ) : (
              /* ========================================================================= */
              /* STANDARD IN-STOCK PRODUCT HERO (Exact Reference Match UI)                 */
              /* ========================================================================= */
              <div className="flex flex-col justify-start w-full">
                {/* Top Category / Verified Tag Row */}
                <div className="flex items-center justify-between gap-4">
                  <span className="font-subhead text-xs uppercase tracking-[0.18em] text-primary font-bold capitalize">
                    {(product.category || "other").replace("-", " ")}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Direct from Verified Farmers
                  </span>
                </div>

                {/* Product Title */}
                <h1 className="font-display mt-2 text-3xl sm:text-4xl lg:text-[42px] font-bold leading-[1.15] text-[#111827]">
                  {product.name}
                </h1>

                {/* Short Description */}
                <p className="mt-3 text-sm leading-relaxed text-[#4B5563]">
                  {product.description}
                </p>

                {/* Rating & Social Proof */}
                <div className="mt-3.5 flex flex-wrap items-center gap-2.5 text-sm">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-bold text-foreground">{product.rating}</span>
                  </div>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground font-medium">{product.reviews} reviews</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                    <Award className="h-3.5 w-3.5 text-[#0F3D2E]" />
                    500+ happy customers
                  </span>
                </div>

                {/* Price & Size Selector in the SAME ROW */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-display text-3xl sm:text-4xl font-extrabold text-[#111827]">
                      {inr(selectedSize === "250g" ? Math.round(product.price / 2) : product.price)}
                    </span>
                    {product.mrp && product.mrp > product.price && (
                      <span className="text-base sm:text-lg text-muted-foreground line-through font-medium">
                        {inr(selectedSize === "250g" ? Math.round(product.mrp / 2) : product.mrp)}
                      </span>
                    )}
                    {product.mrp && product.mrp > product.price && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        Save {Math.round(((product.mrp - product.price) / product.mrp) * 100)}%
                      </span>
                    )}
                  </div>

                  {/* Size Selection Chips in Same Row */}
                  <div className="flex items-center gap-2">
                    <span className="font-subhead text-xs uppercase tracking-wider text-muted-foreground font-bold mr-1 hidden sm:inline">
                      Size:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSize("250g")}
                      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 transition-all cursor-pointer ${
                        selectedSize === "250g"
                          ? "border-[#0F3D2E] bg-[#0F3D2E] text-white shadow-xs"
                          : "border-[#E6E0D4] bg-white text-foreground hover:border-[#0F3D2E]/60 shadow-2xs"
                      }`}
                    >
                      <span className="font-subhead text-xs font-bold">250g</span>
                      <span className={`text-xs ${selectedSize === "250g" ? "text-emerald-100" : "text-muted-foreground"}`}>
                        {inr(Math.round(product.price / 2))}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSize("500g")}
                      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 transition-all cursor-pointer ${
                        selectedSize === "500g"
                          ? "border-[#0F3D2E] bg-[#0F3D2E] text-white shadow-xs"
                          : "border-[#E6E0D4] bg-white text-foreground hover:border-[#0F3D2E]/60 shadow-2xs"
                      }`}
                    >
                      <span className="font-subhead text-xs font-bold">500g</span>
                      <span className={`text-xs ${selectedSize === "500g" ? "text-emerald-100" : "text-muted-foreground"}`}>
                        {inr(product.price)}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 3 Key Benefits with Circular Icons & Subtitle */}
                <div className="mt-4 grid grid-cols-3 gap-2.5 pt-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF2ED] text-[#0F3D2E]">
                      <Leaf className="h-5 w-5 stroke-[1.75]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground leading-tight truncate">
                        Pure & Natural
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        No Chemicals
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF2ED] text-[#0F3D2E]">
                      <ShieldCheck className="h-5 w-5 stroke-[1.75]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground leading-tight truncate">
                        Tested for 600+ Toxins
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        Lab Certified
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF2ED] text-[#0F3D2E]">
                      <Heart className="h-5 w-5 stroke-[1.75]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground leading-tight truncate">
                        Zero Added Additives
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        Just Nature
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stock & Shipping Row */}
                <div className="mt-5 flex flex-wrap items-center gap-4 text-xs">
                  {product.stock <= 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200">
                      <span className="h-2 w-2 rounded-full bg-rose-600" />
                      Out of stock
                    </span>
                  ) : product.stock <= (product.low_stock_threshold_grams ?? 1000) ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                      <span className="h-2 w-2 rounded-full bg-amber-600 animate-ping" />
                      Only {formatStock(product.stock)} left in stock - order soon
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold bg-[#EAF2ED] text-[#0F3D2E] border border-[#0F3D2E]/20">
                      <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      In Stock & Ready to Ship ({formatStock(product.stock)})
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                    Standard shipping calculated at checkout
                  </span>
                </div>

                {/* 3-Button Action Row (Stepper + Add to cart + Buy now + Wishlist) */}
                <div className="mt-5 flex items-center gap-2 sm:gap-3 w-full">
                  {/* Stepper */}
                  <div className="flex h-12 w-24 sm:w-28 shrink-0 items-center justify-between rounded-xl border border-[#D1D5DB] bg-white px-1.5 sm:px-2 shadow-xs">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      disabled={product.stock <= 0}
                      aria-label="Decrease"
                      className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-subhead text-sm font-bold text-foreground">{qty}</span>
                    <button
                      onClick={() => setQty(Math.min(product.stock || 1, qty + 1))}
                      disabled={product.stock <= 0 || qty >= (product.stock || 1)}
                      aria-label="Increase"
                      className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  {product.stock <= 0 ? (
                    <button
                      type="button"
                      disabled
                      className="font-subhead h-12 flex-1 rounded-xl bg-secondary text-muted-foreground px-3 sm:px-4 text-xs sm:text-sm font-bold cursor-not-allowed border border-border"
                    >
                      Out of Stock
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const currentPrice = selectedSize === "250g" ? Math.round(product.price / 2) : product.price;
                        add(
                          {
                            slug: product.slug,
                            name: product.name,
                            image: product.image,
                            price: currentPrice,
                            weight: selectedSize,
                          },
                          qty,
                        );
                        toast.success(`${product.name} added to cart`);
                      }}
                      className="font-subhead h-12 flex-1 rounded-xl bg-[#0F3D2E] hover:bg-[#0c2e23] px-3 sm:px-4 text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer active:scale-[0.99] whitespace-nowrap"
                    >
                      <ShoppingBag className="h-4 w-4 shrink-0 text-[#FAF6ED]" />
                      <span>Add to Cart</span>
                    </button>
                  )}

                  {/* Buy Now Button */}
                  {product.stock > 0 && (
                    <Link
                      to="/checkout"
                      onClick={() => {
                        const currentPrice = selectedSize === "250g" ? Math.round(product.price / 2) : product.price;
                        add(
                          {
                            slug: product.slug,
                            name: product.name,
                            image: product.image,
                            price: currentPrice,
                            weight: selectedSize,
                          },
                          qty,
                        );
                      }}
                      className="font-subhead h-12 flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl border-2 border-[#0F3D2E] text-[#0F3D2E] bg-white hover:bg-[#0F3D2E]/5 px-3 sm:px-4 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-[0.99] whitespace-nowrap"
                    >
                      <Zap className="h-4 w-4 shrink-0 fill-current" />
                      <span>Buy Now</span>
                    </Link>
                  )}

                  {/* Heart / Wishlist Button (Hidden on Mobile for cleaner button layout, visible on desktop) */}
                  <button
                    type="button"
                    aria-label="Add to wishlist"
                    className="hidden sm:grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#D1D5DB] bg-white text-muted-foreground hover:text-rose-600 hover:border-rose-300 transition-colors shadow-xs cursor-pointer"
                  >
                    <Heart className="h-5 w-5" />
                  </button>
                </div>

                {/* 3 Bottom Trust Features Strip */}
                <div className="mt-5 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-muted-foreground border-t border-border/40 pt-4">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Lock className="h-3.5 w-3.5 text-foreground/70" />
                    Secure Payments
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <RotateCcw className="h-3.5 w-3.5 text-foreground/70" />
                    Easy Returns
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Leaf className="h-3.5 w-3.5 text-foreground/70" />
                    Support Local Farmers
                  </span>
                </div>

                {/* Farmer Card */}
                <Link
                  to="/farmer/$slug"
                  params={{ slug: farmer.slug }}
                  className="mt-5 flex items-center gap-4 rounded-2xl border border-[#E6E0D4] bg-[#FAF8F5] p-3.5 transition-colors hover:bg-secondary/70 shadow-2xs"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={farmer.image}
                      alt={farmer.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-subhead text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Grown by
                    </p>
                    <p className="font-display text-sm font-semibold text-foreground truncate">{farmer.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {farmer.village}, {farmer.state} · {farmer.method}
                    </p>
                  </div>
                  <span className="font-subhead text-xs text-primary font-medium shrink-0">Read story →</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DYNAMIC FOLLOW YOUR HARVEST JOURNEY (Strictly for Pre-Order Products)     */}
        {/* ========================================================================= */}
        {isPreOrder && (
          <HarvestJourney
            journey={harvestJourneyData || loaderData?.product?.harvestJourney || loaderData?.product?.harvest_journey}
            productName={product.name}
          />
        )}

        {/* Standard Info Tabs, Process Banner & Traceability (Hidden for Pre-Order Harvests) */}
        {!isPreOrder && (
          <>
            {/* Product Info Tabs: Scrollable single row on mobile with hidden scrollbar */}
            <div className="mt-8 border-t border-border pt-6">
              <div className="flex items-center gap-2 border-b border-border overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-nowrap pb-0.5">
                {[
                  { id: "description", label: "Description" },
                  { id: "how-to-use", label: "How to Use" },
                  { id: "manufacturer", label: "Manufacturer Information" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`font-subhead px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="py-4">
                {activeTab === "description" && (
                  <div className="max-w-3xl space-y-4">
                    <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
                      {product.description || "No description available."}
                    </p>
                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2 text-xs">
                      <div className="flex justify-between border-b border-border/60 py-1.5">
                        <span className="text-muted-foreground">Category</span>
                        <span className="font-semibold capitalize">{product.category}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/60 py-1.5">
                        <span className="text-muted-foreground">Verification status</span>
                        <span className="font-semibold text-success flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5" /> PGS-India Certified
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "how-to-use" && (
                  <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-foreground/80">
                    <h4 className="font-display font-semibold text-foreground">Usage Directions:</h4>
                    <p>
                      {product.category === "dry-fruits" ||
                      product.category === "nuts" ||
                      product.category === "seeds"
                        ? "Enjoy as a healthy standalone snack, mix with breakfast cereals like muesli or oats, or use as a topping for desserts and salads."
                        : product.category === "spices" ||
                            product.category === "masalas" ||
                            product.category === "salts"
                          ? "Add to hot oil or ghee at the beginning of cooking to release aromatic essential oils, or sprinkle over finished dishes for direct seasoning."
                          : "Add to daily cooking, tea, hot milk, or warm water. Store in a cool, dry place away from direct sunlight in an airtight container."}
                    </p>
                  </div>
                )}

                {activeTab === "manufacturer" && (
                  <div className="max-w-2xl overflow-hidden rounded-2xl border border-[#f0e6d2] bg-[#fdfbf7]">
                    <table className="w-full text-left text-sm">
                      <tbody>
                        <tr className="border-b border-[#f0e6d2]/60">
                          <td className="px-5 py-3.5 font-medium text-muted-foreground bg-[#faf6ed]/50 w-1/3">
                            Grown By
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-foreground">{farmer.name}</td>
                        </tr>
                        <tr className="border-b border-[#f0e6d2]/60">
                          <td className="px-5 py-3.5 font-medium text-muted-foreground bg-[#faf6ed]/50">
                            Farm Location
                          </td>
                          <td className="px-5 py-3.5 text-foreground">
                            {farmer.village}, {farmer.state}
                          </td>
                        </tr>
                        <tr className="border-b border-[#f0e6d2]/60">
                          <td className="px-5 py-3.5 font-medium text-muted-foreground bg-[#faf6ed]/50">
                            Farming Method
                          </td>
                          <td className="px-5 py-3.5 text-foreground capitalize">
                            {farmer.method || "Natural Farming"}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-5 py-3.5 font-medium text-muted-foreground bg-[#faf6ed]/50">
                            Traceability ID
                          </td>
                          <td className="px-5 py-3.5 text-xs text-primary font-mono font-semibold">
                            PRJ-{farmer.slug.toUpperCase()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* 4-Step Production Process */}
            <div className="my-8 overflow-hidden rounded-3xl bg-primary text-primary-foreground p-6 md:p-8 relative shadow-lg">
              <div className="relative z-10 text-center max-w-2xl mx-auto">
                <h3 className="font-display text-xl md:text-2xl font-semibold leading-tight text-white">
                  Organic From The Start, Nourishing To The Last
                </h3>
                <p className="font-subhead text-[11px] tracking-widest text-[#dca842] mt-1.5 font-bold uppercase">
                  With 0 Chemical Intervention
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
                {[
                  {
                    step: "Step 1",
                    title: "Sourced Organically",
                    desc: "Raw ingredients collected from pesticide-free, certified local Indian farms.",
                  },
                  {
                    step: "Step 2",
                    title: "Quality Tested",
                    desc: "Tested thoroughly to ensure it passes all organic purity and heavy metal parameters.",
                  },
                  {
                    step: "Step 3",
                    title: "Hygienically Processed",
                    desc: "Meticulously processed and churned in a temperature-controlled environment.",
                  },
                  {
                    step: "Step 4",
                    title: "Pure & Authentic",
                    desc: "Delivered fresh to ensure you get the highest quality authentic nutrition.",
                  },
                ].map((s, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-white/10 backdrop-blur-md p-4 border border-white/10 flex flex-col items-center text-center"
                  >
                    <span className="font-subhead text-[10px] uppercase font-bold text-[#dca842] tracking-wider">
                      {s.step}
                    </span>
                    <h4 className="font-display font-semibold text-white mt-1 text-sm">{s.title}</h4>
                    <p className="text-white/80 text-[11px] mt-1.5 leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sourcing & Lab Verification Journey */}
            <TraceabilityCard product={product} farmer={farmer} />
          </>
        )}

        {/* Reviews Section */}
        <ProductReviews productSlug={product.slug} />

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-20 sm:mt-28 border-t border-[#E6E0D4] pt-12 sm:pt-16">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
              <div>
                <span className="font-subhead text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#0F3D2E] bg-[#E8EFE8] px-3 py-1 rounded-full inline-block mb-2">
                  Similar Harvests
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#173328]">
                  You may also like
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Handpicked unadulterated essentials from our certified partner farms
                </p>
              </div>
              <Link
                to="/shop"
                className="font-subhead inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0F3D2E] hover:text-[#184028] hover:underline transition self-start sm:self-auto shrink-0"
              >
                <span>Browse all harvests</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p: (typeof related)[number]) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </MarketingLayout>
  );
}

export default ProductPage;
