import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/format";

export interface EarningsDataPoint {
  month: string;
  fullMonth?: string;
  earnings: number;
  label?: string;
}

export interface EarningsPerformance {
  data: EarningsDataPoint[];
  percentageChange: string;
  isPositive: boolean;
  totalEarnings: number;
  periodLabel: string;
}

export interface SettlementCycle {
  open: Date;
  close: Date;
  periodStart: Date;
  periodEnd: Date;
  openFormatted: string;
  closeFormatted: string;
  periodStartFormatted: string;
  periodEndFormatted: string;
  fullWindowFormatted: string;
  fullPeriodFormatted: string;
  isNext: boolean;
  statusText: string;
  estimatedAmount?: number;
  estimatedAmountFormatted?: string;
  totalDaysInWindow: number;
  daysElapsedInWindow: number;
  progressPercent: number;
  progressLabel: string;
}

export interface PayoutHistoryItem {
  id: string;
  settlementDate: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  fees: number;
  netAmount: number;
  status: "paid" | "processing" | "pending" | "failed" | "scheduled";
  reference?: string | null;
  settledAt?: string | null;
}

export interface MonthOverMonthTrend {
  hasComparison: boolean;
  percentageChange: string;
  isPositive: boolean;
  label: string;
}

export interface FarmerEarningsSummary {
  lifetimeEarned: number;
  lifetimeEarnedFormatted: string;
  pendingPayouts: number;
  pendingPayoutsFormatted: string;
  avgMonthly12Mo: number;
  avgMonthly12MoFormatted: string;
  monthOverMonthTrend: MonthOverMonthTrend | null;
  nextSettlement: SettlementCycle;
  upcomingSchedule: SettlementCycle[];
  payoutHistory: PayoutHistoryItem[];
  lastSyncedAt: string;
}

interface MonthSlot {
  month: string;
  fullMonth: string;
  yearMonthKey: string;
  earnings: number;
}

function generateMonthSlots(period: "3m" | "6m" | "1y"): MonthSlot[] {
  const monthCount = period === "3m" ? 3 : period === "1y" ? 12 : 6;
  const now = new Date();
  const slots: MonthSlot[] = [];

  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const fullMonth = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yearMonthKey = `${yyyy}-${mm}`;

    slots.push({
      month,
      fullMonth,
      yearMonthKey,
      earnings: 0,
    });
  }

  return slots;
}

/**
 * Calculates accurate settlement window for given anchor date.
 * Settlement window is 7th–10th of every month for sales completed in the previous calendar month.
 */
export function calculateSettlementWindow(today = new Date(), isNextCycle = false, estimatedAmount = 0): SettlementCycle {
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  let openYear = year;
  let openMonth = month;

  if (day > 10) {
    openMonth = month + 1;
    if (openMonth > 11) {
      openMonth = 0;
      openYear++;
    }
  }

  const open = new Date(openYear, openMonth, 7);
  const close = new Date(openYear, openMonth, 10);

  // Period settled is the previous calendar month
  const periodMonth = openMonth - 1;
  const periodYear = periodMonth < 0 ? openYear - 1 : openYear;
  const pm = (periodMonth + 12) % 12;
  const periodStart = new Date(periodYear, pm, 1);
  const periodEnd = new Date(periodYear, pm + 1, 0);

  const openFormatted = open.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  const closeFormatted = close.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  const periodStartFormatted = periodStart.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  const periodEndFormatted = periodEnd.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  const fullWindowFormatted = `${open.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${close.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`;
  const fullPeriodFormatted = `Covers sales from ${periodStart.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${periodEnd.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`;

  // Real date progress computation
  let totalDaysInWindow = 10;
  let daysElapsedInWindow = Math.min(day, 10);
  let progressPercent = 0;
  let progressLabel = "";

  if (day <= 10) {
    totalDaysInWindow = 10;
    daysElapsedInWindow = Math.max(1, day);
    progressPercent = Math.min(100, Math.round((daysElapsedInWindow / totalDaysInWindow) * 100));
    progressLabel = `${daysElapsedInWindow} of ${totalDaysInWindow} settlement window days`;
  } else {
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    totalDaysInWindow = daysInCurrentMonth;
    daysElapsedInWindow = day;
    progressPercent = Math.min(100, Math.round((daysElapsedInWindow / totalDaysInWindow) * 100));
    progressLabel = `${daysElapsedInWindow} of ${totalDaysInWindow} cycle days`;
  }

  return {
    open,
    close,
    periodStart,
    periodEnd,
    openFormatted,
    closeFormatted,
    periodStartFormatted,
    periodEndFormatted,
    fullWindowFormatted,
    fullPeriodFormatted,
    isNext: isNextCycle,
    statusText: isNextCycle ? "Next" : "— pending —",
    estimatedAmount: isNextCycle ? estimatedAmount : undefined,
    estimatedAmountFormatted: isNextCycle ? inr(estimatedAmount) : "— pending —",
    totalDaysInWindow,
    daysElapsedInWindow,
    progressPercent,
    progressLabel,
  };
}

export function generateUpcomingSchedule(months = 6, nextEstimatedAmount = 0): SettlementCycle[] {
  const schedule: SettlementCycle[] = [];
  let cursor = new Date();

  for (let i = 0; i < months; i++) {
    const cycle = calculateSettlementWindow(cursor, i === 0, i === 0 ? nextEstimatedAmount : 0);
    schedule.push(cycle);
    // Move cursor to after the close date for next month calculation
    const nextMonthDate = new Date(cycle.close.getFullYear(), cycle.close.getMonth() + 1, 12);
    cursor = nextMonthDate;
  }

  return schedule;
}

export const earningsService = {
  async getEarningsPerformance(
    farmerSlug?: string,
    period: "3m" | "6m" | "1y" = "6m"
  ): Promise<EarningsPerformance> {
    const slots = generateMonthSlots(period);
    const periodLabel = period === "3m" ? "3 Months" : period === "1y" ? "1 Year" : "6 Months";

    try {
      if (farmerSlug) {
        const { data: allOrders } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: true });

        const farmerOrders = (allOrders ?? []).filter((o: any) => {
          const isDeliveredOrReturned = o.status === "delivered" || o.status === "returned";
          if (!isDeliveredOrReturned) return false;

          const rawItems: any[] = Array.isArray(o.items) ? o.items : [];
          const hasProduce = rawItems.some(
            (item: any) =>
              (item.farmer_slug && String(item.farmer_slug).toLowerCase() === String(farmerSlug).toLowerCase()) ||
              (item.farmerSlug && String(item.farmerSlug).toLowerCase() === String(farmerSlug).toLowerCase())
          );

          return hasProduce;
        });

        if (farmerOrders.length > 0) {
          farmerOrders.forEach((o: any) => {
            if (!o.created_at) return;
            const date = new Date(o.created_at);
            if (isNaN(date.getTime())) return;

            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const key = `${yyyy}-${mm}`;

            const targetSlot = slots.find((s) => s.yearMonthKey === key);
            if (targetSlot) {
              const rawItems: any[] = Array.isArray(o.items) ? o.items : [];
              const farmerItems = rawItems.filter(
                (i: any) =>
                  (i.farmer_slug && String(i.farmer_slug).toLowerCase() === String(farmerSlug).toLowerCase()) ||
                  (i.farmerSlug && String(i.farmerSlug).toLowerCase() === String(farmerSlug).toLowerCase())
              );

              const orderTotal = farmerItems.reduce((acc: number, item: any) => {
                const qty = Number(item.qty || item.quantity || 1);
                const basePrice =
                  Number(item.farmer_base_price || item.farmerBasePrice) ||
                  Math.round(Number(item.price || item.unitPrice || 0) / 1.1);
                return acc + (Number(item.farmer_total) || basePrice * qty);
              }, 0);

              if (o.status === "delivered") {
                targetSlot.earnings += orderTotal;
              } else if (o.status === "returned") {
                targetSlot.earnings = Math.max(0, targetSlot.earnings - orderTotal);
              }
            }
          });
        }
      }
    } catch (err) {
      console.warn("[earningsService] Error computing dynamic earnings:", err);
    }

    const data: EarningsDataPoint[] = slots.map((s) => ({
      month: s.month,
      fullMonth: s.fullMonth,
      earnings: Math.max(0, Math.round(s.earnings)),
    }));

    const total = data.reduce((sum, d) => sum + d.earnings, 0);
    const first = data[0]?.earnings || 0;
    const last = data[data.length - 1]?.earnings || 0;

    let percentageChange = "—";
    let isPositive = true;

    if (total > 0) {
      if (first > 0) {
        const pct = Math.round(((last - first) / first) * 100);
        percentageChange = `${pct >= 0 ? "+" : ""}${pct}.0%`;
        isPositive = pct >= 0;
      } else if (last > 0) {
        percentageChange = "+100.0%";
        isPositive = true;
      } else {
        percentageChange = "0.0%";
        isPositive = true;
      }
    }

    return {
      data,
      percentageChange,
      isPositive,
      totalEarnings: total,
      periodLabel,
    };
  },

  /**
   * Fetches full real-time financial ledger overview for a farmer.
   */
  async getFarmerEarningsSummary(
    farmerId?: string,
    farmerSlug?: string
  ): Promise<FarmerEarningsSummary> {
    const now = new Date();
    const lastSyncedAt = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    let lifetimeEarned = 0;
    let pendingPayouts = 0;
    const monthly12Buckets = new Map<string, number>();

    // Prepare 12 month keys
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthly12Buckets.set(key, 0);
    }

    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

    let payoutHistory: PayoutHistoryItem[] = [];

    try {
      // 1. Fetch live orders & payouts from Supabase concurrently
      const [ordersRes, payoutsRes] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        farmerId
          ? supabase.from("farmer_payouts").select("*").eq("farmer_id", farmerId).order("period_end", { ascending: false })
          : Promise.resolve({ data: null, error: null }),
      ]);

      const allOrders = ordersRes.data || [];
      const dbPayouts = payoutsRes.data || [];

      // Process Payouts History
      payoutHistory = dbPayouts.map((p: any) => {
        const start = p.period_start ? new Date(p.period_start) : new Date();
        const end = p.period_end ? new Date(p.period_end) : new Date();
        const settled = p.settled_at ? new Date(p.settled_at) : null;

        const periodLabel = `${start.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`;
        const settlementDate = settled
          ? settled.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
          : end.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });

        return {
          id: p.id,
          settlementDate,
          periodLabel,
          periodStart: p.period_start,
          periodEnd: p.period_end,
          grossAmount: Number(p.gross_amount || 0),
          fees: Number(p.fees || 0),
          netAmount: Number(p.net_amount || 0),
          status: p.status || "scheduled",
          reference: p.reference || null,
          settledAt: p.settled_at || null,
        };
      });

      // Process Orders for this Farmer
      const farmerOrders = allOrders.filter((o: any) => {
        const rawItems: any[] = Array.isArray(o.items) ? o.items : [];
        return rawItems.some(
          (it: any) =>
            (farmerId && (it.farmer_id === farmerId || it.farmerId === farmerId)) ||
            (farmerSlug &&
              ((it.farmer_slug && String(it.farmer_slug).toLowerCase() === String(farmerSlug).toLowerCase()) ||
                (it.farmerSlug && String(it.farmerSlug).toLowerCase() === String(farmerSlug).toLowerCase())))
        );
      });

      farmerOrders.forEach((o: any) => {
        if (o.status === "cancelled") return;

        const rawItems: any[] = Array.isArray(o.items) ? o.items : [];
        const items = rawItems.filter(
          (it: any) =>
            (farmerId && (it.farmer_id === farmerId || it.farmerId === farmerId)) ||
            (farmerSlug &&
              ((it.farmer_slug && String(it.farmer_slug).toLowerCase() === String(farmerSlug).toLowerCase()) ||
                (it.farmerSlug && String(it.farmerSlug).toLowerCase() === String(farmerSlug).toLowerCase())))
        );

        const orderNet = items.reduce((sum: number, it: any) => {
          const qty = Number(it.qty || it.quantity || 1);
          const basePrice =
            Number(it.farmer_base_price || it.farmerBasePrice) ||
            Math.round(Number(it.price || it.unitPrice || 0) / 1.1);
          return sum + (Number(it.farmer_total) || basePrice * qty);
        }, 0);

        // Lifetime earned: completed / delivered orders or paid orders
        if (o.status === "delivered" || o.payment_status === "paid") {
          lifetimeEarned += orderNet;
        }

        // Pending payouts: orders accruing that have not yet been settled/paid out in past payout
        if (o.status !== "cancelled" && o.status !== "returned") {
          pendingPayouts += orderNet;
        }

        // Monthly bucket calculations
        if (o.created_at) {
          const d = new Date(o.created_at);
          if (!isNaN(d.getTime())) {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            if (monthly12Buckets.has(key)) {
              monthly12Buckets.set(key, (monthly12Buckets.get(key) || 0) + orderNet);
            }
          }
        }
      });
    } catch (err) {
      console.warn("[earningsService.getFarmerEarningsSummary] Database read note:", err);
    }

    // Include processed payouts in lifetime earnings if not duplicate
    const paidPayoutsSum = payoutHistory
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.netAmount, 0);

    lifetimeEarned = Math.max(lifetimeEarned, paidPayoutsSum);

    // Calculate 12-month average
    const nonZeroMonths = [...monthly12Buckets.values()].filter((v) => v > 0);
    const avgMonthly12Mo = nonZeroMonths.length > 0
      ? Math.round(nonZeroMonths.reduce((a, b) => a + b, 0) / nonZeroMonths.length)
      : (lifetimeEarned > 0 ? Math.round(lifetimeEarned / 12) : 0);

    // Month-over-month trend (only show if previous month has historical comparison data!)
    const thisMonthSales = monthly12Buckets.get(currentMonthKey) || 0;
    const prevMonthSales = monthly12Buckets.get(prevMonthKey) || 0;

    let monthOverMonthTrend: MonthOverMonthTrend | null = null;

    if (prevMonthSales > 0) {
      const diff = thisMonthSales - prevMonthSales;
      const pct = Math.round((diff / prevMonthSales) * 100);
      monthOverMonthTrend = {
        hasComparison: true,
        percentageChange: `${pct >= 0 ? "+" : ""}${pct}.0%`,
        isPositive: pct >= 0,
        label: `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct)}.0% vs last month`,
      };
    } else {
      // Hide comparison rather than fabricating a comparison
      monthOverMonthTrend = null;
    }

    const nextSettlement = calculateSettlementWindow(now, true, pendingPayouts);
    const upcomingSchedule = generateUpcomingSchedule(6, pendingPayouts);

    return {
      lifetimeEarned: Math.round(lifetimeEarned),
      lifetimeEarnedFormatted: inr(Math.round(lifetimeEarned)),
      pendingPayouts: Math.round(pendingPayouts),
      pendingPayoutsFormatted: inr(Math.round(pendingPayouts)),
      avgMonthly12Mo: Math.round(avgMonthly12Mo),
      avgMonthly12MoFormatted: inr(Math.round(avgMonthly12Mo)),
      monthOverMonthTrend,
      nextSettlement,
      upcomingSchedule,
      payoutHistory,
      lastSyncedAt,
    };
  },
};

