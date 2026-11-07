"use client";

import { createFileRoute } from "@/lib/tanstack-compat";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  TrendingUp,
  Users,
  ShoppingBag,
  Package,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/shell";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/format";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type ChartRange = "7D" | "30D" | "90D" | "All";

function AdminDashboard() {
  const [range, setRange] = useState<ChartRange>("30D");

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_chart_range") as ChartRange;
    if (saved && ["7D", "30D", "90D", "All"].includes(saved)) {
      setRange(saved);
    }
  }, []);

  const handleRangeChange = (newRange: ChartRange) => {
    setRange(newRange);
    sessionStorage.setItem("admin_chart_range", newRange);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      try {
        const [farmers, products, payouts, customers, orders, notifications] = await Promise.all([
          supabase.from("farmer_profiles").select("id,status,full_name,village,state,created_at"),
          supabase.from("farmer_products").select("id,name,price,stock,status,category,farmer_id"),
          supabase.from("farmer_payouts").select("net_amount,status,settled_at,farmer_id"),
          supabase.from("profiles").select("id,created_at"),
          supabase.from("orders").select("id,total,subtotal,status,payment_status,created_at,items"),
          supabase
            .from("system_notifications")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(15),
        ]);

        return {
          farmers: farmers.data ?? [],
          products: products.data ?? [],
          payouts: payouts.data ?? [],
          customers: customers.data ?? [],
          orders: orders.data ?? [],
          notifications: notifications.data ?? [],
        };
      } catch (err) {
        console.warn("Error fetching admin overview:", err);
        return {
          farmers: [],
          products: [],
          payouts: [],
          customers: [],
          orders: [],
          notifications: [],
        };
      }
    },
  });

  if (isLoading || !data) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const farmersList = data.farmers || [];
  const productsList = data.products || [];
  const payoutsList = data.payouts || [];
  const customersList = data.customers || [];
  const ordersList = data.orders || [];
  const notificationsList = data.notifications || [];

  // Basic counters
  const approvedFarmers = farmersList.filter((f: any) => f?.status === "approved").length;
  const pendingFarmers = farmersList.filter((f: any) => f?.status === "pending").length;
  const publishedProducts = productsList.filter((p: any) => p?.status === "published").length;
  const totalCustomers = customersList.length;

  // Task 4: Needs Attention Widget metrics
  const lowStockProductsCount = productsList.filter(
    (p: any) => p?.status === "published" && Number(p?.stock ?? 0) <= 5
  ).length;
  const unresolvedReturnsCount = ordersList.filter(
    (o: any) => o?.status === "returned" || o?.status === "cancelled"
  ).length;
  const failedPaymentsCount = ordersList.filter(
    (o: any) => o?.payment_status === "failed"
  ).length;

  // Task 2: Differentiate "Total Revenue" vs "Paid Sales"
  // Total Revenue = Sum of all non-cancelled, non-returned order totals regardless of payment status (includes pending COD)
  const activeOrders = ordersList.filter(
    (o: any) => o?.status !== "cancelled" && o?.status !== "returned"
  );
  const totalRevenue = activeOrders.reduce((sum: number, o: any) => sum + Number(o?.total || 0), 0);

  // Paid Sales = Sum of order totals where payment is confirmed paid
  const paidOrders = ordersList.filter((o: any) => o?.payment_status === "paid");
  const paidSales = paidOrders.reduce((sum: number, o: any) => sum + Number(o?.total || 0), 0);

  // Pending COD / Uncollected amount
  const pendingRevenue = totalRevenue - paidSales;

  // Top farmers by earnings
  const earningsByFarmer = new Map<string, number>();
  ordersList.forEach((o: any) => {
    if (o?.status !== "delivered" && o?.status !== "returned") return;
    const factor = o?.status === "delivered" ? 1 : -1;
    (o?.items || []).forEach((item: any) => {
      const farmerId = item?.farmer_id || "farmer_1";
      const itemRevenue = Number(item?.price || 0) * Number(item?.qty || 1) * factor;
      earningsByFarmer.set(farmerId, (earningsByFarmer.get(farmerId) ?? 0) + itemRevenue);
    });
  });

  const topFarmers = [...earningsByFarmer.entries()]
    .map(([id, total]) => ({ farmer: farmersList.find((f: any) => f?.id === id), total }))
    .filter((x: any) => x?.farmer)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Task 1 & 3: Date Range Filter & Partial Day Handling for AreaChart
  const todayDateObj = new Date();
  const todayKey = todayDateObj.toISOString().split("T")[0];

  // Calculate range start cutoff date
  let daysToInclude = 30;
  if (range === "7D") daysToInclude = 7;
  else if (range === "90D") daysToInclude = 90;
  else if (range === "All") daysToInclude = 365;

  const startDate = new Date();
  startDate.setDate(todayDateObj.getDate() - daysToInclude + 1);
  startDate.setHours(0, 0, 0, 0);

  const salesByDate = new Map<string, number>();

  ordersList.forEach((o: any) => {
    if (o?.status === "cancelled" || o?.status === "returned") return;
    if (!o?.created_at) return;
    const date = new Date(o.created_at);
    if (isNaN(date.getTime()) || date < startDate) return;
    const key = date.toISOString().split("T")[0];
    const orderTotal = Number(o.total || 0);
    salesByDate.set(key, (salesByDate.get(key) ?? 0) + orderTotal);
  });

  // Build full daily timeline up to today to prevent missing days & handle partial day
  const chartData: Array<{
    dateStr: string;
    date: string;
    sales: number;
    isToday: boolean;
  }> = [];

  const tempDate = new Date(startDate);
  while (tempDate <= todayDateObj) {
    const key = tempDate.toISOString().split("T")[0];
    const isToday = key === todayKey;
    const sales = salesByDate.get(key) ?? 0;
    const formattedDate = tempDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    chartData.push({ dateStr: key, date: formattedDate, sales, isToday });
    tempDate.setDate(tempDate.getDate() + 1);
  }

  // Categories Donut Chart
  const byCat = new Map<string, number>();
  productsList
    .filter((p: any) => p?.status === "published" && p?.category)
    .forEach((p: any) => byCat.set(p.category, (byCat.get(p.category) ?? 0) + 1));

  const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const colors = ["#0F3D2E", "#B47A46", "#8FBC8F", "#D2B48C"];

  const pieData = topCats.map(([cat, n], i) => ({
    name: String(cat || "Other")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    value: n,
    color: colors[i % colors.length],
  }));

  const defaultPieData = [
    { name: "Dry Fruits", value: 45, color: "#0F3D2E" },
    { name: "Spices", value: 25, color: "#B47A46" },
    { name: "Herbs", value: 15, color: "#8FBC8F" },
    { name: "Others", value: 15, color: "#D2B48C" },
  ];

  const finalPieData = pieData.length > 0 ? pieData : defaultPieData;

  const totalNeedsAttention =
    pendingFarmers + lowStockProductsCount + unresolvedReturnsCount + failedPaymentsCount;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Dashboard Top Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-semibold text-[#0F3D2E]">Platform Overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live operations snapshot & market control center.
          </p>
        </div>
      </div>

      {/* Task 4: Needs Attention Widget */}
      <div className="rounded-2xl border border-warning/30 bg-warning/5 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-warning/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-warning/20 flex items-center justify-center text-warning-foreground font-bold">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">
                Needs Attention ({totalNeedsAttention})
              </h3>
              <p className="text-xs text-muted-foreground">
                Pending operational items requiring admin resolution.
              </p>
            </div>
          </div>
          {totalNeedsAttention === 0 && (
            <span className="text-xs bg-success/10 text-success font-subhead font-semibold px-3 py-1 rounded-full">
              All caught up ✨
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Pending Farmers */}
          <Link
            href="/admin/vendors?status=pending&tab=approvals"
            className="group rounded-xl border border-border bg-background p-4 transition hover:border-primary hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-subhead uppercase tracking-wider font-semibold">
                Farmer Applications
              </span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-foreground">
                {pendingFarmers}
              </span>
              <span className="text-[11px] text-primary group-hover:underline flex items-center font-subhead font-medium">
                Review queue <ArrowUpRight className="h-3 w-3 ml-0.5" />
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {pendingFarmers > 0 ? "Awaiting KYC approval" : "No pending profiles"}
            </p>
          </Link>

          {/* Card 2: Low/Zero Stock */}
          <Link
            href="/admin/products?stock=low"
            className="group rounded-xl border border-border bg-background p-4 transition hover:border-primary hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-subhead uppercase tracking-wider font-semibold">
                Low Stock (≤5)
              </span>
              <Package className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-foreground">
                {lowStockProductsCount}
              </span>
              <span className="text-[11px] text-primary group-hover:underline flex items-center font-subhead font-medium">
                Restock catalog <ArrowUpRight className="h-3 w-3 ml-0.5" />
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {lowStockProductsCount > 0 ? "Items near inventory limit" : "Stock healthy"}
            </p>
          </Link>

          {/* Card 3: Returns / Cancellations */}
          <Link
            href="/admin/orders?status=returned"
            className="group rounded-xl border border-border bg-background p-4 transition hover:border-primary hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-subhead uppercase tracking-wider font-semibold">
                Returns & Cancelled
              </span>
              <RotateCcw className="h-4 w-4 text-rose-600" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-foreground">
                {unresolvedReturnsCount}
              </span>
              <span className="text-[11px] text-primary group-hover:underline flex items-center font-subhead font-medium">
                Manage orders <ArrowUpRight className="h-3 w-3 ml-0.5" />
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {unresolvedReturnsCount > 0 ? "Requires refund check" : "Zero active returns"}
            </p>
          </Link>

          {/* Card 4: Failed / Flagged Payments */}
          <Link
            href="/admin/orders?payment_status=failed"
            className="group rounded-xl border border-border bg-background p-4 transition hover:border-primary hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-subhead uppercase tracking-wider font-semibold">
                Failed Payments
              </span>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-foreground">
                {failedPaymentsCount}
              </span>
              <span className="text-[11px] text-primary group-hover:underline flex items-center font-subhead font-medium">
                Audit payments <ArrowUpRight className="h-3 w-3 ml-0.5" />
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {failedPaymentsCount > 0 ? "Flagged transaction retries" : "All payments clear"}
            </p>
          </Link>
        </div>
      </div>

      {/* Task 2: Differentiated Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={inr(totalRevenue)}
          delta={pendingRevenue > 0 ? `Includes ${inr(pendingRevenue)} pending COD` : `${activeOrders.length} active orders`}
        />
        <StatCard
          label="Paid Sales"
          value={inr(paidSales)}
          delta={`${paidOrders.length} verified collected orders`}
        />
        <StatCard
          label="Total Products"
          value={String(publishedProducts)}
          delta={`${data.products.length} registered catalog total`}
        />
        <StatCard
          label="Approved Farmers"
          value={String(approvedFarmers)}
          delta={pendingFarmers > 0 ? `${pendingFarmers} pending review` : "All caught up"}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Span (2 Columns): Sales Line and Pie Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Overview Area Chart with Task 1 & 3 fixes */}
          <div className="rounded-2xl border border-border bg-background p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">
                  Order Overview
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time sales trend over selected period.
                </p>
              </div>

              {/* Task 3: Date Range Filter Buttons */}
              <div className="flex items-center bg-secondary/50 p-1 rounded-xl border border-border text-xs font-subhead font-medium">
                {(["7D", "30D", "90D", "All"] as ChartRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRangeChange(r)}
                    className={`px-3 py-1 rounded-lg transition ${
                      range === r
                        ? "bg-primary text-primary-foreground font-bold shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F3D2E" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0F3D2E" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9EFE9" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    style={{ fontSize: 10, fill: "#888" }}
                  />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "#888" }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-border bg-background p-3 shadow-lg text-xs space-y-1">
                          <p className="font-bold text-foreground flex items-center gap-1.5">
                            {item.date}
                            {item.isToday && (
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                                Today (Partial day — updates live)
                              </span>
                            )}
                          </p>
                          <p className="text-primary font-mono font-bold text-sm">
                            {inr(Number(item.sales))}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#0F3D2E"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lower Grid: Top Farmers & Top Categories Side by Side */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Farmers list */}
            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm space-y-4">
              <h3 className="font-display text-base font-semibold text-foreground">
                Top Sourced Farmers
              </h3>
              {topFarmers.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No active sales logged yet.
                </p>
              ) : (
                <div className="space-y-4 mt-2">
                  {topFarmers.map(({ farmer, total }, i) => (
                    <div
                      key={farmer!.id}
                      className="flex items-center justify-between text-xs hover:bg-secondary/10 p-1.5 rounded-lg transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-muted-foreground w-4">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">{farmer!.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {farmer!.village}, {farmer!.state}
                          </p>
                        </div>
                      </div>
                      <span className="font-subhead font-bold text-primary">{inr(total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pie Chart / Donut Chart */}
            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <h3 className="font-display text-base font-semibold text-foreground">
                Top Sourced Categories
              </h3>
              <div className="h-44 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={finalPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {finalPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`${val} Listings`, "Count"]}
                      contentStyle={{ borderRadius: 8, fontSize: 10 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text for donut */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="font-display text-lg font-bold text-foreground">
                    {publishedProducts}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    Listings
                  </span>
                </div>
              </div>

              {/* Legends */}
              <div className="grid grid-cols-2 gap-2 text-[10px] mt-2">
                {finalPieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="truncate text-muted-foreground font-medium">
                      {d.name} ({d.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Span (1 Column): Operations Feed / Audit Log */}
        <div className="rounded-2xl border border-border bg-background p-6 shadow-sm flex flex-col h-full space-y-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <h3 className="font-display text-base font-semibold text-foreground">
              Operations Audit Log
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">Real-time marketplace event stream.</p>

          {notificationsList.length === 0 ? (
            <div className="py-20 text-center flex-1 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">No operations alerts recorded.</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[520px] pr-1 flex-1">
              {notificationsList.map((n: any) => {
                const dateStr = n.created_at
                  ? new Date(n.created_at).toLocaleTimeString("en-IN")
                  : "";
                const type = n.type || "system_notification";
                const isKyc = type === "farmer_kyc_submission";
                const isCancelled = type === "order_cancelled";
                const isStatusChange = type === "order_status_change";
                const isProductEdit = type === "product_edit";
                const isApproval = type === "farmer_approved";

                let badgeColor = "bg-primary/10 text-primary border-primary/20";
                let badgeLabel = type.replace(/_/g, " ").toUpperCase();

                if (isKyc || isApproval) {
                  badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
                } else if (isCancelled || type === "order_refund") {
                  badgeColor = "bg-rose-100 text-rose-800 border-rose-300";
                } else if (isStatusChange || isProductEdit) {
                  badgeColor = "bg-amber-100 text-amber-900 border-amber-300";
                }

                return (
                  <div
                    key={n.id}
                    className="p-3 bg-secondary/15 rounded-xl border border-border/30 text-xs space-y-1.5 hover:bg-secondary/35 transition"
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className={`font-subhead text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${badgeColor}`}
                      >
                        {badgeLabel}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-subhead">
                        {dateStr}
                      </span>
                    </div>
                    <p className="font-display font-semibold text-foreground leading-snug">
                      {n.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-normal">{n.message}</p>
                    {n.metadata?.actor && (
                      <p className="text-[9px] text-muted-foreground font-mono">
                        Actor: {n.metadata.actor}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
