"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  AlertTriangle,
  Ban,
  Search,
  Plus,
  Minus,
  Equal,
  X,
  History,
  Loader2,
  CheckCircle2,
  ArrowUpRight,
  TrendingDown,
  RotateCcw,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { inr } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import {
  inventoryService,
  getAvailability,
  subscribeToInventoryUpdates,
  type InventoryRecord,
  type StockMovement,
  formatStock,
} from "@/lib/services/inventoryService";
import { toGrams, fromGrams } from "@/lib/weight-utils";

export default function AdminInventoryPage() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get("search") || "";
  const initialFilter = searchParams?.get("filter") || "all";

  const qc = useQueryClient();
  const { user } = useAuth();

  // Active Main Tab: "stock" | "history"
  const [activeTab, setActiveTab] = useState<"stock" | "history">("stock");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">(
    initialFilter === "low_stock" || initialFilter === "out_of_stock" || initialFilter === "in_stock"
      ? (initialFilter as any)
      : "all"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFarmer, setSelectedFarmer] = useState<string>("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // -------------------------------------------------------------------
  // ADJUST STOCK MODAL STATE
  // -------------------------------------------------------------------
  const [adjustModalItem, setAdjustModalItem] = useState<InventoryRecord | null>(null);
  const [adjustMode, setAdjustMode] = useState<"add" | "remove" | "set">("add");
  const [adjustKg, setAdjustKg] = useState<string>("0");
  const [adjustG, setAdjustG] = useState<string>("0");
  const [adjustReason, setAdjustReason] = useState<string>("Warehouse replenishment");
  const [adjustNote, setAdjustNote] = useState<string>("");
  const [savingAdjust, setSavingAdjust] = useState(false);

  // -------------------------------------------------------------------
  // PRODUCT HISTORY DRAWER / MODAL STATE
  // -------------------------------------------------------------------
  const [historyModalItem, setHistoryModalItem] = useState<InventoryRecord | null>(null);

  // History Tab Filter States
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>("all");

  // Modal Focus Trap Ref
  const modalRef = useRef<HTMLDivElement | null>(null);
  const kgInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch Inventory Data
  const {
    data: rawInventory = [],
    isLoading: inventoryLoading,
    refetch: refetchInventory,
  } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: () => inventoryService.getAllInventory(),
    refetchInterval: 15000,
  });

  // Fetch Stock Movements Data for History Tab
  const {
    data: stockMovements = [],
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["admin-stock-movements", historyTypeFilter],
    queryFn: () =>
      inventoryService.getStockMovements({
        type: historyTypeFilter !== "all" ? historyTypeFilter : undefined,
      }),
    refetchInterval: 20000,
  });

  // Fetch Individual Product Movements for History Modal
  const {
    data: productMovements = [],
    isLoading: productHistoryLoading,
  } = useQuery({
    queryKey: ["product-movements", historyModalItem?.product_id],
    queryFn: () =>
      historyModalItem
        ? inventoryService.getStockMovements({ productId: historyModalItem.product_id })
        : Promise.resolve([]),
    enabled: !!historyModalItem,
  });

  // Reactive cross-tab listener
  useEffect(() => {
    const unsubscribe = subscribeToInventoryUpdates(() => {
      qc.invalidateQueries({ queryKey: ["admin-inventory"] });
      qc.invalidateQueries({ queryKey: ["admin-stock-movements"] });
    });
    return unsubscribe;
  }, [qc]);

  // Sync URL search param if it changes
  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  // Keyboard accessibility: Escape closes modal & Tab cycles within modal (Focus Trap)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (adjustModalItem) setAdjustModalItem(null);
        if (historyModalItem) setHistoryModalItem(null);
      } else if (e.key === "Tab" && modalRef.current && (adjustModalItem || historyModalItem)) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === firstElement || !modalRef.current.contains(document.activeElement)) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement || !modalRef.current.contains(document.activeElement)) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [adjustModalItem, historyModalItem]);

  // Focus trap: auto focus on kg input when adjust modal opens
  useEffect(() => {
    if (adjustModalItem) {
      setTimeout(() => {
        kgInputRef.current?.focus();
        kgInputRef.current?.select();
      }, 50);
    }
  }, [adjustModalItem]);

  // Categories and Farmers list for dropdown filters
  const { categories, farmers } = useMemo(() => {
    const catSet = new Set<string>();
    const farmerMap = new Map<string, string>();

    rawInventory.forEach((item) => {
      if (item.category) catSet.add(item.category);
      if (item.farmer_id && item.farmer_name) {
        farmerMap.set(item.farmer_id, item.farmer_name);
      }
    });

    return {
      categories: Array.from(catSet).sort(),
      farmers: Array.from(farmerMap.entries()).map(([id, name]) => ({ id, name })),
    };
  }, [rawInventory]);

  // Aggregate Counters for Filter Chips
  const filterCounts = useMemo(() => {
    let total = rawInventory.length;
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    rawInventory.forEach((item) => {
      const avail = getAvailability(item);
      if (avail.status === "in_stock") inStock++;
      else if (avail.status === "low_stock") lowStock++;
      else if (avail.status === "out_of_stock") outOfStock++;
    });

    return { total, inStock, lowStock, outOfStock };
  }, [rawInventory]);

  // Filtered Inventory Rows for Display
  const filteredInventory = useMemo(() => {
    return rawInventory.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (item.product_name || "").toLowerCase().includes(q) ||
          (item.farmer_name || "").toLowerCase().includes(q) ||
          (item.variant_name || "").toLowerCase().includes(q) ||
          (item.category || "").toLowerCase().includes(q);
        if (!match) return false;
      }

      // 2. Category Filter
      if (selectedCategory !== "all") {
        if ((item.category || "").toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // 3. Farmer Filter
      if (selectedFarmer !== "all") {
        if (item.farmer_id !== selectedFarmer) {
          return false;
        }
      }

      const avail = getAvailability(item);

      // 4. Low Stock Only Filter Toggle
      if (lowStockOnly) {
        if (avail.status !== "low_stock") return false;
      }

      // 5. Status Filter Chip
      if (statusFilter !== "all") {
        if (avail.status !== statusFilter) return false;
      }

      return true;
    });
  }, [rawInventory, searchQuery, selectedCategory, selectedFarmer, statusFilter, lowStockOnly]);

  // Open Adjust Modal
  const openAdjustModal = (item: InventoryRecord, mode: "add" | "remove" | "set" = "add") => {
    setAdjustModalItem(item);
    setAdjustMode(mode);
    setAdjustKg("0");
    setAdjustG("0");
    setAdjustNote("");

    // Set default reason for mode
    if (mode === "add") {
      setAdjustReason("Warehouse replenishment");
    } else if (mode === "remove") {
      setAdjustReason("Damaged");
    } else {
      setAdjustReason("Physical stock count");
    }
  };

  // Quick fill chips logic: adds amount to current input value
  const handleQuickFillChip = (addGrams: number) => {
    const currentInputGrams = toGrams(adjustKg, adjustG);
    const newTotal = currentInputGrams + addGrams;
    const { kg, g } = fromGrams(newTotal);
    setAdjustKg(String(kg));
    setAdjustG(String(g));
  };

  // Change mode in segmented control and update default reason
  const handleChangeMode = (mode: "add" | "remove" | "set") => {
    setAdjustMode(mode);
    if (mode === "add") {
      setAdjustReason("Warehouse replenishment");
    } else if (mode === "remove") {
      setAdjustReason("Damaged");
    } else {
      setAdjustReason("Physical stock count");
    }
  };

  // Calculated grams and live preview
  const currentItemGrams = useMemo(() => {
    if (!adjustModalItem) return 0;
    return adjustModalItem.stock_grams !== undefined
      ? adjustModalItem.stock_grams
      : Math.max(0, Math.round(Number(adjustModalItem.quantity || 0) * 1000));
  }, [adjustModalItem]);

  const inputGrams = useMemo(() => {
    return toGrams(adjustKg, adjustG);
  }, [adjustKg, adjustG]);

  const previewNewTotal = useMemo(() => {
    if (adjustMode === "add") {
      return currentItemGrams + inputGrams;
    } else if (adjustMode === "remove") {
      return currentItemGrams - inputGrams;
    } else {
      return inputGrams;
    }
  }, [adjustMode, currentItemGrams, inputGrams]);

  // Validation
  const isNegativeError = previewNewTotal < 0;
  const isInputZero = inputGrams === 0;
  const isConfirmDisabled =
    savingAdjust ||
    isNegativeError ||
    ((adjustMode === "add" || adjustMode === "remove") && isInputZero);

  // Submit Stock Adjustment
  const handleConfirmAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalItem) return;

    if (isNegativeError) {
      toast.error(`Not enough stock. Only ${formatStock(currentItemGrams)} available.`);
      return;
    }

    if ((adjustMode === "add" || adjustMode === "remove") && inputGrams <= 0) {
      toast.error(`Please enter a quantity greater than 0 to ${adjustMode}`);
      return;
    }

    setSavingAdjust(true);
    try {
      const isValidKey = (v?: string | null) => Boolean(v && v !== "undefined" && v !== "null" && v.trim() !== "");
      const rawPid = adjustModalItem.product_id;
      const rawSlug = adjustModalItem.product_slug;
      const rawId = adjustModalItem.id?.replace(/^inv_/, "");
      const targetProductId = (
        (isValidKey(rawPid) ? rawPid : "") ||
        (isValidKey(rawSlug) ? rawSlug : "") ||
        (isValidKey(rawId) ? rawId : "") ||
        ""
      ).trim();

      const res = await inventoryService.adjustStock({
        productId: targetProductId,
        mode: adjustMode,
        grams: inputGrams,
        reason: adjustReason,
        note: adjustNote.trim() || undefined,
        userEmail: user?.email || "admin",
      });

      if (res.success) {
        toast.success(
          `Stock updated for "${adjustModalItem.product_name}". New total: ${formatStock(res.stockAfter)}`
        );

        // 1. Optimistic UI update: strictly match ONLY the target product
        qc.setQueryData<InventoryRecord[]>(["admin-inventory"], (old) => {
          if (!old) return old;
          const targetPid = isValidKey(adjustModalItem.product_id) ? adjustModalItem.product_id : "";
          const targetId = isValidKey(adjustModalItem.id) ? adjustModalItem.id : "";
          const targetSlug = isValidKey(adjustModalItem.product_slug) ? adjustModalItem.product_slug : "";

          return old.map((item) => {
            // Match strictly by explicit ID or product key — never loose fuzzy matching
            const isMatch =
              Boolean(targetId && item.id && item.id === targetId) ||
              Boolean(targetPid && item.product_id && item.product_id === targetPid) ||
              Boolean(targetSlug && item.product_slug && item.product_slug === targetSlug);

            if (isMatch) {
              return {
                ...item,
                stock_grams: res.stockAfter,
                quantity: Math.floor(res.stockAfter / 1000),
                updated_at: new Date().toISOString(),
              };
            }
            return item;
          });
        });

        setAdjustModalItem(null);

        // 2. Comprehensive refetch and cache invalidations
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["admin-inventory"] }),
          qc.invalidateQueries({ queryKey: ["admin-stock-movements"] }),
          qc.invalidateQueries({ queryKey: ["admin-products"] }),
          qc.invalidateQueries({ queryKey: ["public-all-products"] }),
          qc.invalidateQueries({ queryKey: ["farmer-products"] }),
        ]);

        refetchInventory();
        refetchHistory();
      } else {
        toast.error(res.error || "Failed to adjust stock");
      }
    } catch (err: any) {
      toast.error(err?.message || "Stock adjustment failed");
    } finally {
      setSavingAdjust(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-subhead text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F3D2E]">
              Inventory Management
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              Weight Based (kg/g)
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Warehouse Stock &amp; Traceability
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Single Source of Truth. Stock measured in integer grams, displayed as kg and g.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Main Tab Toggle */}
          <div className="flex items-center rounded-full border border-border bg-background p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("stock")}
              className={`font-subhead rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "stock"
                  ? "bg-[#0F3D2E] text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Stock on Shelf
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`font-subhead rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-[#0F3D2E] text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="h-3.5 w-3.5" /> Movement History
            </button>
          </div>

          <Link
            href="/admin/products"
            className="font-subhead inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </Link>
        </div>
      </div>

      {activeTab === "stock" ? (
        <div className="space-y-4">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {/* Total Listings */}
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setLowStockOnly(false);
              }}
              className={`rounded-2xl border p-4 text-left transition cursor-pointer shadow-2xs ${
                statusFilter === "all" && !lowStockOnly
                  ? "border-[#0F3D2E] bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-[#0F3D2E]"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-subhead text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Total Products
                </span>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-foreground">
                  {filterCounts.total}
                </span>
                <span className="text-xs text-muted-foreground">items</span>
              </div>
            </button>

            {/* In Stock */}
            <button
              type="button"
              onClick={() => {
                setStatusFilter("in_stock");
                setLowStockOnly(false);
              }}
              className={`rounded-2xl border p-4 text-left transition cursor-pointer shadow-2xs ${
                statusFilter === "in_stock" && !lowStockOnly
                  ? "border-emerald-600 bg-emerald-500/10 ring-1 ring-emerald-600"
                  : "border-border bg-background hover:border-emerald-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-subhead text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-300">
                  In Stock
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                  {filterCounts.inStock}
                </span>
                <span className="text-xs text-muted-foreground">healthy</span>
              </div>
            </button>

            {/* Low Stock Filter */}
            <button
              type="button"
              onClick={() => {
                setStatusFilter("low_stock");
                setLowStockOnly(true);
              }}
              className={`rounded-2xl border p-4 text-left transition cursor-pointer shadow-2xs ${
                statusFilter === "low_stock" || lowStockOnly
                  ? "border-amber-600 bg-amber-500/15 ring-1 ring-amber-600"
                  : "border-border bg-background hover:border-amber-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-subhead text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-300">
                  Low Stock
                </span>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-amber-800 dark:text-amber-300">
                  {filterCounts.lowStock}
                </span>
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">needs restock</span>
              </div>
            </button>

            {/* Out of Stock */}
            <button
              type="button"
              onClick={() => {
                setStatusFilter("out_of_stock");
                setLowStockOnly(false);
              }}
              className={`rounded-2xl border p-4 text-left transition cursor-pointer shadow-2xs ${
                statusFilter === "out_of_stock" && !lowStockOnly
                  ? "border-rose-600 bg-rose-500/15 ring-1 ring-rose-600"
                  : "border-border bg-background hover:border-rose-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-subhead text-[11px] font-bold uppercase tracking-[0.14em] text-rose-700 dark:text-rose-400">
                  Out of Stock
                </span>
                <Ban className="h-4 w-4 text-rose-600" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-rose-700 dark:text-rose-300">
                  {filterCounts.outOfStock}
                </span>
                <span className="text-xs text-muted-foreground">0 kg</span>
              </div>
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-background p-3 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product name, farmer, category..."
                className="font-subhead h-10 w-full rounded-xl border border-border bg-secondary/30 pl-10 pr-4 text-xs outline-none focus:border-primary transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="font-subhead h-10 rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary capitalize cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/-/g, " ")}
                  </option>
                ))}
              </select>

              {/* Farmer Filter */}
              <select
                value={selectedFarmer}
                onChange={(e) => setSelectedFarmer(e.target.value)}
                className="font-subhead h-10 rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">All Farmers</option>
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>

              {/* Low stock only toggle */}
              <button
                type="button"
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`font-subhead h-10 rounded-xl border px-3 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  lowStockOnly
                    ? "border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                    : "border-border bg-background text-muted-foreground hover:bg-secondary"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Low stock only
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setSelectedCategory("all");
                  setSelectedFarmer("all");
                  setLowStockOnly(false);
                }}
                className="font-subhead h-10 rounded-xl border border-border px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Main Inventory Table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 font-subhead text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="px-5 py-3.5">Product</th>
                    <th className="px-5 py-3.5">Price / kg</th>
                    <th className="px-5 py-3.5">Stock</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {inventoryLoading ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="text-xs font-semibold">Loading warehouse stock...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-muted-foreground">
                        <div className="max-w-xs mx-auto space-y-2">
                          <Package className="h-8 w-8 mx-auto text-muted-foreground/40" />
                          <p className="font-display font-semibold text-foreground text-sm">
                            No inventory items found
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Try adjusting your search query, status filters, or add a product.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => {
                      const avail = getAvailability(item);
                      const currentGrams =
                        item.stock_grams !== undefined
                          ? item.stock_grams
                          : Math.max(0, Math.round(Number(item.quantity || 0) * 1000));
                      const pricePerKg =
                        item.price_per_kg !== undefined && item.price_per_kg > 0
                          ? item.price_per_kg
                          : Number(item.price || 0);

                      return (
                        <tr
                          key={item.id || item.product_id}
                          className="hover:bg-secondary/20 transition-colors"
                        >
                          {/* Product */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary/30">
                                <img
                                  src={item.product_image || "/assets/cat-dryfruits.jpg"}
                                  alt={item.product_name || "Product"}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/product/${item.product_slug || item.product_id}`}
                                  target="_blank"
                                  className="font-display font-bold text-foreground text-sm hover:text-primary transition truncate block"
                                >
                                  {item.product_name}
                                </Link>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-muted-foreground">
                                    {item.farmer_name || "Verified Local Farmer"}
                                  </span>
                                  <span className="text-border">•</span>
                                  <span className="font-mono text-[10px] text-muted-foreground uppercase">
                                    {item.category?.replace(/-/g, " ") || "Produce"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Price per kg */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {inr(pricePerKg)}
                            </span>
                            <span className="text-[11px] text-muted-foreground ml-1">/ kg</span>
                          </td>

                          {/* Stock (Formatted with formatStock) */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-mono text-sm font-bold text-foreground">
                                {formatStock(currentGrams)}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground block mt-0.5">
                              {currentGrams.toLocaleString()} g
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${avail.badgeClass}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${avail.dotClass}`} />
                              {avail.label}
                            </span>
                          </td>

                          {/* Actions: Adjust Stock & History */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openAdjustModal(item, "add")}
                                className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-[#0F3D2E] hover:bg-[#154d3b] text-white px-3.5 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer"
                              >
                                Adjust Stock
                              </button>
                              <button
                                type="button"
                                onClick={() => setHistoryModalItem(item)}
                                className="font-subhead inline-flex items-center gap-1 rounded-full border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
                              >
                                <History className="h-3.5 w-3.5" />
                                History
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* History & Audit Trail Tab */
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-background p-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="font-subhead text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Filter by Type:
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {["all", "add", "remove", "set", "sale", "refund"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setHistoryTypeFilter(type)}
                    className={`font-subhead rounded-full px-3 py-1 text-xs font-semibold capitalize transition cursor-pointer ${
                      historyTypeFilter === type
                        ? "bg-[#0F3D2E] text-white shadow-2xs"
                        : "bg-secondary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => refetchHistory()}
              className="font-subhead inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 font-subhead text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="px-4 py-3.5">Timestamp</th>
                    <th className="px-4 py-3.5">Product</th>
                    <th className="px-4 py-3.5">Type</th>
                    <th className="px-4 py-3.5">Amount</th>
                    <th className="px-4 py-3.5">Before &rarr; After</th>
                    <th className="px-4 py-3.5">Reason</th>
                    <th className="px-4 py-3.5">Order / Note</th>
                    <th className="px-4 py-3.5">Admin / User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="text-xs font-semibold">Loading stock movements...</span>
                        </div>
                      </td>
                    </tr>
                  ) : stockMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-muted-foreground">
                        <div className="max-w-xs mx-auto space-y-1">
                          <History className="h-7 w-7 mx-auto text-muted-foreground/40" />
                          <p className="font-display font-semibold text-foreground text-sm">
                            No stock movements found
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Stock adjustments, customer purchases, and refunds will appear here.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    stockMovements.map((m) => {
                      const before = m.stock_before ?? m.stockBefore ?? 0;
                      const after = m.stock_after ?? m.stockAfter ?? 0;
                      const isPositive = m.type === "add" || m.type === "refund" || after > before;

                      return (
                        <tr key={m.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                            {new Date(m.created_at || m.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-display font-bold text-xs text-foreground block">
                              {m.product_name || m.productName || m.product_id || m.productId}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`font-subhead text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                m.type === "add"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : m.type === "remove"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                  : m.type === "set"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                  : m.type === "sale"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              }`}
                            >
                              {m.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-xs font-bold">
                            <span
                              className={
                                isPositive
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-rose-700 dark:text-rose-400"
                              }
                            >
                              {m.type === "set"
                                ? formatStock(after)
                                : isPositive
                                ? `+${formatStock(m.grams)}`
                                : `-${formatStock(m.grams)}`}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {formatStock(before)} &rarr; <strong className="text-foreground">{formatStock(after)}</strong>
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground whitespace-nowrap">
                            {m.reason}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground truncate max-w-[140px]">
                            {m.order_id || m.orderId || m.note || "-"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[140px]">
                            {m.admin_id || m.adminId || m.user_email || "System"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ADJUST STOCK MODAL (Replaces the Restock modal, admin only)
          ===================================================================== */}
      {adjustModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="adjust-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            className="w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 outline-none"
          >
            {/* a) Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="adjust-modal-title" className="font-display text-base font-bold text-foreground">
                    Adjust Stock
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground truncate max-w-[180px]">
                      {adjustModalItem.product_name}
                    </span>
                    <span>•</span>
                    <span className="text-[#0F3D2E] dark:text-emerald-400 font-semibold">
                      sold per kg
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalItem(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdjust} className="space-y-4">
              {/* b) "Current Stock on Shelf" box with formatted stock */}
              <div className="rounded-xl border border-amber-200/80 bg-[#FBF7EE] dark:bg-amber-950/20 p-3.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                  Current Stock on Shelf
                </span>
                <span className="font-mono text-base font-bold text-[#0F3D2E] dark:text-emerald-300">
                  {formatStock(currentItemGrams)}
                </span>
              </div>

              {/* c) Segmented control with 3 modes */}
              <div>
                <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-bold block mb-1.5">
                  Adjustment Mode
                </span>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary/50 p-1 border border-border">
                  <button
                    type="button"
                    onClick={() => handleChangeMode("add")}
                    className={`font-subhead flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                      adjustMode === "add"
                        ? "bg-[#0F3D2E] text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeMode("remove")}
                    className={`font-subhead flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                      adjustMode === "remove"
                        ? "bg-rose-700 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Minus className="h-3.5 w-3.5" /> Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeMode("set")}
                    className={`font-subhead flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                      adjustMode === "set"
                        ? "bg-blue-700 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Equal className="h-3.5 w-3.5" /> Set exact
                  </button>
                </div>
              </div>

              {/* d) Quantity input: side-by-side kg and g */}
              <div>
                <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-bold block mb-1.5">
                  {adjustMode === "set" ? "New Exact Stock *" : "Quantity to Adjust *"}
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      kg (Kilograms)
                    </label>
                    <input
                      ref={kgInputRef}
                      type="number"
                      min="0"
                      step="1"
                      value={adjustKg}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, "");
                        setAdjustKg(val === "" ? "0" : val);
                      }}
                      className="font-mono h-11 w-full rounded-xl border border-border bg-background px-3.5 text-base font-bold outline-none focus:border-primary"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      g (Grams, 0-999)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      step="1"
                      value={adjustG}
                      onChange={(e) => {
                        const raw = parseInt(e.target.value, 10);
                        if (isNaN(raw) || raw < 0) {
                          setAdjustG("0");
                        } else {
                          setAdjustG(String(Math.min(999, raw)));
                        }
                      }}
                      className="font-mono h-11 w-full rounded-xl border border-border bg-background px-3.5 text-base font-bold outline-none focus:border-primary"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* e) Quick-fill chips */}
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  Quick-add to input:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: "+500 g", grams: 500 },
                    { label: "+1 kg", grams: 1000 },
                    { label: "+5 kg", grams: 5000 },
                    { label: "+10 kg", grams: 10000 },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleQuickFillChip(chip.grams)}
                      className="font-mono text-xs font-semibold rounded-lg border border-border bg-secondary/40 hover:bg-secondary px-2.5 py-1 text-foreground transition cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustKg("0");
                      setAdjustG("0");
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline ml-auto cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* f) Live preview line & validation error */}
              <div className="rounded-xl border p-3 text-xs transition-colors">
                {isNegativeError ? (
                  <p className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Not enough stock. Only {formatStock(currentItemGrams)} available.
                  </p>
                ) : (
                  <p className="text-muted-foreground leading-relaxed">
                    {adjustMode === "add" && (
                      <>
                        This <strong>adds</strong> to stock. New total:{" "}
                        <strong className="text-foreground font-mono text-sm">{formatStock(previewNewTotal)}</strong>.
                      </>
                    )}
                    {adjustMode === "remove" && (
                      <>
                        This <strong>removes</strong> from stock. New total:{" "}
                        <strong className="text-foreground font-mono text-sm">{formatStock(previewNewTotal)}</strong>.
                      </>
                    )}
                    {adjustMode === "set" && (
                      <>
                        This <strong>replaces</strong> stock. New total:{" "}
                        <strong className="text-foreground font-mono text-sm">{formatStock(previewNewTotal)}</strong>.
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* g) Reason / Reference dropdown based on mode */}
              <div>
                <label className="block">
                  <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-bold">
                    Reason / Reference *
                  </span>
                  <select
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="font-subhead mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary cursor-pointer"
                  >
                    {adjustMode === "add" && (
                      <>
                        <option value="Warehouse replenishment">Warehouse replenishment</option>
                        <option value="Supplier delivery">Supplier delivery</option>
                        <option value="Customer return">Customer return</option>
                        <option value="Other">Other</option>
                      </>
                    )}
                    {adjustMode === "remove" && (
                      <>
                        <option value="Damaged">Damaged</option>
                        <option value="Expired">Expired</option>
                        <option value="Theft / loss">Theft / loss</option>
                        <option value="Other">Other</option>
                      </>
                    )}
                    {adjustMode === "set" && (
                      <>
                        <option value="Physical stock count">Physical stock count</option>
                        <option value="Correction of mistake">Correction of mistake</option>
                        <option value="Other">Other</option>
                      </>
                    )}
                  </select>
                </label>
              </div>

              {/* Optional Note */}
              <div>
                <label className="block">
                  <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-bold">
                    Admin Note (Optional)
                  </span>
                  <input
                    type="text"
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                    placeholder="Batch #, invoice ref, or observation..."
                    className="font-subhead mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3.5 text-xs outline-none focus:border-primary"
                  />
                </label>
              </div>

              {/* h) Footer: Cancel & Confirm */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAdjustModalItem(null)}
                  className="font-subhead rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConfirmDisabled}
                  className={`font-subhead rounded-full text-white px-5 py-2 text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                    adjustMode === "remove"
                      ? "bg-rose-700 hover:bg-rose-800"
                      : adjustMode === "set"
                      ? "bg-blue-700 hover:bg-blue-800"
                      : "bg-[#0F3D2E] hover:bg-[#154d3b]"
                  }`}
                >
                  {savingAdjust ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : adjustMode === "add" ? (
                    "+ Confirm Restock"
                  ) : adjustMode === "remove" ? (
                    "- Confirm Removal"
                  ) : (
                    "Confirm Stock Count"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          PRODUCT HISTORY MODAL / DRAWER
          ===================================================================== */}
      {historyModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-background p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary text-primary">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Stock History
                  </h3>
                  <p className="text-xs text-muted-foreground truncate max-w-[320px]">
                    {historyModalItem.product_name} (Current:{" "}
                    <strong className="text-foreground">
                      {formatStock(historyModalItem.stock_grams)}
                    </strong>
                    )
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalItem(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/50 font-subhead text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-3.5 py-2.5">Date</th>
                    <th className="px-3.5 py-2.5">Type</th>
                    <th className="px-3.5 py-2.5">Amount</th>
                    <th className="px-3.5 py-2.5">Stock Flow</th>
                    <th className="px-3.5 py-2.5">Reason</th>
                    <th className="px-3.5 py-2.5">Ref / Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {productHistoryLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span>Loading history...</span>
                        </div>
                      </td>
                    </tr>
                  ) : productMovements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        No movement records found for this product.
                      </td>
                    </tr>
                  ) : (
                    productMovements.map((m) => {
                      const before = m.stock_before ?? m.stockBefore ?? 0;
                      const after = m.stock_after ?? m.stockAfter ?? 0;
                      const isPositive = m.type === "add" || m.type === "refund" || after > before;

                      return (
                        <tr key={m.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-3.5 py-2.5 text-muted-foreground font-mono whitespace-nowrap">
                            {new Date(m.created_at || m.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                m.type === "add"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : m.type === "remove"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                  : m.type === "set"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                  : m.type === "sale"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              }`}
                            >
                              {m.type}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 font-mono font-bold whitespace-nowrap">
                            <span
                              className={
                                isPositive
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-rose-700 dark:text-rose-400"
                              }
                            >
                              {m.type === "set"
                                ? formatStock(after)
                                : isPositive
                                ? `+${formatStock(m.grams)}`
                                : `-${formatStock(m.grams)}`}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                            {formatStock(before)} &rarr;{" "}
                            <strong className="text-foreground">{formatStock(after)}</strong>
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">{m.reason}</td>
                          <td className="px-3.5 py-2.5 font-mono text-muted-foreground truncate max-w-[120px]">
                            {m.order_id || m.orderId || m.admin_id || m.adminId || "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setHistoryModalItem(null)}
                className="font-subhead rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
