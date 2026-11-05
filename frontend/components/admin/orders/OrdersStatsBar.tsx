"use client";

import React from "react";
import { TrendingUp, TrendingDown, Clock, ShoppingBag, IndianRupee, AlertCircle, Calendar } from "lucide-react";
import { inr } from "@/lib/format";

export interface StatsData {
  sales: number;
  salesChangePct: number | null;
  ordersCount: number;
  ordersCountChangePct: number | null;
  avgOrderValue: number;
  aovChangePct: number | null;
  totalOrders: number;
  pendingReview: number;
  dateRange: string;
}

interface OrdersStatsBarProps {
  stats: StatsData | null;
  selectedDateRange: string;
  onDateRangeChange: (range: string) => void;
  fromDate?: string;
  toDate?: string;
  onCustomDateChange?: (from: string, to: string) => void;
  isLoading?: boolean;
}

const DATE_RANGES = [
  { id: "today", label: "Today" },
  { id: "last_7_days", label: "Last 7 days" },
  { id: "last_30_days", label: "Last 30 days" },
  { id: "last_90_days", label: "Last 90 days" },
  { id: "this_year", label: "This year" },
  { id: "custom", label: "Custom" },
];

export function OrdersStatsBar({
  stats,
  selectedDateRange,
  onDateRangeChange,
  fromDate,
  toDate,
  onCustomDateChange,
  isLoading,
}: OrdersStatsBarProps) {
  const [showCustomPicker, setShowCustomPicker] = React.useState(selectedDateRange === "custom");
  const [customFrom, setCustomFrom] = React.useState(fromDate || "");
  const [customTo, setCustomTo] = React.useState(toDate || "");

  const handleRangeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "custom") {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
      onDateRangeChange(val);
    }
  };

  const handleApplyCustom = () => {
    if (customFrom && onCustomDateChange) {
      onDateRangeChange("custom");
      onCustomDateChange(customFrom, customTo || new Date().toISOString().split("T")[0]);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-subhead text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            Performance & Review Stats
          </span>
        </div>

        {/* Date range picker */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedDateRange}
            onChange={handleRangeSelect}
            className="font-subhead h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition cursor-pointer"
          >
            {DATE_RANGES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>

          {showCustomPicker && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
              />
              <button
                type="button"
                onClick={handleApplyCustom}
                className="h-8 px-2.5 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:opacity-90 transition cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Sales */}
        <div className="bg-secondary/25 rounded-xl border border-border/80 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-subhead uppercase tracking-wider font-semibold">Sales</span>
            <IndianRupee className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="font-display text-xl font-bold text-foreground">
              {isLoading ? "—" : inr(stats?.sales || 0)}
            </div>
            {stats?.salesChangePct !== null && stats?.salesChangePct !== undefined ? (
              <div
                className={`flex items-center gap-1 text-[11px] mt-1 font-semibold ${
                  stats.salesChangePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                }`}
              >
                {stats.salesChangePct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>
                  {stats.salesChangePct >= 0 ? `+${stats.salesChangePct}%` : `${stats.salesChangePct}%`}
                </span>
                <span className="text-muted-foreground font-normal text-[10px]">vs prev</span>
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground mt-1">Non-cancelled orders</div>
            )}
          </div>
        </div>

        {/* Orders Count */}
        <div className="bg-secondary/25 rounded-xl border border-border/80 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-subhead uppercase tracking-wider font-semibold">Orders</span>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2">
            <div className="font-display text-xl font-bold text-foreground">
              {isLoading ? "—" : stats?.ordersCount || 0}
            </div>
            {stats?.ordersCountChangePct !== null && stats?.ordersCountChangePct !== undefined ? (
              <div
                className={`flex items-center gap-1 text-[11px] mt-1 font-semibold ${
                  stats.ordersCountChangePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                }`}
              >
                {stats.ordersCountChangePct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>
                  {stats.ordersCountChangePct >= 0
                    ? `+${stats.ordersCountChangePct}%`
                    : `${stats.ordersCountChangePct}%`}
                </span>
                <span className="text-muted-foreground font-normal text-[10px]">vs prev</span>
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground mt-1">In selected range</div>
            )}
          </div>
        </div>

        {/* Avg Order Value (AOV) */}
        <div className="bg-secondary/25 rounded-xl border border-border/80 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-subhead uppercase tracking-wider font-semibold">Avg. Order Value</span>
            <span className="text-xs font-bold text-muted-foreground">AOV</span>
          </div>
          <div className="mt-2">
            <div className="font-display text-xl font-bold text-foreground">
              {isLoading ? "—" : inr(stats?.avgOrderValue || 0)}
            </div>
            {stats?.aovChangePct !== null && stats?.aovChangePct !== undefined ? (
              <div
                className={`flex items-center gap-1 text-[11px] mt-1 font-semibold ${
                  stats.aovChangePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                }`}
              >
                {stats.aovChangePct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{stats.aovChangePct >= 0 ? `+${stats.aovChangePct}%` : `${stats.aovChangePct}%`}</span>
                <span className="text-muted-foreground font-normal text-[10px]">vs prev</span>
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground mt-1">Per active order</div>
            )}
          </div>
        </div>

        {/* Total Orders (All Time) */}
        <div className="bg-secondary/25 rounded-xl border border-border/80 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-subhead uppercase tracking-wider font-semibold">Total Orders</span>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2">
            <div className="font-display text-xl font-bold text-foreground">
              {isLoading ? "—" : stats?.totalOrders || 0}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Store lifetime</div>
          </div>
        </div>

        {/* Pending Review */}
        <div className="col-span-2 md:col-span-1 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-800 dark:text-amber-400">
            <span className="text-[11px] font-subhead uppercase tracking-wider font-bold">Pending Review</span>
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="font-display text-xl font-bold text-amber-900 dark:text-amber-300">
              {isLoading ? "—" : stats?.pendingReview || 0}
            </div>
            <div className="text-[10px] text-amber-800/80 dark:text-amber-400/80 mt-1 font-medium">
              Awaiting verification
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
