"use client";

import { createFileRoute } from "@/lib/tanstack-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import {
  Loader2,
  Save,
  Lock,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  History,
  Boxes,
  ArrowUpDown,
  Filter,
  Layers,
  Sparkles,
  Download,
  RotateCcw,
  Package,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFarmerProfile } from "@/lib/farmer/use-farmer";
import { useVerificationStatus } from "@/lib/farmer/use-verification-status";
import { LockedSectionBanner } from "@/components/farmer/locked-section-banner";
import {
  inventoryService,
  type InventoryItem,
  type InventoryAuditLog,
} from "@/lib/services/inventoryService";
import { inr } from "@/lib/format";

function InventoryPage() {
  const { data: farmer } = useFarmerProfile();
  const { isLocked, isVerified } = useVerificationStatus();
  const qc = useQueryClient();

  // Local draft states for direct editing
  const [draftStock, setDraftStock] = useState<Record<string, number>>({});
  const [draftThreshold, setDraftThreshold] = useState<Record<string, number>>({});
  
  // Selection and filtering state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [sortBy, setSortBy] = useState<"name" | "stock_asc" | "stock_desc" | "status">("name");

  // Bulk operation state
  const [bulkMode, setBulkMode] = useState<"fixed" | "add" | "subtract" | "percent" | "threshold">("add");
  const [bulkValue, setBulkValue] = useState<string>("10");
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Audit history modal state
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditItemFilter, setAuditItemFilter] = useState<string | null>(null);
  const [auditReasonFilter, setAuditReasonFilter] = useState<string>("all");

  // Fetch live inventory items
  const {
    data: products = [],
    isLoading,
    isRefetching,
  } = useQuery<InventoryItem[]>({
    enabled: !!farmer?.id && !isLocked,
    queryKey: ["farmer-inventory", farmer?.id],
    queryFn: () => inventoryService.getFarmerInventory(farmer?.id),
    refetchInterval: 10000, // 10s background polling fallback
  });

  // Fetch audit logs
  const { data: auditLogs = [], refetch: refetchAuditLogs } = useQuery<InventoryAuditLog[]>({
    enabled: !!farmer?.id,
    queryKey: ["farmer-inventory-audit-logs", farmer?.id],
    queryFn: () => inventoryService.getInventoryAuditLogs(farmer?.id),
  });

  // Sync draft state with incoming live data when pristine
  useEffect(() => {
    const stockMap: Record<string, number> = {};
    const thresholdMap: Record<string, number> = {};
    products.forEach((p) => {
      stockMap[p.id] = p.stock;
      thresholdMap[p.id] = p.low_stock_threshold || 10;
    });
    setDraftStock(stockMap);
    setDraftThreshold(thresholdMap);
  }, [products]);

  // Real-time Supabase subscription
  useEffect(() => {
    if (!farmer?.id) return;

    const channel = supabase
      .channel("farmer-inventory-realtime-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "farmer_products",
          filter: `farmer_id=eq.${farmer.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["farmer-inventory", farmer.id] });
          qc.invalidateQueries({ queryKey: ["farmer-products", farmer.id] });
          qc.invalidateQueries({ queryKey: ["farmer-dashboard-stats", farmer.id] });
          qc.invalidateQueries({ queryKey: ["farmer-listings-summary", farmer.id] });
          qc.invalidateQueries({ queryKey: ["farmer-low-stock", farmer.id] });
          qc.invalidateQueries({ queryKey: ["public-all-products"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [farmer?.id, qc]);

  // Check which items are modified (dirty)
  const dirtyItems = useMemo(() => {
    return products.filter((p) => {
      const stockChanged = draftStock[p.id] !== undefined && draftStock[p.id] !== p.stock;
      const thresholdChanged =
        draftThreshold[p.id] !== undefined && draftThreshold[p.id] !== p.low_stock_threshold;
      return stockChanged || thresholdChanged;
    });
  }, [products, draftStock, draftThreshold]);

  const hasDirtyChanges = dirtyItems.length > 0;

  // Single Item Instant Stock Update
  const updateSingleStock = async (productId: string, newStockValue: number) => {
    if (!farmer) return;
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const cleanVal = Math.max(0, Math.floor(newStockValue));
    setDraftStock((prev) => ({ ...prev, [productId]: cleanVal }));

    try {
      await inventoryService.updateStockQuantity(
        productId,
        farmer.id,
        prod.name,
        cleanVal,
        prod.stock,
        "manual_edit"
      );
      toast.success(`Updated "${prod.name}" stock to ${cleanVal} ${prod.unit}`);
      qc.invalidateQueries({ queryKey: ["farmer-inventory", farmer.id] });
      qc.invalidateQueries({ queryKey: ["farmer-products", farmer.id] });
      qc.invalidateQueries({ queryKey: ["farmer-dashboard-stats", farmer.id] });
      qc.invalidateQueries({ queryKey: ["farmer-listings-summary", farmer.id] });
      qc.invalidateQueries({ queryKey: ["farmer-low-stock", farmer.id] });
      qc.invalidateQueries({ queryKey: ["public-all-products"] });
      refetchAuditLogs();
    } catch (err: any) {
      toast.error(err?.message || "Stock update failed");
    }
  };

  // Batch Save Mutation
  const saveBatchMut = useMutation({
    mutationFn: async () => {
      if (!farmer) throw new Error("No farmer profile");
      if (isLocked) throw new Error("Inventory management is locked until verified.");

      const updatesToProcess = dirtyItems.map((p) => ({
        id: p.id,
        name: p.name,
        oldStock: p.stock,
        newStock: draftStock[p.id] ?? p.stock,
      }));

      const count = await inventoryService.bulkUpdateStock(
        farmer.id,
        updatesToProcess,
        "manual_edit"
      );
      return count;
    },
    onSuccess: (count) => {
      toast.success(`Successfully saved ${count} product stock update${count === 1 ? "" : "s"}!`);
      qc.invalidateQueries({ queryKey: ["farmer-inventory", farmer?.id] });
      qc.invalidateQueries({ queryKey: ["farmer-products", farmer?.id] });
      qc.invalidateQueries({ queryKey: ["farmer-dashboard-stats", farmer?.id] });
      qc.invalidateQueries({ queryKey: ["farmer-listings-summary", farmer?.id] });
      qc.invalidateQueries({ queryKey: ["farmer-low-stock", farmer?.id] });
      qc.invalidateQueries({ queryKey: ["public-all-products"] });
      refetchAuditLogs();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  // Bulk Apply Handler
  const handleApplyBulkOperation = async () => {
    if (!farmer) return;
    if (selectedIds.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    const numVal = Number(bulkValue);
    if (isNaN(numVal)) {
      toast.error("Please enter a valid numeric adjustment value");
      return;
    }

    const selectedProducts = products.filter((p) => selectedIds.includes(p.id));
    const itemsToUpdate = selectedProducts.map((p) => {
      const current = draftStock[p.id] ?? p.stock;
      let next = current;

      if (bulkMode === "fixed") {
        next = Math.max(0, Math.floor(numVal));
      } else if (bulkMode === "add") {
        next = Math.max(0, Math.floor(current + numVal));
      } else if (bulkMode === "subtract") {
        next = Math.max(0, Math.floor(current - numVal));
      } else if (bulkMode === "percent") {
        next = Math.max(0, Math.floor(current * (1 + numVal / 100)));
      }

      return {
        id: p.id,
        name: p.name,
        oldStock: p.stock,
        newStock: next,
      };
    });

    try {
      const updated = await inventoryService.bulkUpdateStock(
        farmer.id,
        itemsToUpdate,
        "bulk_update"
      );
      toast.success(`Bulk updated stock for ${updated} items!`);
      setSelectedIds([]);
      setShowBulkModal(false);
      qc.invalidateQueries({ queryKey: ["farmer-inventory", farmer.id] });
      qc.invalidateQueries({ queryKey: ["farmer-products", farmer.id] });
      qc.invalidateQueries({ queryKey: ["farmer-dashboard-stats", farmer.id] });
      qc.invalidateQueries({ queryKey: ["farmer-listings-summary", farmer.id] });
      qc.invalidateQueries({ queryKey: ["farmer-low-stock", farmer.id] });
      qc.invalidateQueries({ queryKey: ["public-all-products"] });
      refetchAuditLogs();
    } catch (err: any) {
      toast.error(err?.message || "Bulk update failed");
    }
  };

  // Quick preset adjust handler
  const handleQuickPreset = (productId: string, addAmount: number) => {
    const current = draftStock[productId] ?? 0;
    const next = Math.max(0, current + addAmount);
    updateSingleStock(productId, next);
  };

  // KPIs
  const totalItems = products.length;
  const inStockCount = products.filter((p) => (draftStock[p.id] ?? p.stock) > (draftThreshold[p.id] ?? 10)).length;
  const lowStockCount = products.filter((p) => {
    const s = draftStock[p.id] ?? p.stock;
    const t = draftThreshold[p.id] ?? 10;
    return s <= t && s > 0;
  }).length;
  const outOfStockCount = products.filter((p) => (draftStock[p.id] ?? p.stock) === 0).length;

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search filter
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.hsn_code && p.hsn_code.toLowerCase().includes(q));

        if (!matchesQuery) return false;

        // Status filter
        const stock = draftStock[p.id] ?? p.stock;
        const threshold = draftThreshold[p.id] ?? 10;

        if (statusFilter === "in_stock") return stock > threshold;
        if (statusFilter === "low_stock") return stock <= threshold && stock > 0;
        if (statusFilter === "out_of_stock") return stock === 0;

        return true;
      })
      .sort((a, b) => {
        const stockA = draftStock[a.id] ?? a.stock;
        const stockB = draftStock[b.id] ?? b.stock;

        if (sortBy === "stock_asc") return stockA - stockB;
        if (sortBy === "stock_desc") return stockB - stockA;
        if (sortBy === "status") {
          const rank = (s: number) => (s === 0 ? 0 : s <= 10 ? 1 : 2);
          return rank(stockA) - rank(stockB);
        }
        return a.name.localeCompare(b.name);
      });
  }, [products, searchQuery, statusFilter, sortBy, draftStock, draftThreshold]);

  // Select all / deselect all
  const allFilteredSelected =
    filteredProducts.length > 0 && filteredProducts.every((p) => selectedIds.includes(p.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditItemFilter && log.product_id !== auditItemFilter) return false;
      if (auditReasonFilter !== "all" && log.reason !== auditReasonFilter) return false;
      return true;
    });
  }, [auditLogs, auditItemFilter, auditReasonFilter]);

  // Export audit logs as CSV
  const handleExportCSV = () => {
    if (filteredAuditLogs.length === 0) {
      toast.info("No logs available to export");
      return;
    }
    const headers = ["Timestamp", "Product Name", "Old Stock", "New Stock", "Change", "Reason", "Reference ID"];
    const rows = filteredAuditLogs.map((l) => [
      new Date(l.created_at).toLocaleString(),
      `"${(l.product_name || "").replace(/"/g, '""')}"`,
      l.old_stock,
      l.new_stock,
      l.change_amount,
      l.reason,
      l.reference_id || "",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `prajnaa_inventory_audit_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Audit log exported successfully");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Real-Time Sync Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Inventory Control
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="font-subhead text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time stock management with atomic decrement protection and full audit logging.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setAuditItemFilter(null);
              setShowAuditModal(true);
            }}
            className="font-subhead inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border/80 bg-white text-xs font-semibold text-foreground hover:bg-secondary/60 shadow-2xs transition-all cursor-pointer"
          >
            <History className="h-4 w-4 text-[#0F3D2E]" />
            <span>Audit Trail ({auditLogs.length})</span>
          </button>

          {hasDirtyChanges && (
            <button
              type="button"
              onClick={() => {
                const stockMap: Record<string, number> = {};
                const thresholdMap: Record<string, number> = {};
                products.forEach((p) => {
                  stockMap[p.id] = p.stock;
                  thresholdMap[p.id] = p.low_stock_threshold || 10;
                });
                setDraftStock(stockMap);
                setDraftThreshold(thresholdMap);
                toast.info("Discarded all unsaved changes");
              }}
              className="font-subhead inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border/80 bg-white text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Discard
            </button>
          )}

          <button
            onClick={() => {
              if (isLocked) {
                toast.error("Inventory management is locked until verified.");
                return;
              }
              saveBatchMut.mutate();
            }}
            disabled={isLocked || !hasDirtyChanges || saveBatchMut.isPending}
            className={`font-subhead inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-all shadow-xs ${
              hasDirtyChanges && !isLocked
                ? "bg-[#0F3D2E] text-white hover:bg-[#16503e] active:scale-[0.98] cursor-pointer"
                : "bg-secondary text-muted-foreground border border-border cursor-not-allowed opacity-60"
            }`}
          >
            {isLocked ? (
              <Lock className="h-4 w-4" />
            ) : saveBatchMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>
              {isLocked
                ? "Save Changes (Locked)"
                : hasDirtyChanges
                ? `Save Changes (${dirtyItems.length})`
                : "All Changes Saved"}
            </span>
          </button>
        </div>
      </div>

      {isLocked && (
        <LockedSectionBanner
          sectionName="Inventory Management"
          description="Stock quantity adjustments and live catalog inventory syncing are locked until your Prajnaa Onboarding is verified."
        />
      )}

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tracked SKUs */}
        <div className="rounded-3xl border border-border/80 bg-white p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Total SKUs</span>
            <Boxes className="h-4 w-4 text-[#0F3D2E]" />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            {totalItems}
          </p>
          <span className="text-[11px] text-muted-foreground">Active farm crop listings</span>
        </div>

        {/* In Stock */}
        <div className="rounded-3xl border border-border/80 bg-white p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>In Stock</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold text-emerald-700">
            {inStockCount}
          </p>
          <span className="text-[11px] text-emerald-700/80">Healthy supply buffer</span>
        </div>

        {/* Low Stock Warnings */}
        <div className="rounded-3xl border border-border/80 bg-white p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Low Stock</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold text-amber-700">
            {lowStockCount}
          </p>
          <span className="text-[11px] text-amber-700/80">At or below threshold</span>
        </div>

        {/* Out of Stock */}
        <div className="rounded-3xl border border-border/80 bg-white p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Sold Out</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold text-rose-700">
            {outOfStockCount}
          </p>
          <span className="text-[11px] text-rose-700/80">Blocked on storefront</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-3xl border border-border/80 bg-white p-4 shadow-2xs">
        {/* Search Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search produce name, category, or HSN..."
            className="font-subhead w-full rounded-2xl border border-border/80 bg-[#fbfbf9] pl-10 pr-4 py-2 text-xs outline-none focus:border-[#0F3D2E] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Chips & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-2xl border border-border/80 bg-[#fbfbf9] p-1 gap-1">
            {[
              { id: "all", label: "All Items" },
              { id: "in_stock", label: "In Stock" },
              { id: "low_stock", label: "Low Stock" },
              { id: "out_of_stock", label: "Out of Stock" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id as any)}
                className={`font-subhead px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === f.id
                    ? "bg-[#0F3D2E] text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 pl-1">
            <span className="font-subhead text-[10px] uppercase tracking-wider text-muted-foreground">
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="font-subhead h-8 rounded-xl border border-border/80 bg-[#fbfbf9] px-2.5 text-[11px] font-semibold outline-none focus:border-[#0F3D2E] cursor-pointer"
            >
              <option value="name">Name (A-Z)</option>
              <option value="stock_asc">Stock (Lowest First)</option>
              <option value="stock_desc">Stock (Highest First)</option>
              <option value="status">Health Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="rounded-3xl border border-[#0F3D2E]/30 bg-[#0F3D2E]/5 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="font-display text-sm font-bold text-[#0F3D2E]">
              {selectedIds.length} item{selectedIds.length > 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
            >
              Deselect all
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkMode}
              onChange={(e) => setBulkMode(e.target.value as any)}
              className="font-subhead h-9 rounded-xl border border-border bg-white px-3 text-xs font-semibold outline-none focus:border-primary"
            >
              <option value="add">Add Stock (+N)</option>
              <option value="subtract">Subtract Stock (-N)</option>
              <option value="fixed">Set Exact Stock (=N)</option>
              <option value="percent">Adjust by Percent (±%)</option>
            </select>

            <input
              type="number"
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              placeholder="e.g. 20"
              className="font-subhead h-9 w-20 rounded-xl border border-border bg-white px-2.5 text-center text-xs font-bold outline-none focus:border-primary"
            />

            <button
              type="button"
              onClick={handleApplyBulkOperation}
              className="font-subhead inline-flex items-center gap-1.5 h-9 rounded-xl bg-[#0F3D2E] px-4 text-xs font-bold text-white shadow-2xs hover:bg-[#16503e] active:scale-[0.98] transition cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5" /> Apply Bulk Update
            </button>
          </div>
        </div>
      )}

      {/* Main Inventory Table */}
      <div className="rounded-3xl border border-border/80 bg-white overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="grid place-items-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[#0F3D2E]" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="font-display text-base font-semibold text-foreground">
              No inventory records found
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Publish crop produce in the Products section to automatically generate and track real-time inventory here.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="font-display text-base font-semibold text-foreground">
              No products match current filters
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="text-xs text-primary font-semibold hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border/70 bg-[#fbfbf9] font-subhead text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-5 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border text-[#0F3D2E] focus:ring-[#0F3D2E] cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-4">Product / Produce</th>
                  <th className="px-4 py-4">Variant / Unit</th>
                  <th className="px-4 py-4">Health Status</th>
                  <th className="px-4 py-4 text-center">Low Stock Alert Level</th>
                  <th className="px-5 py-4 text-center">Current Stock & Controls</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredProducts.map((p) => {
                  const currentDbStock = p.stock;
                  const currentDraft = draftStock[p.id] ?? currentDbStock;
                  const threshold = draftThreshold[p.id] ?? 10;
                  const isModified = currentDraft !== currentDbStock;
                  const isSelected = selectedIds.includes(p.id);
                  const pThumb =
                    p.images?.[0] ||
                    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=120&q=80";

                  // Status determination
                  const isSoldOut = currentDraft === 0;
                  const isLow = currentDraft <= threshold && currentDraft > 0;

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isSelected
                          ? "bg-[#0F3D2E]/5"
                          : isModified
                          ? "bg-amber-500/5 hover:bg-amber-500/10"
                          : "hover:bg-secondary/30"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(p.id)}
                          className="h-4 w-4 rounded border-border text-[#0F3D2E] focus:ring-[#0F3D2E] cursor-pointer"
                        />
                      </td>

                      {/* Product Thumbnail & Details */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="h-11 w-11 rounded-xl overflow-hidden bg-secondary/50 border border-border shrink-0">
                            <img src={pThumb} alt={p.name} className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <span className="font-display font-semibold text-foreground block text-sm">
                              {p.name}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                              <span className="capitalize">{p.category}</span>
                              {p.hsn_code && <span>· HSN {p.hsn_code}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Variant / Unit */}
                      <td className="px-4 py-4">
                        <span className="font-subhead text-xs font-bold text-foreground bg-secondary/70 px-2.5 py-1 rounded-lg border border-border/40">
                          {p.unit} pack
                        </span>
                      </td>

                      {/* Health Status Pill */}
                      <td className="px-4 py-4">
                        {isSoldOut ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200/80 shadow-2xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                            Sold Out
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-ping" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            In Stock
                          </span>
                        )}
                      </td>

                      {/* Low Stock Alert Threshold */}
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="text-[11px] text-muted-foreground">Alert at ≤</span>
                          <input
                            type="number"
                            min={1}
                            max={1000}
                            value={threshold}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value || "10", 10));
                              setDraftThreshold((prev) => ({ ...prev, [p.id]: val }));
                            }}
                            className="font-subhead h-8 w-14 rounded-xl border border-border bg-[#fbfbf9] px-2 text-center text-xs font-bold outline-none focus:border-primary"
                          />
                        </div>
                      </td>

                      {/* Stock Quantity Editor (+ / - controls & quick presets) */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-center gap-1.5">
                          {/* Stepper Input */}
                          <div className="flex items-center rounded-2xl border border-border bg-white shadow-2xs overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                const next = Math.max(0, currentDraft - 1);
                                setDraftStock((prev) => ({ ...prev, [p.id]: next }));
                              }}
                              className="h-9 w-9 grid place-items-center text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
                              title="Decrease by 1"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>

                            <input
                              type="number"
                              min={0}
                              value={currentDraft}
                              onChange={(e) => {
                                const next = Math.max(0, parseInt(e.target.value || "0", 10));
                                setDraftStock((prev) => ({ ...prev, [p.id]: next }));
                              }}
                              className="font-display h-9 w-20 text-center text-sm font-bold text-foreground bg-transparent outline-none"
                            />

                            <button
                              type="button"
                              onClick={() => {
                                const next = currentDraft + 1;
                                setDraftStock((prev) => ({ ...prev, [p.id]: next }));
                              }}
                              className="h-9 w-9 grid place-items-center text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
                              title="Increase by 1"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Quick Increment Preset Chips */}
                          <div className="flex items-center gap-1">
                            {[5, 10, 50].map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => handleQuickPreset(p.id, amt)}
                                className="font-subhead text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-border/80 bg-[#fbfbf9] text-muted-foreground hover:text-foreground hover:border-[#0F3D2E] transition cursor-pointer"
                                title={`Instantly add ${amt} to database`}
                              >
                                +{amt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {isModified && (
                            <button
                              type="button"
                              onClick={() => updateSingleStock(p.id, currentDraft)}
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-xl bg-[#0F3D2E] text-white text-xs font-bold shadow-2xs hover:bg-[#16503e] active:scale-[0.98] transition cursor-pointer"
                              title="Save this row"
                            >
                              <Check className="h-3.5 w-3.5" /> Save
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setAuditItemFilter(p.id);
                              setShowAuditModal(true);
                            }}
                            className="h-8 w-8 rounded-xl border border-border/80 bg-white grid place-items-center text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer shadow-2xs"
                            title="View Stock History for this product"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Trail Modal / Drawer */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rounded-3xl border border-border bg-white w-full max-w-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/80 bg-[#fbfbf9]">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-[#0F3D2E]/10 grid place-items-center">
                  <History className="h-5 w-5 text-[#0F3D2E]" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Inventory Audit Trail
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Chronological record of manual edits, bulk adjustments, and order deductions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="font-subhead inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-white text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>

                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="h-8 w-8 rounded-full border border-border bg-white grid place-items-center text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filter Sub-bar */}
            <div className="p-4 border-b border-border/60 flex flex-wrap items-center justify-between gap-3 bg-white text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">Filter Reason:</span>
                <select
                  value={auditReasonFilter}
                  onChange={(e) => setAuditReasonFilter(e.target.value)}
                  className="font-subhead rounded-lg border border-border px-2.5 py-1 text-xs outline-none focus:border-primary"
                >
                  <option value="all">All Reasons</option>
                  <option value="manual_edit">Manual Edit</option>
                  <option value="order_deduction">Order Deduction</option>
                  <option value="bulk_update">Bulk Update</option>
                </select>
              </div>

              {auditItemFilter && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Filtered for single SKU</span>
                  <button
                    onClick={() => setAuditItemFilter(null)}
                    className="font-semibold text-primary hover:underline"
                  >
                    Show all SKUs
                  </button>
                </div>
              )}
            </div>

            {/* Logs List */}
            <div className="max-h-[420px] overflow-y-auto p-6 divide-y divide-border/60">
              {filteredAuditLogs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm space-y-1">
                  <p className="font-semibold text-foreground">No audit entries yet</p>
                  <p className="text-xs">
                    Every stock update and order purchase will generate a permanent log here.
                  </p>
                </div>
              ) : (
                filteredAuditLogs.map((log) => {
                  const isPositive = log.change_amount > 0;
                  const isOrder = log.reason === "order_deduction";
                  const isBulk = log.reason === "bulk_update";

                  return (
                    <div key={log.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-semibold text-sm text-foreground truncate">
                            {log.product_name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isOrder
                                ? "bg-blue-50 text-blue-800 border border-blue-200"
                                : isBulk
                                ? "bg-purple-50 text-purple-800 border border-purple-200"
                                : "bg-secondary text-muted-foreground border border-border"
                            }`}
                          >
                            {log.reason.replace("_", " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                          {log.reference_id && (
                            <span>· Ref: #{log.reference_id.substring(0, 12)}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-mono text-xs text-muted-foreground">{log.old_stock}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-display font-bold text-sm text-foreground">{log.new_stock}</span>
                          <span
                            className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded-md ${
                              isPositive
                                ? "text-emerald-700 bg-emerald-50"
                                : "text-rose-700 bg-rose-50"
                            }`}
                          >
                            {isPositive ? `+${log.change_amount}` : log.change_amount}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border/80 bg-[#fbfbf9] flex justify-end">
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="font-subhead px-5 py-2 rounded-full border border-border bg-white text-xs font-bold hover:bg-secondary transition cursor-pointer"
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

export default InventoryPage;
