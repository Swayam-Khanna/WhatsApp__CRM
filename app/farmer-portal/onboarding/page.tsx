"use client";

import { ProfileCompletionCard } from "@/components/farmer/profile-completion-card";
import { useFarmerProfile } from "@/lib/farmer/use-farmer";
import { Sparkles, ShieldCheck, ArrowLeft, ArrowRight, UserCheck } from "lucide-react";
import Link from "next/link";

export default function FarmerOnboardingPage() {
  const { data: farmer } = useFarmerProfile();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-subhead text-xs font-bold uppercase tracking-wider text-primary">
              Seller Verification & Setup
            </span>
          </div>
          <h2 className="font-display mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            Prajnaa Farmer Onboarding
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete your farm details, KYC identity verification, bank payout setup, and farm story.
          </p>
        </div>

        <Link
          href="/farmer-portal/dashboard"
          className="font-subhead inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>
      </div>

      {/* 4-Step Verification Form */}
      <ProfileCompletionCard />
    </div>
  );
}
