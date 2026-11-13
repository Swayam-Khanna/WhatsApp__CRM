"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Truck,
  Leaf,
  ExternalLink,
  ChevronRight,
  Clock,
  AlertCircle,
} from "lucide-react";

interface Variant {
  name: string;
  weightGrams: number;
  price: number;
  stockStatus: "in_stock" | "few_left" | "pre_order" | "out_of_stock";
}

interface CatalogueProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  variants: Variant[];
  image: string;
  stockStatus: "in_stock" | "few_left" | "pre_order" | "out_of_stock";
  url: string;
}

const CATEGORIES = [
  "All",
  "Honey",
  "Dry Fruits & Nuts",
  "Wellness & Shilajit",
  "Ghee & Dairy",
  "Spices & Saffron",
];

export default function PublicCataloguePage() {
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, number>>({});
  const [storePhone, setStorePhone] = useState("+91 80912 65690");
  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalogue() {
      try {
        const res = await fetch(`/api/catalogue?_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.products && Array.isArray(data.products)) {
            let apiProducts: CatalogueProduct[] = data.products;

            // Merge local CRM products for instant optimistic feedback
            if (typeof window !== "undefined") {
              try {
                const localStr = localStorage.getItem("prajnaa_crm_products");
                if (localStr) {
                  const localList = JSON.parse(localStr);
                  if (Array.isArray(localList)) {
                    const localMap = new Map<string, any>();
                    localList.forEach((lp: any) => {
                      if (lp.id) localMap.set(lp.id, lp);
                      if (lp.name) {
                        const slug = lp.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                        localMap.set(slug, lp);
                      }
                    });

                    // Update existing or append new
                    apiProducts = apiProducts.map((p) => {
                      const match = localMap.get(p.id) || localMap.get(p.slug);
                      if (!match) return p;
                      const basePrice = Math.round(match.price || p.price);
                      let sStatus = p.stockStatus;
                      if (match.stock === "Out of Stock" || match.unitsLeft === 0) sStatus = "out_of_stock";
                      else if (match.stock === "Pre-Order") sStatus = "pre_order";
                      else if (match.stock === "Low Stock" || match.unitsLeft < 5) sStatus = "few_left";
                      else sStatus = "in_stock";

                      return {
                        ...p,
                        name: match.name || p.name,
                        price: basePrice,
                        stockStatus: sStatus,
                        image: match.image || p.image,
                        category: match.category || p.category,
                      };
                    });

                    // Add any completely new products from local CRM that aren't in API yet
                    localList.forEach((lp: any) => {
                      const slug = (lp.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
                      const exists = apiProducts.some((p) => p.id === lp.id || p.slug === slug);
                      if (!exists && lp.name) {
                        const basePrice = Math.round(lp.price || 450);
                        let sStatus: CatalogueProduct["stockStatus"] = "in_stock";
                        if (lp.stock === "Out of Stock" || lp.unitsLeft === 0) sStatus = "out_of_stock";
                        else if (lp.stock === "Pre-Order") sStatus = "pre_order";
                        else if (lp.stock === "Low Stock" || lp.unitsLeft < 5) sStatus = "few_left";

                        apiProducts.unshift({
                          id: lp.id || `prod_${Date.now()}`,
                          name: lp.name,
                          slug,
                          category: lp.category || "Produce",
                          description: `100% authentic mountain harvest from ${lp.origin || "Himalayan farms"}.`,
                          price: basePrice,
                          compareAtPrice: Math.round(basePrice * 1.15),
                          variants: [
                            { name: lp.weight || "500g", weightGrams: 500, price: basePrice, stockStatus: sStatus },
                          ],
                          image: lp.image || "/assets/cat-honey.jpg",
                          stockStatus: sStatus,
                          url: `/catalogue#${slug}`,
                        });
                      }
                    });
                  }
                }
              } catch {}
            }

            setProducts(apiProducts);
          }
          if (data.storePhone) {
            setStorePhone(data.storePhone);
          }
        }
      } catch (err) {
        console.error("Failed to load catalogue:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCatalogue();

    // Auto-refresh when tab gains focus so edits in CRM tab appear immediately
    const handleFocus = () => loadCatalogue();
    window.addEventListener("focus", handleFocus);

    // Check hash anchor on load
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        setHighlightedSlug(hash);
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 500);
      }
    }

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const cleanStorePhone = useMemo(() => {
    return storePhone.replace(/\D/g, "");
  }, [storePhone]);

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === "All" ||
        item.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        (selectedCategory === "Honey" && item.name.toLowerCase().includes("honey")) ||
        (selectedCategory === "Wellness & Shilajit" && (item.name.toLowerCase().includes("shilajit") || item.category.toLowerCase().includes("wellness"))) ||
        (selectedCategory === "Ghee & Dairy" && (item.name.toLowerCase().includes("ghee") || item.category.toLowerCase().includes("dairy"))) ||
        (selectedCategory === "Spices & Saffron" && (item.name.toLowerCase().includes("saffron") || item.name.toLowerCase().includes("kesar") || item.name.toLowerCase().includes("turmeric")));

      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const handleSelectVariant = (productId: string, variantIndex: number) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [productId]: variantIndex,
    }));
  };

  const buildWhatsAppOrderUrl = (product: CatalogueProduct) => {
    const vIndex = selectedVariants[product.id] || 0;
    const variant = product.variants?.[vIndex] || { name: "Standard Pack", price: product.price };
    const text = `Namaste ji! Mujhe ${product.name} (${variant.name} - ₹${variant.price}) order karna hai. Kripya process bata dijiye.`;
    return `https://wa.me/${cleanStorePhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-neutral-900 font-sans selection:bg-[#0F3D2E] selection:text-white pb-24">
      {/* Top Banner */}
      <div className="bg-[#0F3D2E] text-white py-2 px-4 text-center text-xs font-medium tracking-wide flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-[#E8A317]" />
        <span>100% Certified Pure Himalayan Harvest • Insured Speed Post Delivery Across India</span>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#0F3D2E]/20 bg-[#0F3D2E] flex items-center justify-center text-white font-bold text-lg shadow-inner">
              <span className="font-serif">P</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-serif font-bold text-base sm:text-lg text-[#0F3D2E] leading-none">
                  Prajnaa Market
                </h1>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Verified
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 font-medium">
                Live Storefront & Farmer Catalogue
              </p>
            </div>
          </div>

          <a
            href={`https://wa.me/${cleanStorePhone}?text=${encodeURIComponent("Namaste ji! Mujhe Prajnaa products ki jankari chahiye.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-3.5 py-2 rounded-full font-semibold text-xs transition-all shadow-xs shrink-0"
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Order on WhatsApp</span>
            <span className="sm:hidden">WhatsApp</span>
          </a>
        </div>
      </header>

      {/* Hero Showcase */}
      <div className="bg-gradient-to-b from-emerald-50/60 to-transparent border-b border-neutral-200/60 py-8 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#0F3D2E]/15 text-[#0F3D2E] text-xs font-semibold shadow-2xs">
            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
            <span>Direct from Solan & High-Altitude Mountain Orchards</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif font-extrabold text-[#0F3D2E] tracking-tight">
            Live Product Catalogue & Rates
          </h2>
          <p className="text-neutral-600 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            All prices and stock availability are fetched live from our warehouse inventory. Select any packaging size and click to place your order directly on WhatsApp.
          </p>

          {/* Search Bar */}
          <div className="pt-2 max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search honey, almonds, walnuts, shilajit, saffron..."
              className="w-full pl-11 pr-4 py-2.5 rounded-full border border-neutral-300 bg-white text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0F3D2E] focus:border-transparent transition-all placeholder:text-neutral-400"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center justify-center gap-1.5 overflow-x-auto pt-3 pb-1 no-scrollbar text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-[#0F3D2E] text-white shadow-xs"
                    : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Product Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-[#0F3D2E] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-neutral-500 font-medium">Fetching live products & current stock rates...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center space-y-3 max-w-md mx-auto bg-white rounded-3xl p-8 border border-neutral-200">
            <AlertCircle className="w-10 h-10 text-neutral-400 mx-auto" />
            <h3 className="font-serif font-bold text-lg text-neutral-800">No products found</h3>
            <p className="text-xs text-neutral-500">
              We couldn&apos;t find any harvest matching &quot;{searchQuery}&quot;. Please try another keyword or chat with our desk on WhatsApp.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
              className="mt-2 text-xs font-semibold text-[#0F3D2E] underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((item) => {
              const currentVariantIndex = selectedVariants[item.id] || 0;
              const activeVariant = item.variants?.[currentVariantIndex] || {
                name: "Standard Pack",
                price: item.price,
                stockStatus: item.stockStatus,
              };

              const isHighlighted = highlightedSlug === item.slug || highlightedSlug === item.id;

              return (
                <div
                  key={item.id}
                  id={item.slug}
                  className={`bg-white rounded-3xl border overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-lg ${
                    isHighlighted
                      ? "ring-2 ring-emerald-500 border-emerald-500 shadow-md scale-[1.01]"
                      : "border-neutral-200/90 shadow-2xs hover:border-[#0F3D2E]/30"
                  }`}
                >
                  {/* Product Image & Badges */}
                  <div>
                    <div className="relative aspect-4/3 bg-neutral-100 overflow-hidden group">
                      <Image
                        src={item.image || "/assets/cat-honey.jpg"}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/assets/cat-honey.jpg";
                        }}
                      />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-white/95 text-[#0F3D2E] backdrop-blur-xs shadow-2xs">
                          {item.category}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3">
                        {item.stockStatus === "in_stock" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> In Stock
                          </span>
                        )}
                        {item.stockStatus === "few_left" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-2xs flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> Few Left
                          </span>
                        )}
                        {item.stockStatus === "pre_order" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-2xs flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Pre-Order
                          </span>
                        )}
                        {item.stockStatus === "out_of_stock" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-600 text-white shadow-2xs">
                            Sold Out
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-3">
                      <div>
                        <h3 className="font-serif font-bold text-lg text-neutral-900 group-hover:text-[#0F3D2E] transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-xs text-neutral-500 line-clamp-2 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Packaging Sizes & Pricing Variants */}
                      {item.variants && item.variants.length > 0 && (
                        <div className="pt-2 border-t border-neutral-100">
                          <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1.5">
                            Select Packaging Size:
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {item.variants.map((v, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelectVariant(item.id, idx)}
                                className={`px-2.5 py-1.5 rounded-xl text-left border transition-all ${
                                  currentVariantIndex === idx
                                    ? "border-[#0F3D2E] bg-emerald-50/70 text-[#0F3D2E] font-bold ring-1 ring-[#0F3D2E]"
                                    : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700"
                                }`}
                              >
                                <div className="text-[11px] truncate">{v.name}</div>
                                <div className="text-xs font-bold text-neutral-900">
                                  ₹{v.price.toLocaleString("en-IN")}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom / Price & CTA */}
                  <div className="p-5 pt-0 mt-2 border-t border-neutral-100/80">
                    <div className="flex items-center justify-between pt-3 mb-3">
                      <div>
                        <span className="text-[10px] text-neutral-500 block uppercase font-semibold">
                          Live Price ({activeVariant.name}):
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-extrabold text-[#0F3D2E]">
                            ₹{activeVariant.price.toLocaleString("en-IN")}
                          </span>
                          {item.compareAtPrice && item.compareAtPrice > activeVariant.price && (
                            <span className="text-xs text-neutral-400 line-through">
                              ₹{item.compareAtPrice.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
                        Tax Included
                      </span>
                    </div>

                    <a
                      href={buildWhatsAppOrderUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-[#0F3D2E] hover:bg-[#16503d] text-white py-2.5 px-4 rounded-2xl font-semibold text-xs transition-all shadow-xs"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-[#E8A317]" />
                      <span>Order on WhatsApp</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/70" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Trust & Guarantee Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mt-16 pt-12 border-t border-neutral-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 space-y-2 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#0F3D2E] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-serif font-bold text-sm text-neutral-900">100% Himalayan Guarantee</h4>
            <p className="text-xs text-neutral-500">
              Direct from mountain beekeepers and organic farmers in Himachal & Kashmir. Zero adulteration.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 space-y-2 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#0F3D2E] flex items-center justify-center mx-auto">
              <Truck className="w-5 h-5" />
            </div>
            <h4 className="font-serif font-bold text-sm text-neutral-900">Speed Post Tracking</h4>
            <p className="text-xs text-neutral-500">
              Dispatched with insured India Post Speed Post. Official tracking number sent on WhatsApp.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 space-y-2 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#0F3D2E] flex items-center justify-center mx-auto">
              <Phone className="w-5 h-5" />
            </div>
            <h4 className="font-serif font-bold text-sm text-neutral-900">Direct Human Support</h4>
            <p className="text-xs text-neutral-500">
              Concierge desk available on {storePhone}. Real human help whenever you need assistance.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-12 text-center text-xs text-neutral-400 space-y-2">
          <p>© {new Date().getFullYear()} Prajnaa Market • Pure Himalayan Farm Harvest</p>
          <p>Dispatched from Solan Hub (Outer Solan Road, Solan, HP 173212)</p>
        </div>
      </section>

      {/* Floating WhatsApp Action Bar on Mobile */}
      <div className="fixed bottom-4 left-4 right-4 sm:hidden z-40">
        <a
          href={`https://wa.me/${cleanStorePhone}?text=${encodeURIComponent("Namaste ji! Mujhe Prajnaa live catalogue se order karna hai.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 px-4 bg-[#25D366] text-white rounded-full font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
        >
          <Phone className="w-4 h-4" />
          <span>Chat or Order with Nishant ji on WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
