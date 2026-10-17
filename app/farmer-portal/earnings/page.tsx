"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CreditCard,
  ShieldCheck,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFarmerProfile } from "@/lib/farmer/use-farmer";
import { useVerificationStatus } from "@/lib/farmer/use-verification-status";
import { LockedSectionBanner } from "@/components/farmer/locked-section-banner";
import { inr } from "@/lib/format";
import {
  earningsService,
  type FarmerEarningsSummary,
  type SettlementCycle,
  type PayoutHistoryItem,
} from "@/lib/services/earningsService";

export default function FarmerEarningsPage() {
  const { data: farmer, isLoading: isProfileLoading } = useFarmerProfile();
  const { isLocked } = useVerificationStatus();
  const qc = useQueryClient();

  const farmerId = farmer?.id || undefined;
  const farmerSlug = farmer?.slug || undefined;

  // Pagination for Recent Payout History
  const [payoutPage, setPayoutPage] = useState(1);
  const pageSize = 5;

  // Query full real-time earnings summary
  const {
    data: summary,
    isLoading: isSummaryLoading,
    isRefetching,
    refetch,
  } = useQuery<FarmerEarningsSummary>({
    queryKey: ["farmer-earnings-summary", farmerId, farmerSlug],
    queryFn: () => earningsService.getFarmerEarningsSummary(farmerId, farmerSlug),
    staleTime: 10000,
    refetchInterval: 10000,
  });

  // Real-time Supabase socket listeners on orders, settlements, and payouts
  useEffect(() => {
    if (!farmer) return;

    const channel = supabase
      .channel("farmer-earnings-live-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          qc.invalidateQueries({ queryKey: ["farmer-earnings-summary"] });
          qc.invalidateQueries({ queryKey: ["farmer-dashboard-stats"] });
          qc.invalidateQueries({ queryKey: ["farmer-earnings-chart"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "farmer_payouts",
        },
        (payload: any) => {
          qc.invalidateQueries({ queryKey: ["farmer-earnings-summary"] });
          if (payload.eventType === "UPDATE" && payload.new?.status === "paid") {
            toast.success("💰 Bank settlement transfer marked as Paid by Admin!", {
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    const handleStorage = (e: StorageEvent) => {
      if (e.key && (e.key.startsWith("mock_order_") || e.key.includes("farmer_profile"))) {
        qc.invalidateQueries({ queryKey: ["farmer-earnings-summary"] });
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("storage", handleStorage);
    };
  }, [farmer, qc]);

  // Derived Payout History Pagination
  const allPayouts = summary?.payoutHistory || [];
  const totalPayoutCount = allPayouts.length;
  const totalPages = Math.max(1, Math.ceil(totalPayoutCount / pageSize));
  const paginatedPayouts = useMemo(() => {
    const start = (payoutPage - 1) * pageSize;
    return allPayouts.slice(start, start + pageSize);
  }, [allPayouts, payoutPage, pageSize]);

  const nextSettlement = summary?.nextSettlement;
  const upcomingSchedule = summary?.upcomingSchedule || [];
  const trend = summary?.monthOverMonthTrend;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION                                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Earnings
          </h2>
          <p className="font-subhead text-xs sm:text-sm text-muted-foreground mt-1">
            Sales from each calendar month settle to your bank account between the{" "}
            <strong className="text-foreground font-semibold">7th and 10th</strong> of the following month.
          </p>
        </div>

        {summary?.lastSyncedAt && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-medium text-muted-foreground bg-secondary/60 border border-border/80 px-2.5 py-1 rounded-full">
              Updated {summary.lastSyncedAt}
            </span>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
              title="Refresh earnings data"
              aria-label="Refresh earnings data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        )}
      </div>

      {isLocked && (
        <LockedSectionBanner
          sectionName="Earnings & Settlements"
          description="Settlement payouts, bank transfer history, and net earnings are locked until your Prajnaa Onboarding is verified."
        />
      )}

      {/* ========================================================================= */}
      {/* 2. HERO STAT SPREAD (SINGLE CONTAINER WITH HAIRLINE DIVIDERS)             */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-border/80 bg-white overflow-hidden shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 divide-y sm:divide-y-0 sm:divide-x divide-border/70">
        {/* Dominant Card: Lifetime Earned */}
        <div className="lg:col-span-4 p-6 sm:p-7 bg-[#0F3D2E]/[0.025] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-subhead text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Lifetime Earned
            </span>
            {trend && trend.hasComparison && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full select-none ${
                  trend.isPositive
                    ? "text-emerald-700 bg-emerald-50 border border-emerald-200/60"
                    : "text-amber-700 bg-amber-50 border border-amber-200/60"
                }`}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{trend.percentageChange} vs last mo</span>
              </span>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              {isSummaryLoading ? "—" : summary?.lifetimeEarnedFormatted || "₹0"}
            </h3>
            <p className="text-xs text-muted-foreground font-medium">
              All-time verified net produce earnings
            </p>
          </div>
        </div>

        {/* Secondary Card: Pending Payouts */}
        <div className="lg:col-span-3 p-6 sm:p-7 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-subhead text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Pending Payouts
            </span>
            <div className="h-6 w-6 rounded-lg bg-amber-50 text-amber-700 grid place-items-center">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {isSummaryLoading ? "—" : summary?.pendingPayoutsFormatted || "₹0"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Accruing un-settled order balance
            </p>
          </div>
        </div>

        {/* Secondary Card: Avg Monthly (12 mo) */}
        <div className="lg:col-span-2 p-6 sm:p-7 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-subhead text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Avg Monthly
            </span>
            <div className="h-6 w-6 rounded-lg bg-[#0F3D2E]/10 text-[#0F3D2E] grid place-items-center">
              <Wallet className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {isSummaryLoading ? "—" : summary?.avgMonthly12MoFormatted || "₹0"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Trailing 12-mo average
            </p>
          </div>
        </div>

        {/* Secondary Card: Bank Account */}
        <div className="lg:col-span-3 p-6 sm:p-7 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-subhead text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Bank Account
            </span>
            <div className="h-6 w-6 rounded-lg bg-[#F5EBE1] text-[#8D5B28] grid place-items-center">
              <Landmark className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {farmer?.bank_account_number
                ? `•••• ${farmer.bank_account_number.slice(-4)}`
                : "Not linked"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {farmer?.bank_name ? (
                <span className="font-medium text-foreground">{farmer.bank_name}</span>
              ) : (
                <Link
                  href="/farmer-portal/settings"
                  className="font-semibold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1 hover:underline"
                >
                  Add in Settings <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. NEXT SETTLEMENT CARD (TWO-PART STUB LAYOUT WITH PROGRESS BAR)          */}
      {/* ========================================================================= */}
      {nextSettlement && (
        <div className="rounded-3xl border border-border/80 bg-white overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-12">
          {/* Left Stub */}
          <div className="md:col-span-4 p-6 sm:p-7 bg-[#FAF8F5] border-b md:border-b-0 md:border-r border-dashed border-border/80 flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-subhead text-[10px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100/80 px-2.5 py-0.5 rounded-md">
                  Next Settlement
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Monthly Cycle
                </span>
              </div>

              <div className="pt-1">
                <h4 className="font-display text-lg sm:text-xl font-bold text-foreground">
                  {nextSettlement.fullWindowFormatted}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Scheduled disbursement transfer
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Direct NEFT/RTGS to linked bank</span>
            </div>
          </div>

          {/* Right Body */}
          <div className="md:col-span-8 p-6 sm:p-7 flex flex-col justify-between space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="font-subhead text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Coverage Window
                </span>
                <p className="font-display text-base sm:text-lg font-bold text-foreground">
                  {nextSettlement.fullPeriodFormatted}
                </p>
                <p className="text-xs text-muted-foreground">
                  Includes all verified orders completed within this calendar period.
                </p>
              </div>

              <div className="sm:text-right space-y-0.5">
                <span className="font-subhead text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Estimated Amount
                </span>
                <p className="font-display text-2xl sm:text-3xl font-bold text-[#0F3D2E]">
                  {nextSettlement.estimatedAmountFormatted || "₹0"}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Still accruing from active sales
                </p>
              </div>
            </div>

            {/* Computed Progress Bar */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="font-subhead text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Settlement Timeline
                </span>
                <span className="font-semibold text-foreground">
                  {nextSettlement.progressLabel} ({nextSettlement.progressPercent}%)
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
                <div
                  className="h-full bg-[#0F3D2E] transition-all duration-500 rounded-full"
                  style={{ width: `${nextSettlement.progressPercent}%` }}
                />
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Settlement cycle locks on the 1st of each month. Payouts are executed directly to your verified bank account by Prajnaa Super Admin.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. UPCOMING SETTLEMENT SCHEDULE (LEDGER ROWS)                             */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-border/80 bg-white overflow-hidden shadow-xs">
        <div className="p-6 border-b border-border/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-secondary/80 text-foreground grid place-items-center">
              <Calendar className="h-4 w-4 text-[#0F3D2E]" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                Upcoming Settlement Schedule
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Standard 6-month disbursement timetable for verified produce sales.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border/80 font-subhead uppercase tracking-wider text-muted-foreground text-[10px] bg-secondary/30">
                <th className="py-3 px-6 font-bold">SETTLEMENT WINDOW</th>
                <th className="py-3 px-6 font-bold">COVERED SALES PERIOD</th>
                <th className="py-3 px-6 font-bold">ESTIMATED AMOUNT</th>
                <th className="py-3 px-6 text-right font-bold">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {upcomingSchedule.map((cycle, index) => {
                const isNext = cycle.isNext;
                return (
                  <tr
                    key={index}
                    className={`transition-colors hover:bg-secondary/40 ${
                      isNext ? "bg-emerald-50/40" : ""
                    }`}
                  >
                    <td className="py-4 px-6 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{cycle.fullWindowFormatted}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground font-medium">
                      {cycle.periodStartFormatted} – {cycle.periodEndFormatted}
                    </td>
                    <td className="py-4 px-6 font-semibold text-foreground">
                      {isNext ? (
                        <span className="font-bold text-[#0F3D2E]">
                          {cycle.estimatedAmountFormatted}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/70 italic font-normal">
                          — pending —
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {isNext ? (
                        <span className="font-subhead inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/50 px-2.5 py-0.5 text-[10px] font-bold">
                          Next
                        </span>
                      ) : (
                        <span className="font-subhead inline-flex items-center gap-1 rounded-full bg-secondary/80 text-muted-foreground px-2.5 py-0.5 text-[10px] font-medium">
                          Scheduled
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. RECENT PAYOUT HISTORY (MATCHING LEDGER STYLE & PAGINATION)              */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-border/80 bg-white overflow-hidden shadow-xs">
        <div className="p-6 border-b border-border/80 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-bold text-foreground">
              Recent Payout History
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Completed bank disbursement receipts and electronic UTR reference records.
            </p>
          </div>

          <div className="text-xs text-muted-foreground font-medium">
            {totalPayoutCount} total record{totalPayoutCount === 1 ? "" : "s"}
          </div>
        </div>

        {isSummaryLoading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#0F3D2E]" />
          </div>
        ) : allPayouts.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Landmark className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <h4 className="font-display text-sm font-bold text-foreground">
              No payout history yet
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Once you fulfill orders and monthly cycles conclude, processed settlement receipts and bank transfer UTR numbers will be archived here.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border/80 font-subhead uppercase tracking-wider text-muted-foreground text-[10px] bg-secondary/30">
                    <th className="py-3 px-6 font-bold">SETTLEMENT DATE</th>
                    <th className="py-3 px-6 font-bold">SALES PERIOD</th>
                    <th className="py-3 px-6 font-bold">GROSS</th>
                    <th className="py-3 px-6 font-bold">FEES</th>
                    <th className="py-3 px-6 font-bold">NET PAID</th>
                    <th className="py-3 px-6 font-bold">STATUS</th>
                    <th className="py-3 px-6 text-right font-bold">UTR / REFERENCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedPayouts.map((payout) => (
                    <tr
                      key={payout.id}
                      className="hover:bg-secondary/40 transition-colors"
                    >
                      <td className="py-4 px-6 font-semibold text-foreground">
                        {payout.settlementDate}
                      </td>
                      <td className="py-4 px-6 text-muted-foreground font-medium">
                        {payout.periodLabel}
                      </td>
                      <td className="py-4 px-6 text-foreground font-medium">
                        {inr(payout.grossAmount)}
                      </td>
                      <td className="py-4 px-6 text-muted-foreground">
                        {inr(payout.fees)}
                      </td>
                      <td className="py-4 px-6 font-bold text-[#0F3D2E]">
                        {inr(payout.netAmount)}
                      </td>
                      <td className="py-4 px-6">
                        {payout.status === "paid" ? (
                          <span className="font-subhead inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-0.5 text-[10px] font-bold">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </span>
                        ) : payout.status === "processing" ? (
                          <span className="font-subhead inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 px-2.5 py-0.5 text-[10px] font-bold">
                            <Clock className="h-3 w-3" /> Processing
                          </span>
                        ) : (
                          <span className="font-subhead inline-flex items-center gap-1 rounded-full bg-secondary text-muted-foreground px-2.5 py-0.5 text-[10px] font-medium capitalize">
                            <Clock className="h-3 w-3" /> {payout.status}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-xs text-muted-foreground">
                        {payout.reference || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground bg-secondary/20">
                <span>
                  Showing {(payoutPage - 1) * pageSize + 1} to{" "}
                  {Math.min(payoutPage * pageSize, totalPayoutCount)} of {totalPayoutCount} payouts
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPayoutPage((prev) => Math.max(1, prev - 1))}
                    disabled={payoutPage === 1}
                    className="p-1.5 rounded-lg border border-border bg-white text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="font-semibold text-foreground px-1">
                    {payoutPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPayoutPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={payoutPage === totalPages}
                    className="p-1.5 rounded-lg border border-border bg-white text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
