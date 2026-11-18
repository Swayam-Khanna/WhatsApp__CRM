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
  Trash2,
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

export interface CartItem {
  id: string; // `${productId}_${variantIndex}`
  productId: string;
  productName: string;
  variantIndex: number;
  variantName: string;
  price: number;
  compareAtPrice?: number | null;
  image: string;
  qty: number;
  weight?: string;
  origin?: string;
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [storePhone, setStorePhone] = useState("+91 80912 65690");
  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);

  // Blinkit Multi-Item Cart State
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("prajnaa_catalogue_cart");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const [showCartDrawer, setShowCartDrawer] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("prajnaa_cust_name") || "";
      } catch {}
    }
    return "";
  });
  const [customerPhone, setCustomerPhone] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("prajnaa_cust_phone") || "";
      } catch {}
    }
    return "";
  });
  const [customerAddress, setCustomerAddress] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("prajnaa_cust_address") || "";
      } catch {}
    }
    return "";
  });
  const [orderNotes, setOrderNotes] = useState<string>("");

  // Sync Cart to LocalStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("prajnaa_catalogue_cart", JSON.stringify(cart));
      } catch {}
    }
  }, [cart]);

  // Fetch Authoritative Catalogue Data
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

    const handleFocus = () => loadCatalogue(false);
    window.addEventListener("focus", handleFocus);

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
    return storePhone.replace(/[^0-9]/g, "");
  }, [storePhone]);

  // Available packagings derived from live products
  const availablePackagings = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      p.variants?.forEach((v) => {
        if (v.name) set.add(v.name);
      });
    });
    return Array.from(set);
  }, [products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let list = products.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.origin && item.origin.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q));

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

      let matchesAvailability = true;
      if (selectedAvailability !== "all") {
        matchesAvailability = item.stockStatus === selectedAvailability;
      }

      let matchesPackaging = true;
      if (selectedPackaging !== "all") {
        matchesPackaging = Boolean(
          item.variants?.some((v) => v.name.toLowerCase().includes(selectedPackaging.toLowerCase()))
        );
      }

      return matchesSearch && matchesCategory && matchesAvailability && matchesPackaging;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "name_desc") return b.name.localeCompare(a.name);
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      if (a.stockStatus === "in_stock" && b.stockStatus !== "in_stock") return -1;
      if (a.stockStatus !== "in_stock" && b.stockStatus === "in_stock") return 1;
      return 0;
    });

    return list;
  }, [products, searchQuery, selectedCategory, selectedAvailability, selectedPackaging, sortBy]);

  // Cart Helpers
  const getCartItemQty = (productId: string, variantIndex: number = 0): number => {
    const item = cart.find((c) => c.productId === productId && c.variantIndex === variantIndex);
    return item ? item.qty : 0;
  };

  const handleAddToCart = (product: CatalogueProduct, variantIndex: number = 0) => {
    const variant = product.variants?.[variantIndex] || {
      name: product.weight || "Standard Pack",
      price: product.price,
      stockStatus: product.stockStatus,
    };
    const cartItemId = `${product.id}_${variantIndex}`;

    setCart((prev) => {
      const existing = prev.find((c) => c.id === cartItemId);
      if (existing) {
        return prev.map((c) => (c.id === cartItemId ? { ...c, qty: c.qty + 1 } : c));
      }
      return [
        ...prev,
        {
          id: cartItemId,
          productId: product.id,
          productName: product.name,
          variantIndex,
          variantName: variant.name,
          price: variant.price,
          compareAtPrice: product.compareAtPrice,
          image: product.image,
          qty: 1,
          weight: product.weight,
          origin: product.origin,
        },
      ];
    });
  };

  const handleUpdateCartQty = (cartItemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) => {
          if (c.id === cartItemId) {
            const newQty = c.qty + delta;
            return newQty > 0 ? { ...c, qty: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleClearCart = () => {
    setCart([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("prajnaa_catalogue_cart");
    }
  };

  const totalCartItems = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const totalCartPrice = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);

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

  // WhatsApp Multi-Item Cart Checkout Dispatcher
  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;

    if (typeof window !== "undefined") {
      try {
        if (customerName) localStorage.setItem("prajnaa_cust_name", customerName);
        if (customerPhone) localStorage.setItem("prajnaa_cust_phone", customerPhone);
        if (customerAddress) localStorage.setItem("prajnaa_cust_address", customerAddress);
      } catch {}
    }

    const itemsListText = cart
      .map(
        (item, idx) =>
          `${idx + 1}. *${item.productName}* (${item.variantName})\n   • Qty: ${item.qty} × ₹${item.price.toLocaleString("en-IN")} = ₹${(item.qty * item.price).toLocaleString("en-IN")}`
      )
      .join("\n\n");

    const lines = [
      `🌿 *NEW ORDER • PRAJNAA HIMALAYAN HARVEST* 🌿`,
      `--------------------------------------`,
      customerName ? `👤 *Customer:* ${customerName}` : null,
      customerPhone ? `📞 *Phone:* ${customerPhone}` : null,
      customerAddress ? `📍 *Delivery Address:*\n${customerAddress}` : null,
      orderNotes ? `📝 *Notes:* ${orderNotes}` : null,
      `--------------------------------------`,
      `🛒 *ORDERED ITEMS (${totalCartItems} items):*`,
      itemsListText,
      `--------------------------------------`,
      `💰 *Grand Total:* ₹${totalCartPrice.toLocaleString("en-IN")}`,
      `📦 *Fulfillment:* Speed Post (Solan Hub, HP)`,
      `--------------------------------------`,
      `Namaste ji! Kripya mera order confirm kar dijiye and payment & dispatch details bhej dijiye.`,
    ].filter(Boolean);

    const fullMsg = lines.join("\n");

    try {
      fetch("/api/crm/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: "customer",
          from: (customerPhone || "web_visitor").replace(/\D/g, "") || "web_visitor",
          to: cleanStorePhone,
          customerName: customerName || "Catalogue Customer",
          text: fullMsg,
        }),
      }).catch(() => {});
    } catch {}

    const waUrl = `https://wa.me/${cleanStorePhone}?text=${encodeURIComponent(fullMsg)}`;
    window.open(waUrl, "_blank");
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
    <div className="min-h-screen bg-[#F8F9FA] text-neutral-900 font-sans selection:bg-[#0F3D2E] selection:text-white pb-32">
      {/* 1. TOP ANNOUNCEMENT TICKER */}
      <div className="bg-[#0F3D2E] text-white py-1.5 px-4 text-center text-xs font-medium tracking-wide flex items-center justify-center gap-2 border-b border-emerald-950/40">
        <Sparkles className="w-3.5 h-3.5 text-[#E8A317] shrink-0" />
        <span className="truncate">
          100% Certified Pure Himalayan Harvest • Direct from Orchards &amp; Mountain Beekeepers • Speed Post Across India
        </span>
      </div>

      {/* 2. STICKY HEADER (BLINKIT STYLE COMPACT HEADER) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 sm:gap-6">
          {/* Logo & Subtitle */}
          <Link href="/catalogue" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#0F3D2E] text-white flex items-center justify-center font-serif font-black text-base shadow-xs">
              P
            </div>
            <div className="hidden xs:block">
              <span className="font-serif font-black text-base sm:text-lg tracking-tight text-[#0F3D2E] block leading-none">
                PRAJNAA
              </span>
              <span className="text-[10px] text-neutral-500 font-medium tracking-wider uppercase block mt-0.5">
                Himalayan Store
              </span>
            </div>
          </Link>

          {/* Quick Location / Delivery Pill (Blinkit Style) */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200/80 text-xs text-neutral-700">
            <MapPin className="w-3.5 h-3.5 text-[#0F3D2E] shrink-0" />
            <span className="font-bold text-neutral-900">Delivery in 3-5 days</span>
            <span className="text-neutral-400">|</span>
            <span className="text-neutral-500 truncate max-w-[140px]">Solan Hub, HP</span>
          </div>

          {/* Center: Search Bar */}
          <div className="flex-1 max-w-lg relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search honey, shilajit, dry fruits, saffron..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-50 focus:bg-white border border-neutral-200 text-xs sm:text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]/20 focus:border-[#0F3D2E] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Header Actions: WhatsApp Helpline + Blinkit Cart Pill */}
          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${cleanStorePhone}?text=${encodeURIComponent("Namaste ji! Mujhe Prajnaa products ki catalogue enquiry karni hai.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-neutral-700 hover:bg-neutral-100 text-xs font-semibold transition"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-700" />
              <span>{storePhone}</span>
            </a>

            {/* Blinkit Style Header Cart Button */}
            <button
              type="button"
              onClick={() => setShowCartDrawer(true)}
              className="px-3 sm:px-4 py-2 rounded-xl bg-[#0F3D2E] hover:bg-[#16503d] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition active:scale-95 cursor-pointer shrink-0"
            >
              <ShoppingBag className="w-4 h-4 text-[#E8A317]" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0 sm:gap-1.5 text-left">
                <span className="font-extrabold">{totalCartItems} {totalCartItems === 1 ? "Item" : "Items"}</span>
                {totalCartItems > 0 && (
                  <span className="text-[#E8A317] font-mono text-xs hidden sm:inline">
                    • ₹{totalCartPrice.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* 3. HORIZONTAL CATEGORY SCROLLER & FILTERS */}
      <section className="bg-white border-b border-neutral-200/80 sticky top-[57px] z-20 shadow-3xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
          <div className="flex items-center justify-between gap-3 overflow-hidden">
            {/* Horizontal Categories */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs flex-1">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full whitespace-nowrap font-bold text-xs transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? "bg-[#0F3D2E] text-white shadow-2xs"
                        : "bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 border border-neutral-200/60"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Sort & Availability Controls */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
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

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-2.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. MAIN PRODUCT GRID (BLINKIT COMPACT GRID WITH SMALL ICONS) */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-5">
        {/* Results Bar */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-200/60 text-xs text-neutral-500">
          <div>
            Showing <strong className="text-neutral-900 font-bold">{filteredProducts.length}</strong> products
            {selectedCategory !== "All" && (
              <span> in <strong className="text-[#0F3D2E]">{selectedCategory}</strong></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Stock Sync</span>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-[#0F3D2E] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-neutral-500 font-medium">Loading live Himalayan inventory...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Empty Search State */
          <div className="py-20 text-center space-y-3.5 max-w-md mx-auto bg-white rounded-3xl p-8 border border-neutral-200 shadow-xs">
            <AlertCircle className="w-12 h-12 text-neutral-300 mx-auto" />
            <h3 className="font-serif font-bold text-lg text-neutral-800">No matching harvest found</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              We couldn&apos;t find any live product matching your selected filters or search terms.
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
          /* BLINKIT COMPACT GRID: Small icons, multi-column, clean cards */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
            {filteredProducts.map((item) => {
              const currentVariantIndex = selectedVariants[item.id] || 0;
              const activeVariant = item.variants?.[currentVariantIndex] || {
                name: item.weight || "500g",
                price: item.price,
                stockStatus: item.stockStatus,
              };

              const activePrice = activeVariant.price;
              const comparePrice = item.compareAtPrice
                ? Math.round(item.compareAtPrice * (activePrice / item.price))
                : null;
              const discountPercent =
                comparePrice && comparePrice > activePrice
                  ? Math.round(((comparePrice - activePrice) / comparePrice) * 100)
                  : null;

              const cartItemId = `${item.id}_${currentVariantIndex}`;
              const itemQtyInCart = getCartItemQty(item.id, currentVariantIndex);
              const isHighlighted = highlightedSlug === item.slug || highlightedSlug === item.id;

              return (
                <div
                  key={item.id}
                  id={item.slug}
                  className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between p-2.5 sm:p-3 relative group ${
                    isHighlighted
                      ? "ring-2 ring-emerald-600 border-emerald-600 shadow-lg scale-[1.01]"
                      : "border-neutral-200/90 hover:border-emerald-500/60 shadow-2xs"
                  }`}
                >
                  {/* CARD TOP: Compact Square Product Thumbnail (Small Icon Size) */}
                  <div>
                    <div className="relative aspect-square w-full bg-neutral-50 rounded-xl overflow-hidden flex items-center justify-center p-2 mb-2">
                      <Image
                        src={item.image || "/assets/cat-honey.jpg"}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 16vw"
                        className="object-contain p-1.5 group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/assets/cat-honey.jpg";
                        }}
                      />

                      {/* Top-Left: Discount Badge */}
                      {discountPercent && discountPercent > 0 && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-[#0F3D2E] text-white shadow-2xs">
                          {discountPercent}% OFF
                        </span>
                      )}

                      {/* Top-Right: Stock Badge */}
                      {item.stockStatus === "out_of_stock" ? (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-neutral-600 text-white">
                          Sold Out
                        </span>
                      ) : item.stockStatus === "few_left" ? (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-500 text-white">
                          Few Left
                        </span>
                      ) : null}
                    </div>

                    {/* CARD CONTENT */}
                    <div className="space-y-1">
                      {/* Origin & Delivery Time Badge */}
                      <div className="text-[10px] font-semibold text-emerald-800 truncate flex items-center gap-1">
                        <Truck className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                        <span className="truncate">Speed Post • {item.origin || "Solan, HP"}</span>
                      </div>

                      {/* Product Title */}
                      <h3 className="font-bold text-xs sm:text-sm text-neutral-900 leading-snug line-clamp-2 min-h-[2.4rem] group-hover:text-emerald-800 transition-colors">
                        {item.name}
                      </h3>

                      {/* Size / Variant Selector (Dropdown or Weight Tag) */}
                      <div className="pt-0.5">
                        {item.variants && item.variants.length > 1 ? (
                          <select
                            value={currentVariantIndex}
                            onChange={(e) => handleSelectVariant(item.id, Number(e.target.value))}
                            className="w-full text-[10px] font-semibold py-1 px-1.5 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer truncate"
                          >
                            {item.variants.map((v, vIdx) => (
                              <option key={vIdx} value={vIdx}>
                                {v.name} - ₹{v.price}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[11px] text-neutral-500 font-medium truncate block">
                            {activeVariant.name || item.weight || "Standard Pack"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CARD BOTTOM: Price & Signature Blinkit ADD / Stepper Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100 mt-2 gap-1">
                    <div>
                      <div className="text-xs sm:text-sm font-extrabold text-neutral-900">
                        ₹{activePrice.toLocaleString("en-IN")}
                      </div>
                      {comparePrice && comparePrice > activePrice && (
                        <div className="text-[10px] text-neutral-400 line-through">
                          ₹{comparePrice.toLocaleString("en-IN")}
                        </div>
                      )}
                    </div>

                    {/* Blinkit ADD Button or Counter Stepper */}
                    {item.stockStatus === "out_of_stock" ? (
                      <button
                        type="button"
                        onClick={() => {
                          const waUrl = `https://wa.me/${cleanStorePhone}?text=${encodeURIComponent(`Namaste ji! Mujhe *${item.name}* ke baare mein enquiry karni hai.`)}`;
                          window.open(waUrl, "_blank");
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-neutral-300 bg-neutral-100 text-neutral-500 text-[11px] font-bold cursor-pointer"
                      >
                        Enquire
                      </button>
                    ) : itemQtyInCart > 0 ? (
                      <div className="flex items-center rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-2xs overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(cartItemId, -1)}
                          className="px-2 py-1.5 hover:bg-emerald-800 transition cursor-pointer"
                          title="Decrease"
                        >
                          −
                        </button>
                        <span className="px-2 py-1.5 font-mono text-xs">{itemQtyInCart}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(cartItemId, 1)}
                          className="px-2 py-1.5 hover:bg-emerald-800 transition cursor-pointer"
                          title="Increase"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item, currentVariantIndex)}
                        className="px-3.5 py-1.5 rounded-xl border-2 border-emerald-600 bg-white hover:bg-emerald-50 text-emerald-700 font-extrabold text-xs transition shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95"
                      >
                        <span>ADD</span>
                        <span className="text-sm leading-none">+</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. FLOATING BOTTOM CART BAR (BLINKIT STYLE) */}
      {totalCartItems > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:max-w-xl sm:left-1/2 sm:-translate-x-1/2 z-40 bg-[#0F3D2E] text-white p-3 sm:p-3.5 rounded-2xl shadow-2xl flex items-center justify-between border border-emerald-600/50 backdrop-blur-md animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/80 flex items-center justify-center text-white shrink-0 shadow-inner">
              <ShoppingBag className="w-5 h-5 text-[#E8A317]" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
                <span>{totalCartItems} {totalCartItems === 1 ? "Item" : "Items"}</span>
                <span>•</span>
                <span className="text-[#E8A317]">₹{totalCartPrice.toLocaleString("en-IN")}</span>
              </div>
              <p className="text-[10px] text-emerald-200">Speed Post Fulfillment Across India</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCartDrawer(true)}
            className="px-4 py-2.5 rounded-xl bg-white text-[#0F3D2E] font-black text-xs sm:text-sm hover:bg-emerald-50 transition shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span>View Cart</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 6. CART DRAWER / MODAL (MULTI-ITEM ORDER REVIEW & WHATSAPP DISPATCH) */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#0F3D2E]" />
                <h2 className="font-extrabold text-base text-neutral-900">
                  My Cart ({totalCartItems} items)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer mr-1"
                  >
                    Clear Cart
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCartDrawer(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto" />
                  <p className="text-sm font-bold text-neutral-700">Your cart is empty</p>
                  <p className="text-xs text-neutral-400">Add pure Himalayan harvest products to continue</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2.5">
                    {cart.map((cItem) => (
                      <div
                        key={cItem.id}
                        className="p-3 rounded-2xl border border-neutral-200 bg-white flex items-center gap-3 shadow-2xs"
                      >
                        <img
                          src={cItem.image || "/assets/cat-honey.jpg"}
                          alt={cItem.productName}
                          className="w-14 h-14 rounded-xl object-contain bg-neutral-50 border border-neutral-100 p-1 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-neutral-900 truncate">
                            {cItem.productName}
                          </h4>
                          <p className="text-[11px] text-neutral-500 truncate">
                            {cItem.variantName}
                          </p>
                          <p className="text-xs font-extrabold text-[#0F3D2E] mt-0.5">
                            ₹{(cItem.price * cItem.qty).toLocaleString("en-IN")}{" "}
                            <span className="text-[10px] text-neutral-400 font-normal">
                              (₹{cItem.price} × {cItem.qty})
                            </span>
                          </p>
                        </div>
                        {/* Stepper */}
                        <div className="flex items-center rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-2xs shrink-0 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(cItem.id, -1)}
                            className="px-2 py-1 hover:bg-emerald-800 transition cursor-pointer"
                          >
                            −
                          </button>
                          <span className="px-2 py-1 font-mono">{cItem.qty}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(cItem.id, 1)}
                            className="px-2 py-1 hover:bg-emerald-800 transition cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Address & Customer Details */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                    <h4 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" /> Delivery Details:
                    </h4>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Full Name (e.g. Ramesh Sharma)"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="WhatsApp Phone Number (e.g. 9876543210)"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <textarea
                      rows={2}
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Delivery Address, City, State & Pincode"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>

                  {/* Bill Summary */}
                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1.5 text-xs">
                    <div className="flex justify-between text-neutral-600">
                      <span>Items Subtotal ({totalCartItems})</span>
                      <span className="font-mono font-bold text-neutral-900">₹{totalCartPrice.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Speed Post Delivery</span>
                      <span className="font-semibold text-emerald-700">Speed Post Across India</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-neutral-900 pt-2 border-t border-neutral-200">
                      <span>Grand Total</span>
                      <span className="font-mono text-base text-[#0F3D2E]">₹{totalCartPrice.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer CTA */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-neutral-200 bg-white space-y-2">
                <button
                  type="button"
                  onClick={handleWhatsAppCheckout}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] cursor-pointer"
                >
                  <Phone className="w-4 h-4 fill-current" />
                  <span>Order on WhatsApp 📲 (₹{totalCartPrice.toLocaleString("en-IN")})</span>
                </button>
                <p className="text-[10px] text-center text-neutral-400">
                  Clicking opens WhatsApp with your itemized cart details ready to send.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. TRUST, PURITY & ASSURANCE SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-16 pt-10 border-t border-neutral-200/80">
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
              Dispatched swiftly from our Solan mountain hub across India. Automated live shipping updates, transit location milestones, and tracking alerts are delivered directly to your WhatsApp.
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
    </div>
  );
}
