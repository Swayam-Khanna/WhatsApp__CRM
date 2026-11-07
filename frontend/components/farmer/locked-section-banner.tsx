"use client";

import Link from "next/link";
import { Lock, Clock, AlertCircle, Sparkles, ArrowRight, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useVerificationStatus } from "@/lib/farmer/use-verification-status";

interface LockedSectionBannerProps {
  sectionName: string;
  description?: string;
}

export function LockedSectionBanner({
  sectionName,
  description,
}: LockedSectionBannerProps) {
  const {
    status,
    isPendingReview,
    isRejected,
    isNotStarted,
    rejectionReason,
    completedRequiredCount,
    requiredSectionsCount,
    missingSections,
  } = useVerificationStatus();

  return (
    <div className="rounded-3xl border border-[#e5ded0] bg-[#faf8f5] p-6 md:p-8 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border-b border-[#ece4d6] pb-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0F3D2E] text-white shadow-xs">
            {isPendingReview ? (
              <Clock className="h-6 w-6 text-amber-300 animate-pulse" />
            ) : isRejected ? (
              <ShieldAlert className="h-6 w-6 text-rose-300" />
            ) : (
              <Lock className="h-6 w-6 text-[#D4AF37]" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg sm:text-xl font-bold text-foreground">
                {sectionName} — Access Locked
              </h3>
              <span
                className={`font-subhead rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  isPendingReview
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40"
                    : isRejected
                    ? "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300 border border-rose-300/40"
                    : "bg-secondary text-muted-foreground border border-border"
                }`}
              >
                {isPendingReview
                  ? "Under Review"
                  : isRejected
                  ? "Action Required"
                  : `${completedRequiredCount}/${requiredSectionsCount} Onboarding Done`}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {description ||
                (isPendingReview
                  ? "Your Prajnaa farmer application is currently under administrative review. This usually takes 1-2 business days. Once verified, this section will unlock automatically."
                  : isRejected
                  ? "Your application was rejected by the admin team. Please review the reason below and update your onboarding details to resubmit."
                  : `Complete your Prajnaa Onboarding to start selling. ${sectionName} will be unlocked once your farm details, KYC identity, and payout bank accounts are completed and approved.`)}
            </p>
          </div>
        </div>

        <Link
          href="/farmer-portal/onboarding"
          className="font-subhead inline-flex items-center gap-2 rounded-full bg-[#0F3D2E] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#154d3b] transition-all shadow-xs shrink-0 cursor-pointer"
        >
          {isRejected
            ? "Edit & Resubmit Onboarding"
            : isPendingReview
            ? "View Onboarding Status"
            : "Go to Prajnaa Onboarding"}{" "}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Specific Alert Box if Rejected */}
      {isRejected && rejectionReason && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 dark:bg-rose-950/20 dark:border-rose-900/40 p-4.5 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300">
            <AlertCircle className="h-4 w-4" /> Reason for Rejection
          </div>
          <p className="text-rose-700 dark:text-rose-200 leading-relaxed pl-5.5">
            {rejectionReason}
          </p>
        </div>
      )}

      {/* Missing Sections Checklist for not_started */}
      {isNotStarted && missingSections.length > 0 && (
        <div className="grid gap-2.5 sm:grid-cols-3 pt-1">
          {[
            { name: "Farm Details", desc: "Location, land size & crops" },
            { name: "KYC Identity", desc: "Aadhaar & PAN verification" },
            { name: "Bank Details", desc: "Account number & IFSC for payouts" },
          ].map((step) => {
            const isMissing = missingSections.some((m) =>
              step.name.toLowerCase().includes(m.toLowerCase().split(" ")[0]),
            );
            return (
              <div
                key={step.name}
                className={`rounded-2xl border p-3.5 text-xs transition-colors ${
                  isMissing
                    ? "border-[#fae2b8] bg-[#fdf6e7]/60 text-[#8f580b]"
                    : "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {isMissing ? (
                    <Lock className="h-3.5 w-3.5 text-amber-700" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                  <span>{step.name}</span>
                </div>
                <p className="text-[11px] opacity-80 mt-1">{step.desc}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
