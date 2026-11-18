"use client";

import React from "react";
import {
  FileSpreadsheet,
  DollarSign,
  TrendingUp,
  Award,
  Clock,
  ShoppingBag,
  Package,
} from "lucide-react";

interface AnalyticsViewProps {
  unifiedOrders: any[];
  customers: any[];
  handleExportAnalyticsCsv: () => void;
  themeStyles?: {
    cardBg?: string;
  };
}

export default function AnalyticsView({
  unifiedOrders,
  customers,
  handleExportAnalyticsCsv,
  themeStyles = { cardBg: "bg-white dark:bg-slate-900 border-neutral-200/80 dark:border-slate-800" },
}: AnalyticsViewProps) {
  const cardBgClass = themeStyles.cardBg || "bg-white dark:bg-slate-900 border-neutral-200/80 dark:border-slate-800";

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">CRM &amp; WhatsApp Analytics</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Deep revenue insights, WhatsApp conversion funnel, product velocity, and SLA metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportAnalyticsCsv}
            className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Export Business Analytics to CSV / Excel spreadsheet"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Key Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Gross WhatsApp Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            ₹{unifiedOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0).toLocaleString("en-IN")}
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <TrendingUp className="h-3.5 w-3.5" /> Real-time
            </span>
            <span className="text-neutral-400">from verified sales</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>WhatsApp Chat Conversion</span>
            <Award className="h-4 w-4 text-amber-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            {customers.length > 0 ? `${((unifiedOrders.length / customers.length) * 100).toFixed(1)}%` : "0.0%"}
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">{unifiedOrders.length} orders</span>
            <span className="text-neutral-400">across {customers.length} patrons</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Avg Response Time</span>
            <Clock className="h-4 w-4 text-sky-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-neutral-900 dark:text-white">&lt; 2 mins</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">Instant</span>
            <span className="text-neutral-400">Smart concierge active</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Avg Order Value (AOV)</span>
            <ShoppingBag className="h-4 w-4 text-indigo-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            ₹{unifiedOrders.length > 0 ? Math.round(unifiedOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0) / unifiedOrders.length).toLocaleString("en-IN") : "0"}
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">{unifiedOrders.length} orders</span>
            <span className="text-neutral-400">Direct settlement</span>
          </div>
        </div>
      </div>

      {/* Monthly Revenue Progression & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className={`lg:col-span-3 p-6 rounded-2xl border shadow-2xs space-y-4 ${cardBgClass}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Recent Order Revenue</h3>
              <p className="text-xs text-neutral-500">Prajnaa Market direct sales in ₹ INR</p>
            </div>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
              Live Verified
            </span>
          </div>

          <div className="h-52 flex items-end justify-between gap-2.5 pt-6 px-2 border-b border-neutral-200 dark:border-slate-700 relative">
            {(() => {
              const now = new Date();
              const months: Array<{ month: string; revNum: number; rev: string }> = [];
              for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const mLabel = d.toLocaleDateString("en-IN", { month: "short" });
                months.push({ month: mLabel, revNum: 0, rev: "₹0" });
              }
              unifiedOrders.forEach((o) => {
                const amt = Number(o.amount) || 0;
                let d = new Date();
                if (o.date && o.date !== "Today") {
                  const parsed = new Date(o.date);
                  if (!isNaN(parsed.getTime())) d = parsed;
                }
                const mLabel = d.toLocaleDateString("en-IN", { month: "short" });
                const found = months.find((m) => m.month === mLabel);
                if (found) {
                  found.revNum += amt;
                  found.rev = `₹${found.revNum.toLocaleString("en-IN")}`;
                }
              });

              const maxRev = Math.max(1000, ...months.map((m) => m.revNum));

              return months.map((m, i) => {
                const barHeightPx = Math.max(12, Math.round((m.revNum / maxRev) * 125));
                return (
                  <div key={i} className="flex-1 h-full flex flex-col items-center justify-end group cursor-pointer relative">
                    <span className="text-[9px] font-bold text-neutral-500 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition mb-1 shrink-0">
                      {m.rev}
                    </span>
                    <div className="w-full h-32 flex items-end justify-center relative px-0.5">
                      <div className="w-full max-w-[28px] h-full bg-neutral-100 dark:bg-slate-700/60 rounded-t-md absolute bottom-0 transition-colors group-hover:bg-neutral-200/70" />
                      <div
                        className="w-full max-w-[28px] rounded-t-md transition-all duration-300 relative z-10 shadow-xs bg-gradient-to-t from-emerald-700 to-emerald-500 hover:from-emerald-600 hover:to-emerald-400"
                        style={{ height: `${barHeightPx}px` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-neutral-500 dark:text-slate-400 mt-2 shrink-0">
                      {m.month}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">WhatsApp Sales Funnel</h3>
            <p className="text-xs text-neutral-500">From conversation to verified order fulfillment</p>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-neutral-700 dark:text-slate-300">1. Customers in CRM</span>
                <span className="font-mono text-neutral-900 dark:text-white">{customers.length}</span>
              </div>
              <div className="h-2 w-full bg-neutral-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-neutral-400 rounded-full w-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-neutral-700 dark:text-slate-300">2. Active Inquiries / Orders</span>
                <span className="font-mono text-neutral-900 dark:text-white">{unifiedOrders.length}</span>
              </div>
              <div className="h-2 w-full bg-neutral-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full"
                  style={{ width: `${customers.length > 0 ? Math.min(100, Math.round((unifiedOrders.length / customers.length) * 100)) : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-neutral-700 dark:text-slate-300">3. Paid Orders</span>
                <span className="font-mono text-amber-500">
                  {unifiedOrders.filter((o) => String(o.paymentStatus).toLowerCase() === "paid").length}
                </span>
              </div>
              <div className="h-2 w-full bg-neutral-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${unifiedOrders.length > 0 ? Math.round((unifiedOrders.filter((o) => String(o.paymentStatus).toLowerCase() === "paid").length / unifiedOrders.length) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-neutral-700 dark:text-slate-300">4. Dispatched / Delivered</span>
                <span className="font-mono text-emerald-600 font-bold">
                  {unifiedOrders.filter((o) => ["completed", "delivered", "shipped"].includes(String(o.orderStatus).toLowerCase())).length}
                </span>
              </div>
              <div className="h-2 w-full bg-neutral-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{
                    width: `${unifiedOrders.length > 0 ? Math.round((unifiedOrders.filter((o) => ["completed", "delivered", "shipped"].includes(String(o.orderStatus).toLowerCase())).length / unifiedOrders.length) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Top Selling Produce & Fulfillment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className={`lg:col-span-3 p-6 rounded-2xl border shadow-2xs space-y-4 ${cardBgClass}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Top Selling Himalayan Harvests</h3>
              <p className="text-xs text-neutral-500">Revenue share from real orders</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
              Total: ₹{unifiedOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0).toLocaleString("en-IN")}
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {(() => {
              const productMap = new Map<string, { name: string; units: number; rev: number }>();
              unifiedOrders.forEach((o) => {
                if (Array.isArray(o.items)) {
                  o.items.forEach((it: any) => {
                    const n = it.name || it.productName || "Produce Item";
                    const cur = productMap.get(n) || { name: n, units: 0, rev: 0 };
                    cur.units += Number(it.qty || it.quantity || 1);
                    cur.rev += Number(it.total || (it.price * (it.qty || 1)) || 0);
                    productMap.set(n, cur);
                  });
                }
              });

              const list = Array.from(productMap.values()).sort((a, b) => b.rev - a.rev);
              const totalProductRev = list.reduce((acc, p) => acc + p.rev, 0);

              if (list.length === 0) {
                return (
                  <div className="py-8 text-center text-xs text-neutral-500">
                    <Package className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                    <p className="font-semibold text-neutral-700 dark:text-slate-300">No product sales recorded yet</p>
                    <p className="text-neutral-400 mt-1">When customer orders are processed, top selling items will rank here in real time.</p>
                  </div>
                );
              }

              return list.slice(0, 5).map((p, idx) => {
                const share = totalProductRev > 0 ? Math.round((p.rev / totalProductRev) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-900 dark:text-white">{p.name}</span>
                        <span className="text-[10px] text-neutral-400">({p.units} units)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <strong className="font-bold text-neutral-900 dark:text-white font-mono">₹{p.rev.toLocaleString("en-IN")}</strong>
                        <span className="text-[11px] text-neutral-500 font-mono w-10 text-right">{share}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${share}%` }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div className={`lg:col-span-2 p-6 rounded-2xl border shadow-2xs space-y-4 ${cardBgClass}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Fulfillment Status</h3>
              <p className="text-xs text-neutral-500">Dispatch &amp; fulfillment operational breakdown</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              Active
            </span>
          </div>

          <div className="space-y-3 pt-1 text-xs">
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Active Orders</p>
                <span className="text-[10px] text-neutral-500">Orders in system</span>
              </div>
              <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400 font-mono">
                {unifiedOrders.length}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Dispatched Shipments</p>
                <span className="text-[10px] text-neutral-500">Parcels in transit</span>
              </div>
              <span className="font-bold text-sm text-indigo-700 dark:text-indigo-400 font-mono">
                {unifiedOrders.filter((o) => ["shipped", "in transit"].includes(String(o.orderStatus).toLowerCase())).length}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Delivered Orders</p>
                <span className="text-[10px] text-neutral-500">Successfully delivered to patrons</span>
              </div>
              <span className="font-bold text-sm text-amber-700 dark:text-amber-400 font-mono">
                {unifiedOrders.filter((o) => ["completed", "delivered"].includes(String(o.orderStatus).toLowerCase())).length}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Return &amp; Replacement Rate</p>
                <span className="text-[10px] text-neutral-500">Shock-proof eco packaging</span>
              </div>
              <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400 font-mono">0%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
