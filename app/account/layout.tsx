"use client";

import { createFileRoute, Outlet, useNavigate } from "@/lib/tanstack-compat";
import { useEffect } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { AccountSidebar } from "@/components/account/sidebar";
import { useAuth } from "@/hooks/use-auth";

function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth/login", search: { redirect: "/account" }, replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <MarketingLayout>
        <div className="container-prj grid place-items-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MarketingLayout>
    );
  }

  const displayName = user.name || user.email?.split("@")[0] || "User";

  return (
    <MarketingLayout>
      <div className="container-prj py-4 sm:py-8 md:py-12">
        {/* Mobile Top Navigation (Back button & Welcome) */}
        <div className="lg:hidden mb-5">
          <div className="flex items-center gap-3">
            {/* Top Left Back Button to Home (Mobile) */}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-secondary active:scale-95 shrink-0"
              aria-label="Back to Homepage"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>

            {/* User Greeting */}
            <div className="flex items-center gap-2 min-w-0 flex-1 pl-1">
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-display font-bold text-xs flex items-center justify-center shrink-0">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <p className="text-xs font-bold text-foreground truncate">
                Welcome, {displayName}
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Layout Grid */}
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          {/* Static Aside Sidebar only on Desktop (Hidden on Mobile) */}
          <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
            {/* Back to Home Button on Desktop */}
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition py-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Marketplace</span>
            </Link>

            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="px-3 py-2">
                <p className="font-subhead text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Signed in as
                </p>
                <p className="mt-1 truncate text-sm font-semibold">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <div className="my-2 border-t border-border" />
              <AccountSidebar />
            </div>
          </aside>

          {/* Main Account Content Area */}
          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </MarketingLayout>
  );
}

export default AccountLayout;
