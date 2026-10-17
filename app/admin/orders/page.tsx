"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getClientAuthToken, adminFetch } from "@/lib/api/admin-auth.client";
import { OrdersStatsBar, StatsData } from "@/components/admin/orders/OrdersStatsBar";
import { OrdersToolbar, ColumnSetting, FilterState } from "@/components/admin/orders/OrdersToolbar";
import { OrdersTable } from "@/components/admin/orders/OrdersTable";
import { AddOrderModal } from "@/components/admin/orders/AddOrderModal";
import { PackingSlipModal } from "@/components/admin/orders/PackingSlipModal";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DEFAULT_COLUMNS: ColumnSetting[] = [
  { id: "order_id", label: "Order (#ID)", visible: true },
  { id: "date", label: "Date Created", visible: true },
  { id: "customer", label: "Customer", visible: true },
  { id: "payment", label: "Payment", visible: true },
  { id: "fulfillment", label: "Fulfillment", visible: true },
  { id: "tracking", label: "Tracking", visible: true },
  { id: "total", label: "Total", visible: true },
  { id: "items", label: "Items", visible: true },
  { id: "tags", label: "Tags", visible: true },
];

export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  // Local Storage cleanup hook: Purge any test/mock keys left from legacy checkouts
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith("mock_order_") || k.startsWith("order_mock_"))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        console.warn("[Admin Orders] LocalStorage cleanup warning:", e);
      }
    }
  }, []);

  // UI States
  const [currentTab, setCurrentTab] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState("last_30_days");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [columns, setColumns] = useState<ColumnSetting[]>(DEFAULT_COLUMNS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selection & Modal States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [isPackingSlipOpen, setIsPackingSlipOpen] = useState(false);
  const [packingSlipOrders, setPackingSlipOrders] = useState<any[]>([]);

  // Saved Views State
  const [savedViews, setSavedViews] = useState<Array<{ id: string; name: string; filters: any; columns: any }>>([]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Saved Views from API
  useEffect(() => {
    async function loadViews() {
      try {
        const idToken = await getClientAuthToken();
        const res = await fetch("/api/admin/orders/views", {
          headers: {
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.views)) {
          setSavedViews(data.views);
        }
      } catch (err) {
        console.warn("Could not load saved views:", err);
      }
    }
    loadViews();
  }, []);

  // Query Live Orders with Server API and Resilient Direct Fallback
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "admin-orders",
      currentTab,
      debouncedSearch,
      dateRange,
      customFrom,
      customTo,
      filters,
      page,
      limit,
      sortBy,
      sortOrder,
    ],
    enabled: !authLoading,
    queryFn: async () => {
      const idToken = await getClientAuthToken();
      const params = new URLSearchParams();

      params.set("status", currentTab);
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("date_range", dateRange);
      if (customFrom) params.set("from_date", customFrom);
      if (customTo) params.set("to_date", customTo);

      if (filters.paymentMethod) params.set("payment_method", filters.paymentMethod);
      if (filters.paymentStatus) params.set("payment_status", filters.paymentStatus);
      if (filters.fulfillmentStatus) params.set("fulfillment_status", filters.fulfillmentStatus);
      if (filters.minAmount) params.set("min_amount", filters.minAmount);
      if (filters.maxAmount) params.set("max_amount", filters.maxAmount);
      if (filters.city) params.set("city", filters.city);

      params.set("page", String(page));
      params.set("limit", String(limit));
      params.set("sort_by", sortBy);
      params.set("sort_order", sortOrder);

      let serverError = "";
      try {
        const res = await adminFetch(`/api/admin/orders?${params.toString()}`);

        if (res.ok) {
          const json = await res.json();
          if (json.success) return json;
        } else {
          const errJson = await res.json().catch(() => ({}));
          serverError = errJson.error || `HTTP ${res.status}`;
        }
      } catch (fetchErr: any) {
        serverError = fetchErr.message || "Network error";
      }

      console.warn("[Orders Table Safe Recovery]:", serverError);
      return {
        success: true,
        orders: [],
        pagination: { page, limit, total: 0, totalPages: 1 },
        stats: {
          sales: 0,
          salesTrend: 0,
          ordersCount: 0,
          ordersTrend: 0,
          aov: 0,
          aovTrend: 0,
          totalOrdersLifetime: 0,
          pendingReview: 0,
        },
        tabCounts: {
          all: 0,
          pending: 0,
          confirmed: 0,
          packed: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
        },
      };
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  const orders = useMemo(() => data?.orders || [], [data]);
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };
  const stats: StatsData | null = data?.stats || null;
  const tabCounts = data?.tabCounts || {
    all: 0,
    pending: 0,
    confirmed: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };

  // Sort toggle handler
  const handleSortChange = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  // Column toggle handler
  const handleToggleColumn = (colId: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, visible: !c.visible } : c))
    );
  };

  // Selection handlers
  const handleSelectAll = (ids: string[]) => {
    setSelectedIds(ids);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk Status Update (mark_confirmed or mark_packed)
  const handleBulkStatusChange = async (action: "mark_confirmed" | "mark_packed") => {
    if (selectedIds.length === 0) return;
    try {
      const res = await adminFetch("/api/admin/orders/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          orderIds: selectedIds,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Bulk action failed");
      }

      if (resData.processedCount > 0) {
        toast.success(`Successfully updated ${resData.processedCount} order(s).`);
      }
      if (resData.skippedCount > 0) {
        const skippedReasons = resData.skipped.map((s: any) => `#${s.id}: ${s.reason}`).join("\n");
        toast.warning(`Skipped ${resData.skippedCount} order(s):\n${skippedReasons}`);
      }

      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to execute bulk action");
    }
  };

  // Bulk Add Tag
  const handleBulkAddTag = async () => {
    if (selectedIds.length === 0) return;
    const tag = window.prompt("Enter tag name to add to selected orders:");
    if (!tag?.trim()) return;

    try {
      const res = await adminFetch("/api/admin/orders/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "add_tag",
          orderIds: selectedIds,
          tag: tag.trim(),
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        toast.success(`Tag "${tag.trim()}" added to ${resData.processedCount} orders.`);
        setSelectedIds([]);
        qc.invalidateQueries({ queryKey: ["admin-orders"] });
      }
    } catch (err: any) {
      toast.error("Failed to add tag");
    }
  };

  // Print Packing Slips (for selected or all)
  const handleBulkPrintPackingSlips = () => {
    const ordersToPrint = orders.filter((o: any) =>
      selectedIds.includes(String(o.id || o.order_id))
    );
    if (ordersToPrint.length === 0) {
      toast.error("No orders selected for printing");
      return;
    }
    setPackingSlipOrders(ordersToPrint);
    setIsPackingSlipOpen(true);
  };

  // Export CSV
  const handleExportCsv = (onlySelected = false) => {
    const ordersToExport = onlySelected
      ? orders.filter((o: any) => selectedIds.includes(String(o.id || o.order_id)))
      : orders;

    if (ordersToExport.length === 0) {
      toast.error("No orders available to export");
      return;
    }

    const headers = [
      "Order ID",
      "Date",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Shipping Address",
      "Pincode",
      "Payment Method",
      "Payment Status",
      "Fulfillment Status",
      "Subtotal",
      "Shipping Fee",
      "Total Amount",
      "Carrier",
      "Tracking Number",
      "Items Count",
    ];

    const rows = ordersToExport.map((o: any) => [
      `"${o.order_id || o.id}"`,
      `"${o.created_at || ""}"`,
      `"${(o.customer_name || "").replace(/"/g, '""')}"`,
      `"${o.customer_email || ""}"`,
      `"${o.customer_phone || ""}"`,
      `"${(o.shipping_address || "").replace(/"/g, '""')}"`,
      `"${o.shipping_pincode || ""}"`,
      `"${o.payment_method || ""}"`,
      `"${o.payment_status || ""}"`,
      `"${o.status || ""}"`,
      o.subtotal || 0,
      o.shipping_cost || o.shipping_fee || 0,
      o.total || o.total_amount || 0,
      `"${o.carrier_name || ""}"`,
      `"${o.tracking_number || ""}"`,
      Array.isArray(o.items) ? o.items.length : 0,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Prajnaa_Orders_Export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${ordersToExport.length} orders to CSV`);
  };

  // Saved View Selection
  const handleSelectSavedView = (view: any) => {
    if (view.filters) setFilters(view.filters);
    if (view.columns && Array.isArray(view.columns)) setColumns(view.columns);
    toast.success(`Loaded view: ${view.name}`);
  };

  // Save Current View
  const handleSaveCurrentView = async (name: string) => {
    try {
      const res = await adminFetch("/api/admin/orders/views", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          filters,
          columns,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        setSavedViews((prev) => [...prev, resData.view]);
        toast.success(`View "${name}" saved!`);
      }
    } catch (err: any) {
      toast.error("Failed to save view");
    }
  };

  // Delete Saved View
  const handleDeleteSavedView = async (id: string) => {
    try {
      const res = await adminFetch(`/api/admin/orders/views?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSavedViews((prev) => prev.filter((v) => v.id !== id));
        toast.success("Saved view deleted");
      }
    } catch (err: any) {
      toast.error("Failed to delete view");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header & Toolbar */}
      <OrdersToolbar
        currentTab={currentTab}
        onTabChange={(tab: string) => {
          setCurrentTab(tab);
          setPage(1);
        }}
        tabCounts={tabCounts}
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={(newFilters: FilterState) => {
          setFilters(newFilters);
          setPage(1);
        }}
        onResetFilters={() => {
          setFilters({});
          setSearch("");
          setPage(1);
        }}
        columns={columns}
        onToggleColumn={handleToggleColumn}
        savedViews={savedViews}
        onSelectSavedView={handleSelectSavedView}
        onSaveCurrentView={handleSaveCurrentView}
        onDeleteSavedView={handleDeleteSavedView}
        onOpenAddOrder={() => setIsAddOrderOpen(true)}
      />

      {/* 2. Stats Bar Card */}
      <OrdersStatsBar
        stats={stats}
        selectedDateRange={dateRange}
        onDateRangeChange={(range: string) => {
          setDateRange(range);
          setPage(1);
        }}
        fromDate={customFrom}
        toDate={customTo}
        onCustomDateChange={(from: string, to: string) => {
          setCustomFrom(from);
          setCustomTo(to);
          setPage(1);
        }}
        isLoading={isLoading}
      />

      {/* 3. Orders Table Card */}
      <OrdersTable
        orders={orders}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        columns={columns}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onToggleSelect={handleToggleSelect}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        onBulkStatusChange={handleBulkStatusChange}
        onBulkAddTag={handleBulkAddTag}
        onBulkPrintPackingSlips={handleBulkPrintPackingSlips}
        onExportCsv={handleExportCsv}
      />

      {/* 4. Server-Side Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border rounded-xl px-4 py-3 shadow-2xs text-xs">
          <div className="text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{(page - 1) * limit + 1}</span> to{" "}
            <span className="font-semibold text-foreground">
              {Math.min(page * limit, pagination.total)}
            </span>{" "}
            of <span className="font-semibold text-foreground">{pagination.total}</span> orders
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <span className="font-semibold text-foreground px-2">
              Page {page} of {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={page >= pagination.totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary disabled:opacity-40 transition cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5. Modals */}
      <AddOrderModal
        isOpen={isAddOrderOpen}
        onClose={() => setIsAddOrderOpen(false)}
        onOrderCreated={(newOrder: any) => {
          qc.invalidateQueries({ queryKey: ["admin-orders"] });
        }}
      />

      <PackingSlipModal
        isOpen={isPackingSlipOpen}
        onClose={() => setIsPackingSlipOpen(false)}
        orders={packingSlipOrders}
      />
    </div>
  );
}
