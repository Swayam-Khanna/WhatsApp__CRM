"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  RefreshCw,
  Copy,
  Check,
  SlidersHorizontal,
  ArrowUpDown,
  Share2,
  Tag,
  Package,
  Info,
  X,
  MapPin,
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
  stock?: string;
  stockStatus: "in_stock" | "few_left" | "pre_order" | "out_of_stock";
  unitsLeft?: number;
  origin?: string;
  sku?: string;
  weight?: string;
  url: string;
  featured?: boolean;
}

const CATEGORIES = [
  "All",
  "Honey",
  "Dry Fruits & Nuts",
  "Wellness & Shilajit",
  "Ghee & Dairy",
  "Spices & Saffron",
  "Salts & Minerals",
  "Seeds & Superfoods",
  "Pickles & Preserves",
];

const AVAILABILITY_OPTIONS = [
  { id: "all", label: "All Availability" },
  { id: "in_stock", label: "🟢 In Stock" },
  { id: "few_left", label: "🟡 Low Stock / Few Left" },
  { id: "pre_order", label: "🟣 Pre-Order" },
  { id: "out_of_stock", label: "🔴 Out of Stock" },
];

const SORT_OPTIONS = [
  { id: "featured", label: "✨ Featured & Best Sellers" },
  { id: "price_asc", label: "💵 Price: Low to High" },
  { id: "price_desc", label: "💎 Price: High to Low" },
  { id: "name_asc", label: "🔤 Name: A to Z" },
  { id: "name_desc", label: "🔤 Name: Z to A" },
];

export default function PremiumCataloguePage() {
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [selectedPackaging, setSelectedPackaging] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, number>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [orderingId, setOrderingId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [storePhone, setStorePhone] = useState("+91 80912 65690");
  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);

  // Authoritative fetch from CRM Catalogue API
  const loadCatalogue = useCallback(async (isManualRefresh: boolean = false) => {
    if (isManualRefresh) setSyncing(true);
    setSyncError(null);

    try {
      const res = await fetch(`/api/catalogue?_t=${Date.now()}`);
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
        setLastSyncTime(new Date());
      } else {
        throw new Error(data.error || "Invalid response format from catalogue API");
      }
      if (data.storePhone) {
        setStorePhone(data.storePhone);
      }
    } catch (err: any) {
      console.error("[Catalogue] Load error:", err);
      setSyncError(err?.message || "Failed to load live catalogue");
    } finally {
      setLoading(false);
      if (isManualRefresh) {
        setTimeout(() => setSyncing(false), 400);
      }
    }
  }, []);

  useEffect(() => {
    loadCatalogue(false);

    // Auto-refresh when tab gains focus so any product added in CRM is immediately visible
    const handleFocus = () => loadCatalogue(false);
    window.addEventListener("focus", handleFocus);

    // Scroll to anchor slug if provided in URL (e.g. /catalogue#pure-himalayan-shilajit)
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        setHighlightedSlug(hash);
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 600);
      }
    }

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadCatalogue]);

  const cleanStorePhone = useMemo(() => {
    let raw = storePhone.replace(/\D/g, "");
    if (raw.length === 10) {
      raw = `91${raw}`;
    }
    return raw || "918091265690";
  }, [storePhone]);

  // Dynamic packaging sizes derived from active products
  const availablePackagings = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.variants && Array.isArray(p.variants)) {
        p.variants.forEach((v) => {
          if (v.name) {
            if (v.name.includes("250g") || v.name.includes("250")) set.add("250g");
            if (v.name.includes("500g") || v.name.includes("500")) set.add("500g");
            if (v.name.includes("1kg") || v.name.includes("1 Litre") || v.name.includes("1000")) set.add("1kg");
            if (v.name.includes("20g") || v.name.includes("50g")) set.add("Resin (20g/50g)");
            if (v.name.includes("Jar")) set.add("Glass Jars");
          }
        });
      }
    });
    return ["all", ...Array.from(set)];
  }, [products]);

  // Multi-dimensional filtering and sorting
  const filteredProducts = useMemo(() => {
    let list = products.filter((item) => {
      // 1. Search Query
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.origin && item.origin.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q));

      // 2. Category Filter
      const cat = selectedCategory.toLowerCase();
      const itemCat = item.category.toLowerCase();
      const itemName = item.name.toLowerCase();
      const matchesCategory =
        selectedCategory === "All" ||
        itemCat.includes(cat) ||
        (selectedCategory === "Honey" && (itemName.includes("honey") || itemName.includes("shehad"))) ||
        (selectedCategory === "Dry Fruits & Nuts" && (itemCat.includes("dry") || itemName.includes("almond") || itemName.includes("walnut") || itemName.includes("apricot"))) ||
        (selectedCategory === "Wellness & Shilajit" && (itemCat.includes("wellness") || itemName.includes("shilajit") || itemName.includes("tea") || itemName.includes("oil"))) ||
        (selectedCategory === "Ghee & Dairy" && (itemCat.includes("ghee") || itemCat.includes("dairy") || itemName.includes("ghee"))) ||
        (selectedCategory === "Spices & Saffron" && (itemCat.includes("spice") || itemName.includes("saffron") || itemName.includes("turmeric") || itemName.includes("masala"))) ||
        (selectedCategory === "Salts & Minerals" && (itemCat.includes("salt") || itemName.includes("salt"))) ||
        (selectedCategory === "Seeds & Superfoods" && (itemCat.includes("seed") || itemName.includes("seed") || itemName.includes("chia"))) ||
        (selectedCategory === "Pickles & Preserves" && (itemCat.includes("pickle") || itemName.includes("pickle")));

      // 3. Availability Filter
      let matchesAvailability = true;
      if (selectedAvailability !== "all") {
        matchesAvailability = item.stockStatus === selectedAvailability;
      }

      // 4. Packaging Filter
      let matchesPackaging = true;
      if (selectedPackaging !== "all") {
        matchesPackaging = Boolean(
          item.variants?.some((v) => v.name.toLowerCase().includes(selectedPackaging.toLowerCase()))
        );
      }

      return matchesSearch && matchesCategory && matchesAvailability && matchesPackaging;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "name_desc") return b.name.localeCompare(a.name);
      // Default: featured first, then in stock
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      if (a.stockStatus === "in_stock" && b.stockStatus !== "in_stock") return -1;
      if (a.stockStatus !== "in_stock" && b.stockStatus === "in_stock") return 1;
      return 0;
    });

    return list;
  }, [products, searchQuery, selectedCategory, selectedAvailability, selectedPackaging, sortBy]);

  const handleUpdateQty = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = Math.max(1, Math.min(20, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  const handleSelectVariant = (productId: string, variantIndex: number) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [productId]: variantIndex,
    }));
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const buildWhatsAppOrderUrl = (product: CatalogueProduct) => {
    const vIndex = selectedVariants[product.id] || 0;
    const variant = product.variants?.[vIndex] || { name: "Standard Pack", price: product.price };
    const qty = quantities[product.id] || 1;
    const totalAmount = variant.price * qty;

    let text: string;
    if (product.stockStatus === "out_of_stock") {
      text = `Namaste ji! Mujhe *${product.name}* (${variant.name}) ke baare mein enquiry karni hai. Kya iska fresh batch available ya pre-order ho sakta hai?`;
    } else if (qty > 1) {
      text = `Namaste ji! Mujhe *${product.name}* (${variant.name}) ke ${qty} packs order karne hain.\n\n*Total Amount:* ₹${totalAmount.toLocaleString("en-IN")}\n\nKripya delivery and payment details confirm kar dijiye.`;
    } else {
      text = `Namaste ji! Mujhe *${product.name}* (${variant.name} - ₹${variant.price.toLocaleString("en-IN")}) order karna hai.\n\nKripya delivery and payment details confirm kar dijiye.`;
    }

    return `https://wa.me/${cleanStorePhone}?text=${encodeURIComponent(text)}`;
  };

  const handleOrderClick = (product: CatalogueProduct) => {
    setOrderingId(product.id);
    setTimeout(() => setOrderingId(null), 2500);

    // If local test environment, log order inquiry event
    if (typeof window !== "undefined") {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (isLocal) {
        try {
          const vIndex = selectedVariants[product.id] || 0;
          const variant = product.variants?.[vIndex] || { name: "Standard Pack", price: product.price };
          const qty = quantities[product.id] || 1;
          const totalAmount = variant.price * qty;
          const orderMsg = qty > 1
            ? `Namaste ji! Mujhe ${product.name} (${variant.name}) ke ${qty} packs order karne hain. Total: ₹${totalAmount.toLocaleString("en-IN")}.`
            : `Namaste ji! Mujhe ${product.name} (${variant.name} - ₹${variant.price.toLocaleString("en-IN")}) order karna hai.`;

          fetch("/api/crm/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sender: "customer",
              from: "web_visitor",
              to: cleanStorePhone,
              customerName: "Website Storefront Visitor",
              text: orderMsg,
            }),
          }).catch(() => {});
        } catch {}
      }
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "All" ||
    selectedAvailability !== "all" ||
    selectedPackaging !== "all" ||
    sortBy !== "featured";

  const resetAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedAvailability("all");
    setSelectedPackaging("all");
    setSortBy("featured");
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-neutral-900 font-sans selection:bg-[#0F3D2E] selection:text-white pb-28">
      {/* 1. TOP ANNOUNCEMENT TICKER */}
      <div className="bg-[#0F3D2E] text-white py-2 px-4 text-center text-xs font-medium tracking-wide flex items-center justify-center gap-2 border-b border-emerald-950/40">
        <Sparkles className="w-3.5 h-3.5 text-[#E8A317] shrink-0" />
        <span className="truncate">
          100% Certified Pure Himalayan Harvest • Direct from Orchards & High-Altitude Beekeepers • Insured Speed Post Across India
        </span>
      </div>

      {/* 2. PREMIUM BRANDED HEADER */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Logo & Store Info */}
          <div className="flex items-center gap-3.5">
            <Link href="/" className="group flex items-center gap-3 shrink-0">
              <img
                src="/prajnaa-logo.png"
                alt="Prajnaa Market Logo"
                className="h-10 sm:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/assets/prajnaa-logo.png";
                }}
              />
            </Link>
            <div className="hidden sm:block border-l border-neutral-200 pl-3.5">
              <div className="flex items-center gap-2">
                <span className="font-serif font-extrabold text-base text-[#0F3D2E] tracking-tight">
                  Prajnaa Market
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-emerald-700" /> Himalayan Certified
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 font-medium">
                Live Storefront & Farmer Direct Catalogue
              </p>
            </div>
          </div>

          {/* Sync Status Badge & Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Count & Sync Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50/80 border border-emerald-200/80 text-xs font-semibold text-emerald-900">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>{products.length} Live SKUs</span>
              <span className="text-emerald-300">•</span>
              <span className="text-emerald-700 font-normal">
                Synced {lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <button
                type="button"
                onClick={() => loadCatalogue(true)}
                disabled={syncing}
                title="Refresh product catalogue from database"
                className="ml-1 text-emerald-800 hover:text-emerald-950 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-[#0F3D2E]" : ""}`} />
              </button>
            </div>

            {/* Copy Link Button */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold shadow-2xs transition"
              title="Copy Catalogue Link to Share on WhatsApp"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="hidden sm:inline">Copy Link</span>
                </>
              )}
            </button>

            {/* Direct WhatsApp Concierge Button */}
            <a
              href={`https://wa.me/${cleanStorePhone}?text=${encodeURIComponent("Namaste ji! Mujhe Prajnaa live catalogue se fresh mountain produce order karna hai.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-3.5 py-1.5 rounded-full font-bold text-xs transition-all shadow-xs shrink-0"
              title="Chat with Prajnaa Customer Care Desk on WhatsApp"
            >
              <Phone className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Order on WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* 3. HERO SHOWCASE & FILTER CONTROLS */}
      <section className="bg-gradient-to-b from-emerald-50/70 via-white to-[#FDFBF7] border-b border-neutral-200/60 pt-8 pb-6 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-3.5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white border border-[#0F3D2E]/15 text-[#0F3D2E] text-xs font-bold shadow-2xs">
            <Leaf className="w-3.5 h-3.5 text-emerald-700" />
            <span>High-Altitude Himachal & Kashmir Harvest Direct From Orchards</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif font-extrabold text-[#0F3D2E] tracking-tight">
            Prajnaa Live Product Catalogue
          </h1>

          <p className="text-neutral-600 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
            Every harvest item is 100% natural, ethically sourced from our partner farmers, and packed at our Solan mountain hub. Select your preferred packaging size below and click to place your verified order directly on WhatsApp.
          </p>

          {/* Sync Error Alert Banner */}
          {syncError && (
            <div className="max-w-md mx-auto p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{syncError}</span>
              </div>
              <button
                type="button"
                onClick={() => loadCatalogue(true)}
                className="font-bold underline hover:text-rose-950 text-xs"
              >
                Retry
              </button>
            </div>
          )}

          {/* SEARCH & FILTER CONTROLS CONTAINER */}
          <div className="pt-2 max-w-2xl mx-auto space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search raw honey, mamra almonds, walnuts, pure shilajit, saffron..."
                className="w-full pl-11 pr-10 py-3 rounded-full border border-neutral-300 bg-white text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0F3D2E] focus:border-transparent transition placeholder:text-neutral-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Filter Controls: Category, Availability & Sort */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
              {/* Availability Dropdown */}
              <div className="relative inline-block">
                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 rounded-full border border-neutral-200 bg-white text-neutral-700 text-xs font-semibold shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#0F3D2E] cursor-pointer"
                >
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <SlidersHorizontal className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none" />
              </div>

              {/* Sort By Dropdown */}
              <div className="relative inline-block">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 rounded-full border border-neutral-200 bg-white text-neutral-700 text-xs font-semibold shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#0F3D2E] cursor-pointer"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none" />
              </div>

              {/* Reset Filters Pill */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Reset All</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Horizontal Scrolling Tabs */}
          <div className="flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto pt-4 pb-1 no-scrollbar text-xs">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full whitespace-nowrap font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#0F3D2E] text-white shadow-xs scale-105"
                      : "bg-white text-neutral-600 border border-neutral-200/90 hover:bg-neutral-50 hover:text-neutral-900"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. MAIN PRODUCT GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {/* Results Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200/60 mb-6">
          <div className="text-xs text-neutral-500 font-medium">
            Showing <strong className="text-neutral-900 font-bold">{filteredProducts.length}</strong> of {products.length} live products
            {selectedCategory !== "All" && <span> in <strong className="text-[#0F3D2E]">{selectedCategory}</strong></span>}
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Real-time warehouse sync</span>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-[#0F3D2E] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-neutral-500 font-medium">Loading live Himalayan inventory & variant prices...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Empty Search State */
          <div className="py-20 text-center space-y-3.5 max-w-md mx-auto bg-white rounded-3xl p-8 border border-neutral-200 shadow-xs">
            <AlertCircle className="w-12 h-12 text-neutral-300 mx-auto" />
            <h3 className="font-serif font-bold text-lg text-neutral-800">No matching harvest found</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              We couldn&apos;t find any live product matching your selected filters or search terms. Try clearing filters or speak directly with our team on WhatsApp.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-4 py-2 rounded-full bg-[#0F3D2E] text-white text-xs font-bold shadow-xs hover:bg-[#16503d] transition cursor-pointer"
              >
                Clear Filters
              </button>
              <a
                href={`https://wa.me/${cleanStorePhone}?text=${encodeURIComponent("Namaste ji! Mujhe Prajnaa products ki catalogue enquiry karni hai.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-full border border-neutral-300 text-neutral-700 text-xs font-bold hover:bg-neutral-50 transition"
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>
        ) : (
          /* Product Card Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {filteredProducts.map((item) => {
              const currentVariantIndex = selectedVariants[item.id] || 0;
              const activeVariant = item.variants?.[currentVariantIndex] || {
                name: item.weight || "500g",
                price: item.price,
                stockStatus: item.stockStatus,
              };

              const qty = quantities[item.id] || 1;
              const activePrice = activeVariant.price;
              const lineTotal = activePrice * qty;
              const comparePrice = item.compareAtPrice ? Math.round(item.compareAtPrice * (activePrice / item.price)) : null;
              const discountPercent = comparePrice && comparePrice > activePrice ? Math.round(((comparePrice - activePrice) / comparePrice) * 100) : null;
              const isHighlighted = highlightedSlug === item.slug || highlightedSlug === item.id;

              return (
                <div
                  key={item.id}
                  id={item.slug}
                  className={`bg-white rounded-3xl border overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-xl group ${
                    isHighlighted
                      ? "ring-2 ring-emerald-600 border-emerald-600 shadow-lg scale-[1.01]"
                      : "border-neutral-200/90 shadow-2xs hover:border-[#0F3D2E]/40"
                  }`}
                >
                  {/* CARD TOP: Image & Badges */}
                  <div>
                    <div className="relative aspect-4/3 bg-neutral-100 overflow-hidden">
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

                      {/* Category Tag */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/95 text-[#0F3D2E] backdrop-blur-xs shadow-2xs">
                          {item.category}
                        </span>
                      </div>

                      {/* Stock Status Badge */}
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

                      {/* Origin overlay bar on image bottom */}
                      {item.origin && (
                        <div className="absolute bottom-2 left-3 right-3 flex items-center gap-1 text-[11px] font-medium text-white/90 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-xl truncate">
                          <MapPin className="w-3 h-3 text-[#E8A317] shrink-0" />
                          <span className="truncate">{item.origin}</span>
                        </div>
                      )}
                    </div>

                    {/* CARD CONTENT */}
                    <div className="p-5 space-y-3">
                      <div>
                        <h2 className="font-serif font-bold text-lg text-neutral-900 group-hover:text-[#0F3D2E] transition-colors leading-snug">
                          {item.name}
                        </h2>
                        <p className="text-xs text-neutral-500 line-clamp-2 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Packaging Sizes & Pricing Variants */}
                      {item.variants && item.variants.length > 0 && (
                        <div className="pt-2 border-t border-neutral-100">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                              Choose Size / Packaging:
                            </label>
                            <span className="text-[10px] text-emerald-700 font-semibold">
                              {item.variants.length} Options
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            {item.variants.map((v, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelectVariant(item.id, idx)}
                                className={`px-2.5 py-1.5 rounded-xl text-left border transition-all cursor-pointer ${
                                  currentVariantIndex === idx
                                    ? "border-[#0F3D2E] bg-emerald-50/80 text-[#0F3D2E] font-bold ring-1 ring-[#0F3D2E] shadow-2xs"
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

                  {/* CARD BOTTOM: Price, Quantity & WhatsApp Order CTA */}
                  <div className="p-5 pt-0 mt-2 border-t border-neutral-100/80">
                    <div className="flex items-center justify-between pt-3 mb-3 gap-2">
                      <div>
                        <span className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider">
                          Live Price ({activeVariant.name}):
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-extrabold text-[#0F3D2E]">
                            ₹{lineTotal.toLocaleString("en-IN")}
                          </span>
                          {comparePrice && comparePrice > activePrice && (
                            <span className="text-xs text-neutral-400 line-through">
                              ₹{(comparePrice * qty).toLocaleString("en-IN")}
                            </span>
                          )}
                          {discountPercent && discountPercent > 0 && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                              {discountPercent}% OFF
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, -1)}
                          disabled={qty <= 1}
                          className="w-6 h-6 rounded-lg bg-white text-neutral-700 flex items-center justify-center font-bold text-xs hover:bg-neutral-200 transition disabled:opacity-40 cursor-pointer shadow-2xs"
                          title="Decrease Quantity"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-neutral-800 px-1.5 min-w-[20px] text-center font-mono">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, 1)}
                          disabled={qty >= 20}
                          className="w-6 h-6 rounded-lg bg-white text-neutral-700 flex items-center justify-center font-bold text-xs hover:bg-neutral-200 transition disabled:opacity-40 cursor-pointer shadow-2xs"
                          title="Increase Quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Order Action Button */}
                    <a
                      href={buildWhatsAppOrderUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleOrderClick(item)}
                      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs transition-all shadow-xs cursor-pointer ${
                        item.stockStatus === "out_of_stock"
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : orderingId === item.id
                          ? "bg-emerald-800 text-white ring-2 ring-emerald-400"
                          : "bg-[#0F3D2E] hover:bg-[#17523f] text-white shadow-md hover:shadow-lg"
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4 text-[#E8A317] shrink-0" />
                      <span>
                        {orderingId === item.id
                          ? "Opening WhatsApp..."
                          : item.stockStatus === "out_of_stock"
                          ? "Enquire / Pre-Order on WhatsApp"
                          : `Order on WhatsApp • ₹${lineTotal.toLocaleString("en-IN")}`}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/70" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. TRUST, PURITY & ASSURANCE SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-20 pt-12 border-t border-neutral-200/80">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-6 rounded-3xl bg-white border border-neutral-200/80 space-y-2.5 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0F3D2E] flex items-center justify-center mx-auto shadow-2xs">
              <ShieldCheck className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="font-serif font-bold text-sm text-neutral-900">100% Himalayan Purity</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Harvested directly from high-altitude orchard groves and mountain beekeepers in Himachal Pradesh and Kashmir. Absolutely zero chemical adulteration or additives.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-neutral-200/80 space-y-2.5 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0F3D2E] flex items-center justify-center mx-auto shadow-2xs">
              <Truck className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="font-serif font-bold text-sm text-neutral-900">Live Delivery Updates</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Dispatched swiftly from our Solan mountain hub across India. Automated live shipping updates, transit location milestones, and day-before-delivery alerts are delivered directly to your WhatsApp.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-neutral-200/80 space-y-2.5 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0F3D2E] flex items-center justify-center mx-auto shadow-2xs">
              <Phone className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="font-serif font-bold text-sm text-neutral-900">Direct Human Concierge</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Have questions about dosages, harvest seasons, or bulk requirements? Our concierge desk is directly available on WhatsApp at {storePhone} for personal assistance.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-14 text-center text-xs text-neutral-400 space-y-2 border-t border-neutral-100 pt-8">
          <p>© {new Date().getFullYear()} Prajnaa Market • Pure Himalayan Farm Harvest</p>
          <p>Dispatched from Solan Hub (Seva Niketan, Ward No.2, Near ITI, Solan, HP, 173212) • Central Helpline: {storePhone}</p>
        </div>
      </section>

      {/* 6. FLOATING WHATSAPP CTA BAR ON MOBILE */}
      <div className="fixed bottom-4 left-4 right-4 sm:hidden z-40">
        <a
          href={`https://wa.me/${cleanStorePhone}?text=${encodeURIComponent("Namaste ji! Mujhe Prajnaa live catalogue se order karna hai.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 px-5 bg-[#25D366] text-white rounded-full font-bold text-xs flex items-center justify-center gap-2.5 shadow-xl"
        >
          <Phone className="w-4 h-4 fill-current" />
          <span>Chat or Order Directly on WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
