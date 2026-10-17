"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createFileRoute, Link } from "@/lib/tanstack-compat";
import { ArrowRight, Sprout } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { useFarmerProfile } from "@/lib/farmer/use-farmer";

export default function FarmerLoginPage() {
  const router = useRouter();
  const { data: farmer, isLoading } = useFarmerProfile();

  useEffect(() => {
    if (!isLoading && farmer) {
      router.replace("/farmer-portal/dashboard");
    }
  }, [farmer, isLoading, router]);

  if (farmer) {
    return (
      <MarketingLayout>
        <div className="container-prj py-24 flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground font-subhead uppercase tracking-wider">
              Redirecting to Farmer Dashboard...
            </p>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <section className="container-prj pt-6 md:pt-8">
        <div className="grid items-start gap-10 md:grid-cols-2">
          <div>
            <p className="font-subhead text-xs uppercase tracking-[0.18em] text-primary">
              For farmers
            </p>
            <h1 className="font-display mt-1.5 text-3xl font-semibold leading-tight md:text-4xl">
              Your soil. Our&nbsp;storefront.
            </h1>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Reach customers across India without the supermarket cut. We handle the storefront,
              payments, and logistics — you focus on growing.
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {[
                "Zero listing fees — keep more of every rupee",
                "Monthly settlements between the 7th–10th",
                "Pan-India logistics partners",
                "A dedicated story page that markets you",
                "Direct dashboard for orders, stock, and earnings",
              ].map((b) => (
                <li key={b} className="font-subhead flex items-start gap-3">
                  <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <svg
                      className="h-3 w-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/farmer-portal/dashboard"
                className="font-subhead inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                See farmer portal <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/farmers"
                className="font-subhead inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-secondary"
              >
                Meet our farmers
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-secondary/40 p-6 md:p-8 shadow-sm">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary mb-3">
                <Sprout className="h-3.5 w-3.5" />
                <span>Farmer Onboarding</span>
              </div>
              <h2 className="font-display text-2xl font-semibold">Join as a Partner Farmer</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Quick 30-second signup — complete your farm details at your own pace.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                <li>• Instant access to your Farmer Dashboard</li>
                <li>• Progressive Farm, KYC & Bank details setup</li>
                <li>• Dedicated support for organic cultivators</li>
                <li>• Direct monthly payouts to your bank account</li>
              </ul>
              <Link
                to="/become-a-seller/register"
                className="font-subhead mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 transition shadow-sm"
              >
                Get Started in 30 Seconds <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Free account creation · No hidden charges
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-prj mt-12 pb-16">
        <h2 className="font-display text-2xl md:text-3xl font-semibold">How it works</h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ["01", "Apply", "Tell us about your farm. We review within 48 hours."],
            ["02", "Onboard", "We help you photograph products and set up your story page."],
            ["03", "Sell", "Manage everything from your dashboard. We pay you monthly."],
          ].map(([n, t, d]) => (
            <li key={n} className="rounded-2xl border border-border bg-background p-6">
              <p className="font-display text-3xl text-primary">{n}</p>
              <h3 className="font-display mt-3 text-lg font-medium">{t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
      </section>
    </MarketingLayout>
  );
}
