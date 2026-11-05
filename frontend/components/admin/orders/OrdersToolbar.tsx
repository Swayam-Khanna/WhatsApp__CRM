"use client";

import React, { useState } from "react";
import {
  Search,
  Filter,
  SlidersHorizontal,
  Plus,
  Bookmark,
  X,
  RotateCcw,
  Check,
  ChevronDown,
  Save,
  Trash2,
} from "lucide-react";
import { WixFulfillmentLabel, WixPaymentLabel } from "@/lib/orders/order-constants";

export interface ColumnSetting {
  id: string;
  label: string;
  visible: boolean;
}

export interface FilterState {
  paymentMethod?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  minAmount?: string;
  maxAmount?: string;
  city?: string;
  state?: string;
}

interface OrdersToolbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  tabCounts: Record<string, number>;
  search: string;
  onSearchChange: (search: string) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  columns: ColumnSetting[];
  onToggleColumn: (colId: string) => void;
  savedViews: Array<{ id: string; name: string; filters: any; columns: any }>;
  onSelectSavedView: (view: any) => void;
  onSaveCurrentView: (name: string) => void;
  onDeleteSavedView: (id: string) => void;
  onOpenAddOrder: () => void;
}

const TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "packed", label: "Packed" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

export function OrdersToolbar({
  currentTab,
  onTabChange,
  tabCounts,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  onResetFilters,
  columns,
  onToggleColumn,
  savedViews,
  onSelectSavedView,
  onSaveCurrentView,
  onDeleteSavedView,
  onOpenAddOrder,
}: OrdersToolbarProps) {
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showColumnsPanel, setShowColumnsPanel] = useState(false);
  const [showManageViewModal, setShowManageViewModal] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  const activeFiltersCount = Object.values(filters).filter((v) => Boolean(v && v.trim())).length;

  const handleSaveViewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViewName.trim()) return;
    onSaveCurrentView(newViewName.trim());
    setNewViewName("");
    setShowManageViewModal(false);
  };

  return (
    <div className="space-y-3">
      {/* Top Header Row with Title and Add New Order CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Orders
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage customer orders, verify WhatsApp & COD payments, update fulfillment, and track deliveries.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddOrder}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95 active:scale-[0.98] transition cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add New Order
        </button>
      </div>

      {/* Tabs / Saved Views bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {TABS.map((t) => {
            const count = tabCounts[t.id] ?? 0;
            const isActive = currentTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-subhead font-medium transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Saved Views Dropdown & Manage */}
        <div className="flex items-center gap-2">
          {savedViews.length > 0 && (
            <div className="relative">
              <select
                onChange={(e) => {
                  const view = savedViews.find((v) => v.id === e.target.value);
                  if (view) onSelectSavedView(view);
                }}
                defaultValue=""
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-muted-foreground font-medium outline-none focus:border-primary cursor-pointer"
              >
                <option value="" disabled>
                  Custom Views ({savedViews.length})
                </option>
                {savedViews.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowManageViewModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary/40 text-xs font-subhead text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Manage View</span>
          </button>
        </div>
      </div>

      {/* Main Filter & Search Control Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-2.5 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by order ID, customer name, email, or phone..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filter Toggle & Column Settings buttons */}
        <div className="flex items-center gap-2">
          {/* Filter Popover Toggle */}
          <button
            type="button"
            onClick={() => {
              setShowFiltersPanel(!showFiltersPanel);
              setShowColumnsPanel(false);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-subhead font-medium transition cursor-pointer ${
              showFiltersPanel || activeFiltersCount > 0
                ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                : "border-border bg-background hover:bg-secondary/40 text-muted-foreground"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filter</span>
            {activeFiltersCount > 0 && (
              <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Columns Toggle */}
          <button
            type="button"
            onClick={() => {
              setShowColumnsPanel(!showColumnsPanel);
              setShowFiltersPanel(false);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-subhead font-medium transition cursor-pointer ${
              showColumnsPanel
                ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                : "border-border bg-background hover:bg-secondary/40 text-muted-foreground"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Columns</span>
          </button>
        </div>
      </div>

      {/* Collapsible Filter Panel */}
      {showFiltersPanel && (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h4 className="font-display font-semibold text-xs text-foreground flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-primary" /> Filter Orders
            </h4>
            <button
              type="button"
              onClick={onResetFilters}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition"
            >
              <RotateCcw className="h-3 w-3" /> Reset all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Payment Method (COD or WhatsApp ONLY) */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
                Payment Method
              </label>
              <select
                value={filters.paymentMethod || ""}
                onChange={(e) => onFiltersChange({ ...filters, paymentMethod: e.target.value })}
                className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-primary"
              >
                <option value="">All Methods</option>
                <option value="cod">Cash on Delivery (COD)</option>
                <option value="whatsapp">WhatsApp (Manual)</option>
              </select>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
                Payment Status
              </label>
              <select
                value={filters.paymentStatus || ""}
                onChange={(e) => onFiltersChange({ ...filters, paymentStatus: e.target.value })}
                className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-primary"
              >
                <option value="">All Payment Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="unpaid">Unpaid</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {/* Fulfillment Status */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
                Fulfillment Status
              </label>
              <select
                value={filters.fulfillmentStatus || ""}
                onChange={(e) => onFiltersChange({ ...filters, fulfillmentStatus: e.target.value })}
                className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-primary"
              >
                <option value="">All Fulfillment</option>
                <option value="unfulfilled">Unfulfilled</option>
                <option value="confirmed">Confirmed</option>
                <option value="packed">Packed</option>
                <option value="partially_shipped">Partially shipped</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Amount Range */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
                Amount Range (₹)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minAmount || ""}
                  onChange={(e) => onFiltersChange({ ...filters, minAmount: e.target.value })}
                  className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-primary"
                />
                <span className="text-muted-foreground">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxAmount || ""}
                  onChange={(e) => onFiltersChange({ ...filters, maxAmount: e.target.value })}
                  className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Delivery State / City */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
                Delivery City / State
              </label>
              <input
                type="text"
                placeholder="e.g. Bengaluru, Mumbai, Haryana"
                value={filters.city || ""}
                onChange={(e) => onFiltersChange({ ...filters, city: e.target.value })}
                className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Column Settings Panel */}
      {showColumnsPanel && (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="font-display font-semibold text-xs text-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Column Settings
            </h4>
            <span className="text-[11px] text-muted-foreground">Select columns to display</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {columns.map((col) => (
              <label
                key={col.id}
                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-secondary/40 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => onToggleColumn(col.id)}
                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span className={col.visible ? "text-foreground font-medium" : "text-muted-foreground"}>
                  {col.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Save View Modal */}
      {showManageViewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-primary" /> Save Current View
              </h3>
              <button
                type="button"
                onClick={() => setShowManageViewModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveViewSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  View Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unpaid COD Orders, WhatsApp Verification"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                />
              </div>

              {savedViews.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-[11px] font-subhead uppercase tracking-wider text-muted-foreground font-bold mb-2">
                    Existing Saved Views
                  </p>
                  <ul className="space-y-1.5 max-h-36 overflow-y-auto">
                    {savedViews.map((sv) => (
                      <li
                        key={sv.id}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/30"
                      >
                        <span className="font-medium text-foreground">{sv.name}</span>
                        <button
                          type="button"
                          onClick={() => onDeleteSavedView(sv.id)}
                          className="text-destructive hover:opacity-80 p-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManageViewModal(false)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-border text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90"
                >
                  Save View
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
