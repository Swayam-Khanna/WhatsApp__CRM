"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Wallet,
  FileText,
  Tag,
  Landmark,
  ShoppingBag,
  CheckCircle2,
  Package,
  Plus,
  Loader2,
  X,
  MapPin,
  Phone,
  Calendar,
  Save,
  ChevronDown,
  LineChart as LineChartIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { useFarmerProfile } from "@/lib/farmer/use-farmer";
import { useVerificationStatus } from "@/lib/farmer/use-verification-status";
import { inr } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import {
  dashboardService,
  earningsService,
  inventoryService,
  orderService,
  type DashboardStats,
  type EarningsPerformance,
  type LowStockItem,
  type ListingsSummary,
  type FarmerCustomerOrder,
} from "@/lib/services";

interface NiceYAxisResult {
  domain: [number, number];
  ticks: number[];
  tickFormatter: (val: number) => string;
}

/**
 * Calculates human-friendly "nice number" Y-axis ticks and bounds based on data magnitude.
 */
function calculateNiceYAxis(maxVal: number, targetTickCount = 5): NiceYAxisResult {
  if (maxVal <= 0) {
    return {
      domain: [0, 1000],
      ticks: [0, 200, 400, 600, 800, 1000],
      tickFormatter: (val) => (val === 0 ? "₹0" : `₹${val}`),
    };
  }

  // 1. Calculate rough interval step
  const rawStep = maxVal / targetTickCount;
  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = Math.pow(10, exponent);
  const fraction = rawStep / magnitude;

  let niceFraction = 1;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 2.5) niceFraction = 2.5;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;

  const niceStep = niceFraction * magnitude;
  const niceMax = Math.ceil(maxVal / niceStep) * niceStep;

  // 2. Generate tick array from 0 to niceMax
  const ticks: number[] = [];
  for (let current = 0; current <= niceMax + 0.0001; current += niceStep) {
    ticks.push(Math.round(current));
  }

  // 3. Smart Formatter ensuring distinct, unambiguous labels per Indian numbering
  const tickFormatter = (val: number): string => {
    if (val === 0) return "₹0";

    // If whole scale is under ₹2,000, show exact numbers (e.g. ₹200, ₹400, ₹800, ₹1,200)
    if (niceMax < 2000) {
      return `₹${val.toLocaleString("en-IN")}`;
    }

    // If scale is in Lakhs (>= 1,00,000) and step is in lakhs
    if (niceMax >= 100000 && val >= 100000) {
      const inLakhs = val / 100000;
      return Number.isInteger(inLakhs) ? `₹${inLakhs}L` : `₹${inLakhs.toFixed(1)}L`;
    }

    // If scale is in Thousands (>= 1,000)
    if (val >= 1000) {
      const inK = val / 1000;
      return Number.isInteger(inK) ? `₹${inK}k` : `₹${inK.toFixed(1)}k`;
    }

    return `₹${val.toLocaleString("en-IN")}`;
  };

  return {
    domain: [0, niceMax],
    ticks,
    tickFormatter,
  };
}

export default function FarmerDashboardPage() {
  const { data: farmer, isLoading: isProfileLoading } = useFarmerProfile();
  const { isVerified, isLocked } = useVerificationStatus();
  const qc = useQueryClient();

  const farmerId = farmer?.id || undefined;
  const farmerSlug = farmer?.slug || undefined;

  // Selected period for Monthly Earnings chart
  const [period, setPeriod] = useState<"3m" | "6m" | "1y">("6m");

  // Selected Order for Details Modal
  const [selectedOrder, setSelectedOrder] = useState<FarmerCustomerOrder | null>(null);

  // Selected Product for Quick Stock Update Modal
  const [stockModalItem, setStockModalItem] = useState<LowStockItem | null>(null);
  const [updatedStockValue, setUpdatedStockValue] = useState<number>(0);
  const [isUpdatingStock, setIsUpdatingStock] = useState<boolean>(false);

  // 1. Dashboard Stats Query
  const {
    data: stats,
    isLoading: isStatsLoading,
  } = useQuery<DashboardStats>({
    queryKey: ["farmer-dashboard-stats", farmerId, farmerSlug],
    queryFn: () => dashboardService.getDashboardStats(farmerId, farmerSlug),
    staleTime: 10000,
    refetchInterval: 10000,
  });

  // 2. Accreditation Status Query
  const {
    data: accreditation,
    isLoading: isAccreditationLoading,
  } = useQuery({
    queryKey: ["farmer-accreditation", farmerId, farmerSlug],
    queryFn: () => dashboardService.getAccreditation(farmerId, farmerSlug),
    staleTime: 30000,
  });

  // 3. Monthly Earnings Chart Query
  const {
    data: earningsData,
    isLoading: isEarningsLoading,
  } = useQuery<EarningsPerformance>({
    queryKey: ["farmer-earnings-chart", farmerSlug, period],
    queryFn: () => earningsService.getEarningsPerformance(farmerSlug, period),
    staleTime: 15000,
    refetchInterval: 15000,
  });

  // Dynamic Y-axis scale and empty-state evaluations
  const rawChartData = earningsData?.data || [];
  const maxEarnings = Math.max(...rawChartData.map((d) => d.earnings), 0);
  const hasAnyEarnings = maxEarnings > 0;
  const yAxisScale = useMemo(() => calculateNiceYAxis(maxEarnings), [maxEarnings]);

  // 4. Low Stock Warnings Query
  const {
    data: lowStockItems = [],
    isLoading: isLowStockLoading,
  } = useQuery<LowStockItem[]>({
    queryKey: ["farmer-low-stock", farmerId],
    queryFn: () => inventoryService.getLowStockItems(farmerId),
    staleTime: 15000,
    refetchInterval: 15000,
  });

  // 5. Listings Summary Query
  const {
    data: listingsSummary,
    isLoading: isListingsLoading,
  } = useQuery<ListingsSummary>({
    queryKey: ["farmer-listings-summary", farmerId],
    queryFn: () => inventoryService.getListingsSummary(farmerId),
    staleTime: 15000,
    refetchInterval: 15000,
  });

  // 6. Recent Customer Orders Query
  const {
    data: recentOrders = [],
    isLoading: isOrdersLoading,
  } = useQuery<FarmerCustomerOrder[]>({
    queryKey: ["farmer-recent-orders", farmerId, farmerSlug],
    queryFn: () => orderService.getRecentOrders(farmerId, farmerSlug, 5),
    staleTime: 10000,
    refetchInterval: 10000,
  });

  // Real-time Supabase channel & cross-tab sync for instant customer order updates
  useEffect(() => {
    if (!farmer) return;

    const channel = supabase
      .channel("farmer-dashboard-orders-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload: any) => {
          qc.invalidateQueries({ queryKey: ["farmer-recent-orders"] });
          qc.invalidateQueries({ queryKey: ["farmer-dashboard-stats"] });
          qc.invalidateQueries({ queryKey: ["farmer-earnings-chart"] });
          qc.invalidateQueries({ queryKey: ["farmer-listings-summary"] });
          qc.invalidateQueries({ queryKey: ["farmer-low-stock"] });

          if (payload.eventType === "INSERT") {
            const rawItems: any[] = Array.isArray(payload.new?.items) ? payload.new.items : [];
            const hasMyProduce = rawItems.some(
              (it: any) =>
                it.farmer_id === farmer.id ||
                it.farmer_slug === farmer.slug ||
                it.farmerSlug === farmer.slug
            );
            if (hasMyProduce) {
              const displayCode = payload.new.order_id || `#ORD-${payload.new.id?.slice(0, 8)}`;
              toast.success(`🎉 New customer order received! (${displayCode})`, {
                duration: 6000,
              });
            }
          }
        }
      )
      .subscribe();

    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("mock_order_")) {
        qc.invalidateQueries({ queryKey: ["farmer-recent-orders"] });
        qc.invalidateQueries({ queryKey: ["farmer-dashboard-stats"] });
        qc.invalidateQueries({ queryKey: ["farmer-earnings-chart"] });
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("storage", handleStorage);
    };
  }, [farmer, qc]);

  // Stock update submission
  const handleStockUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalItem) return;

    setIsUpdatingStock(true);
    try {
      await inventoryService.updateItemStock(stockModalItem.id, updatedStockValue);
      toast.success(`Updated stock for ${stockModalItem.name} to ${updatedStockValue} ${stockModalItem.unit}`);
      setStockModalItem(null);
      qc.invalidateQueries({ queryKey: ["farmer-low-stock"] });
      qc.invalidateQueries({ queryKey: ["farmer-listings-summary"] });
      qc.invalidateQueries({ queryKey: ["farmer-dashboard-stats"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update inventory stock");
    } finally {
      setIsUpdatingStock(false);
    }
  };

  // Listings summary donut chart data
  const donutData = [
    {
      name: "Published Products",
      value: listingsSummary?.published ?? 0,
      pct: listingsSummary?.publishedPct ?? 0,
      color: "#0F3D2E",
    },
    {
      name: "Drafted Products",
      value: listingsSummary?.drafted ?? 0,
      pct: listingsSummary?.draftedPct ?? 0,
      color: "#4E8752",
    },
    {
      name: "Out of Stock",
      value: listingsSummary?.outOfStock ?? 0,
      pct: listingsSummary?.outOfStockPct ?? 0,
      color: "#A3CCA6",
    },
  ];

  // Helper for Status Badge styling
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]";
      case "shipped":
        return "bg-[#E3F2FD] text-[#1976D2] border border-[#BBDEFB]";
      case "confirmed":
      case "packed":
        return "bg-[#FFF8E1] text-[#E65100] border border-[#FFE082]";
      case "processing":
      default:
        return "bg-[#EDE7F6] text-[#5E35B1] border border-[#D1C4E9]";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER                                                             */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Welcome back, {farmer?.full_name || "Farmer"} 👋
          </h1>
          <p className="font-subhead text-xs sm:text-sm text-muted-foreground mt-1">
            {farmer?.farm_name ? `${farmer.farm_name}${farmer.village ? ` · ${farmer.village}` : ""}${farmer.state ? `, ${farmer.state}` : ""}` : "Prajnaa Farmer Portal"}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/farmer-portal/products"
            className="font-subhead inline-flex items-center gap-2 rounded-full bg-[#0F3D2E] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#16503e] active:scale-[0.98] transition-all cursor-pointer"
          >
            Add New Listing
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PRAJNAA VERIFIED ACCREDITATION CARD                                    */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-border/80 bg-white p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all hover:border-[#0F3D2E]/30">
        <div className="flex items-start sm:items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#0F3D2E] text-[#D4AF37] grid place-items-center shadow-xs shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="font-display text-sm sm:text-base font-bold text-foreground">
                Prajnaa Verified Accreditation
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F5EBE1] border border-[#E8DCCF] px-2.5 py-0.5 text-[10px] font-bold text-[#6E4F32] uppercase tracking-wider">
                {accreditation?.statusText || "ACCREDITATION PENDING"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Official Prajnaa verified certificate & scannable QR code.
            </p>
          </div>
        </div>

        <Link
          href="/farmer-portal/certificate"
          className="font-subhead inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0F3D2E] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#16503e] active:scale-[0.98] transition-all shrink-0 cursor-pointer"
        >
          Manage Certificate & Visibility →
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 3. STATISTICS CARDS (4 CARDS IN A ROW)                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Card 1: Lifetime Earnings */}
        <div className="rounded-3xl border border-border/80 bg-white p-5 shadow-xs flex items-center justify-between transition-all hover:shadow-sm">
          <div className="space-y-1">
            <p className="font-subhead text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              LIFETIME EARNINGS
            </p>
            <p className="font-display text-2xl lg:text-[28px] font-bold tracking-tight text-foreground">
              {stats?.lifetimeEarningsFormatted || "₹0"}
            </p>
            <p className="text-[11px] text-muted-foreground">After platform fees</p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-[#E8F5E9] text-[#2E7D32] grid place-items-center shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        {/* Card 2: Incoming Orders */}
        <div className="rounded-3xl border border-border/80 bg-white p-5 shadow-xs flex items-center justify-between transition-all hover:shadow-sm">
          <div className="space-y-1">
            <p className="font-subhead text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              INCOMING ORDERS
            </p>
            <p className="font-display text-2xl lg:text-[28px] font-bold tracking-tight text-foreground">
              {stats?.incomingOrdersCount ?? 0}
            </p>
            <p className="text-[11px] text-emerald-700 font-medium">
              {stats?.awaitingConfirmationCount ?? 0} awaiting confirmation
            </p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-[#FFF3E0] text-[#E65100] grid place-items-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        {/* Card 3: Active Listings */}
        <div className="rounded-3xl border border-border/80 bg-white p-5 shadow-xs flex items-center justify-between transition-all hover:shadow-sm">
          <div className="space-y-1">
            <p className="font-subhead text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              ACTIVE LISTINGS
            </p>
            <p className="font-display text-2xl lg:text-[28px] font-bold tracking-tight text-foreground">
              {stats?.activeListingsCount ?? 0}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {stats?.liveProductsCount ?? 0} products live
            </p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-[#E8F5E9] text-[#2E7D32] grid place-items-center shrink-0">
            <Tag className="h-5 w-5" />
          </div>
        </div>

        {/* Card 4: Next Payout */}
        <div className="rounded-3xl border border-border/80 bg-white p-5 shadow-xs flex items-center justify-between transition-all hover:shadow-sm">
          <div className="space-y-1">
            <p className="font-subhead text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              NEXT PAYOUT
            </p>
            <p className="font-display text-2xl lg:text-[28px] font-bold tracking-tight text-foreground">
              {stats?.nextPayoutFormatted || "₹0"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {stats?.nextPayoutExpectedDate ? (stats.nextPayoutExpectedDate.startsWith("No") ? stats.nextPayoutExpectedDate : `Expected on ${stats.nextPayoutExpectedDate}`) : "No scheduled payout"}
            </p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-[#F5EBE1] text-[#8D5B28] grid place-items-center shrink-0">
            <Landmark className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN 2-COLUMN SECTION (CHART & RECENT ORDERS | LOW STOCK & SUMMARY)    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================================= */}
        {/* LEFT COLUMN: MONTHLY EARNINGS CHART & RECENT CUSTOMER ORDERS            */}
        {/* ======================================================================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* Monthly Earnings Card */}
          <div className="rounded-3xl border border-border/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Monthly Earnings
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Earnings performance over the last {period === "3m" ? "3 months" : period === "1y" ? "12 months" : "6 months"}.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full select-none">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{hasAnyEarnings ? earningsData?.percentageChange || "—" : "—"}</span>
                </div>

                <div className="relative">
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as "3m" | "6m" | "1y")}
                    className="font-subhead text-xs font-semibold text-foreground bg-secondary/60 border border-border/80 rounded-xl px-3 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#0F3D2E]"
                  >
                    <option value="3m">3 Months</option>
                    <option value="6m">6 Months</option>
                    <option value="1y">1 Year</option>
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Interactive Chart & Empty State */}
            <div className="h-64 sm:h-72 w-full pt-2">
              {isEarningsLoading ? (
                <div className="h-full w-full grid place-items-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-[#0F3D2E]" />
                </div>
              ) : !hasAnyEarnings ? (
                <div className="h-full w-full rounded-2xl border border-dashed border-border/80 bg-[#fbfbf9]/60 flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                  <div className="h-11 w-11 rounded-2xl bg-[#0F3D2E]/10 text-[#0F3D2E] grid place-items-center shadow-2xs">
                    <LineChartIcon className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-display text-sm font-bold text-foreground">
                      No earnings yet
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                      Your monthly trend will appear here once you start receiving orders.
                    </p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={rawChartData}
                    margin={{ top: 12, right: 12, left: -4, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0F3D2E" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#0F3D2E" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBEBE6" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      style={{ fontSize: 11, fill: "#737373", fontFamily: "inherit" }}
                    />
                    <YAxis
                      domain={yAxisScale.domain}
                      ticks={yAxisScale.ticks}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={yAxisScale.tickFormatter}
                      width={46}
                      style={{ fontSize: 11, fill: "#737373", fontFamily: "inherit" }}
                    />
                    <Tooltip
                      cursor={{
                        stroke: "#0F3D2E",
                        strokeWidth: 1.5,
                        strokeDasharray: "4 4",
                      }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const point = payload[0].payload as any;
                        const val = Number(payload[0].value || 0);
                        const labelText = point.fullMonth || point.month || "Period";

                        return (
                          <div className="rounded-2xl border border-border/90 bg-white/95 backdrop-blur-md p-3 shadow-xl space-y-1 text-xs select-none min-w-[130px]">
                            <p className="font-subhead text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                              {labelText}
                            </p>
                            <p className="font-display text-base font-bold text-[#0F3D2E]">
                              {inr(val)}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium">
                              Produce Share Earnings
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      stroke="#0F3D2E"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#earningsGradient)"
                      dot={{ r: 3.5, fill: "#0F3D2E", stroke: "#FFFFFF", strokeWidth: 1.5 }}
                      activeDot={{
                        r: 6,
                        fill: "#0F3D2E",
                        stroke: "#FFFFFF",
                        strokeWidth: 2.5,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Recent Customer Orders Section */}
          <div className="rounded-3xl border border-border/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Recent Customer Orders
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your most recent customer purchases.
                </p>
              </div>

              <Link
                href="/farmer-portal/orders"
                className="font-subhead text-xs font-semibold text-foreground hover:text-[#0F3D2E] flex items-center gap-1 transition-colors"
              >
                View all orders <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {isOrdersLoading ? (
              <div className="grid place-items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#0F3D2E]" />
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-2">
                <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="font-medium text-xs text-foreground">No customer orders yet.</p>
                <p className="text-[11px] text-muted-foreground">Your recent orders will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border/80 font-subhead uppercase tracking-wider text-muted-foreground text-[10px]">
                      <th className="pb-3 pr-4 font-bold">ORDER ID</th>
                      <th className="pb-3 pr-4 font-bold">CUSTOMER</th>
                      <th className="pb-3 pr-4 font-bold">PRODUCTS</th>
                      <th className="pb-3 pr-4 font-bold">AMOUNT</th>
                      <th className="pb-3 text-right font-bold">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {recentOrders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className="hover:bg-secondary/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 pr-4 font-semibold text-foreground">
                          {order.orderId}
                        </td>
                        <td className="py-3.5 pr-4 text-foreground font-medium">
                          {order.customerName}
                        </td>
                        <td className="py-3.5 pr-4 text-muted-foreground max-w-[220px] truncate">
                          {order.productsSummary}
                        </td>
                        <td className="py-3.5 pr-4 font-semibold text-foreground">
                          {order.amountFormatted}
                        </td>
                        <td className="py-3.5 text-right">
                          <span
                            className={`font-subhead inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadge(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: LOW STOCK WARNINGS, LISTINGS SUMMARY & QUICK ACTIONS      */}
        {/* ======================================================================= */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. Low Stock Warnings Card */}
          <div className="rounded-3xl border border-border/80 bg-white p-6 shadow-xs space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h3 className="font-display text-base font-bold text-foreground">
                  Low Stock Warnings
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lowStockItems.length > 0
                  ? `${lowStockItems.length} item${lowStockItems.length === 1 ? "" : "s"} low in stock`
                  : "All crop listings well stocked"}
              </p>
            </div>

            {isLowStockLoading ? (
              <div className="grid place-items-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#0F3D2E]" />
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="p-4 rounded-2xl bg-secondary/50 border border-border/60 text-xs text-muted-foreground text-center">
                All crop listings are currently well stocked. Nice job.
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-2xl border border-border/60 hover:bg-secondary/30 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-secondary/80 overflow-hidden shrink-0 grid place-items-center">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-foreground truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Only {item.stock} {item.unit} left
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStockModalItem(item);
                        setUpdatedStockValue(item.stock);
                      }}
                      className="font-subhead text-xs font-semibold px-3 py-1.5 rounded-xl border border-border/80 bg-background text-foreground hover:bg-secondary transition-all shrink-0 cursor-pointer shadow-2xs"
                    >
                      Update
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-1">
              <Link
                href="/farmer-portal/inventory"
                className="font-subhead text-xs font-semibold text-foreground hover:text-[#0F3D2E] inline-flex items-center gap-1 transition-colors"
              >
                Manage Inventory →
              </Link>
            </div>
          </div>

          {/* 2. Listings Summary Card */}
          <div className="rounded-3xl border border-border/80 bg-white p-6 shadow-xs space-y-4">
            <h3 className="font-display text-base font-bold text-foreground">
              Listings Summary
            </h3>

            <div className="flex items-center justify-between gap-4">
              {/* Donut Chart */}
              <div className="h-28 w-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={50}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="flex-1 space-y-2.5 text-xs">
                {donutData.map((d) => (
                  <Link
                    key={d.name}
                    href="/farmer-portal/products"
                    className="flex items-center justify-between group hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-muted-foreground group-hover:text-foreground text-[11px]">
                        {d.name}
                      </span>
                    </div>
                    <span className="font-bold text-foreground text-xs">
                      {d.value} ({d.pct}%)
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Quick Actions Card */}
          <div className="rounded-3xl border border-border/80 bg-white p-6 shadow-xs space-y-3">
            <h3 className="font-display text-base font-bold text-foreground mb-1">
              Quick Actions
            </h3>

            <div className="space-y-2.5">
              <Link
                href="/farmer-portal/inventory"
                className="font-subhead w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-border/80 bg-white py-3 text-xs font-semibold text-foreground hover:bg-secondary/60 transition-all shadow-2xs"
              >
                <Package className="h-4 w-4 text-[#0F3D2E]" /> Manage Inventory
              </Link>

              <Link
                href="/farmer-portal/onboarding"
                className="font-subhead w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B47A46] py-3 text-xs font-semibold text-white hover:bg-[#9c6636] transition-all shadow-xs"
              >
                <Award className="h-4 w-4 text-white" /> Prajnaa Onboarding
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUICK STOCK UPDATE MODAL                                                  */}
      {/* ========================================================================= */}
      {stockModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-border bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Update Stock Quantity
                </h3>
                <p className="text-xs text-muted-foreground">{stockModalItem.name}</p>
              </div>
              <button
                onClick={() => setStockModalItem(null)}
                className="p-1 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStockUpdateSubmit} className="space-y-4">
              <div>
                <label className="font-subhead text-xs font-medium text-muted-foreground mb-1 block">
                  Available Quantity ({stockModalItem.unit})
                </label>
                <input
                  type="number"
                  min="0"
                  value={updatedStockValue}
                  onChange={(e) => setUpdatedStockValue(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-2xl border border-border bg-secondary/40 text-sm font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#0F3D2E]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStockModalItem(null)}
                  className="px-4 py-2 rounded-full border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStock}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0F3D2E] text-white text-xs font-semibold hover:bg-[#16503e] disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                >
                  {isUpdatingStock ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ORDER DETAILS MODAL                                                       */}
      {/* ========================================================================= */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold text-foreground">
                    Order Details
                  </h3>
                  <span
                    className={`font-subhead inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(
                      selectedOrder.status
                    )}`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {selectedOrder.orderId}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Customer & Address info */}
            <div className="rounded-2xl bg-secondary/50 p-4 border border-border/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-semibold text-foreground">{selectedOrder.customerName}</span>
              </div>
              {selectedOrder.customerPhone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact:</span>
                  <span className="text-foreground">{selectedOrder.customerPhone}</span>
                </div>
              )}
              {selectedOrder.shippingAddress && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Delivery Address:</span>
                  <span className="text-foreground text-right text-[11px]">
                    {selectedOrder.shippingAddress}
                  </span>
                </div>
              )}
            </div>

            {/* Produce items */}
            <div className="space-y-3">
              <p className="font-subhead text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Ordered Produce Items
              </p>
              <div className="space-y-2">
                {selectedOrder.items?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-2 border-b border-border/50 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Quantity: {item.qty} {item.unit || "kg"}
                      </p>
                    </div>
                    <p className="font-semibold text-foreground">₹{item.price * item.qty}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Total */}
            <div className="border-t border-border pt-3 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Total Payout Amount</span>
              <span className="font-display font-bold text-base text-[#0F3D2E]">
                {selectedOrder.amountFormatted}
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 rounded-full bg-[#0F3D2E] text-white text-xs font-semibold hover:bg-[#16503e] transition-all"
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
