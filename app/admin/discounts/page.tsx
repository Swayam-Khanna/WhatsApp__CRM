"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import AdminCouponsPage from "../coupons/page";
import { Ticket, Tag, Sparkles, Plus, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AdminDiscountsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  const [activeTab, setActiveTab] = useState<"coupons" | "automatic">(
    tabParam === "automatic" ? "automatic" : "coupons"
  );

  useEffect(() => {
    if (tabParam === "automatic") {
      setActiveTab("automatic");
    } else {
      setActiveTab("coupons");
    }
  }, [tabParam]);

  return (
    <div className="space-y-6">
      {/* Header Tabs matching Wix Discounts structure */}
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Discounts & Promotions
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure promotional coupon codes and automatic checkout volume rules.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 p-1">
          <button
            onClick={() => setActiveTab("coupons")}
            className={`font-subhead inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === "coupons"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Ticket className="h-3.5 w-3.5" />
            Coupons
          </button>
          <button
            onClick={() => setActiveTab("automatic")}
            className={`font-subhead inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === "automatic"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            Automatic Discounts
          </button>
        </div>
      </div>

      {activeTab === "coupons" ? (
        <AdminCouponsPage />
      ) : (
        /* Automatic Discounts Tab (Wix sibling discounts view) */
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-3xl border border-border bg-background p-8 text-center max-w-xl mx-auto space-y-4">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-foreground">Automatic Cart Discounts</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Automatic discounts apply directly in the customer cart without requiring a manual coupon code (e.g. Free shipping above ₹999, Tiered volume bundle savings, or First-order automatic deductions).
              </p>
            </div>

            {/* Current Active Auto Rules */}
            <div className="text-left rounded-2xl border border-border/80 bg-secondary/30 p-4 space-y-3">
              <p className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-bold">
                Active Storefront Automatic Rules
              </p>
              <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/60">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">Free Shipping Above ₹999</p>
                  <p className="text-[11px] text-muted-foreground">Applies automatically to all non-express delivery parcels across India.</p>
                </div>
                <span className="font-subhead text-[11px] font-bold text-success bg-success/15 px-2.5 py-0.5 rounded-full">
                  Live
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveTab("coupons")}
                className="font-subhead inline-flex items-center gap-2 rounded-full bg-[#0F3D2E] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#154d3b] transition cursor-pointer"
              >
                Manage Promo Coupons Instead <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
