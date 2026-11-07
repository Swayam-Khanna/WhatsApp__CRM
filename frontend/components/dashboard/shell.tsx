import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { Menu, X, ChevronDown, Lock, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Logo } from "@/components/brand/logo";
import { useAuth } from "@/hooks/use-auth";

export type NavSubItem = {
  to: string;
  label: string;
  icon?: ReactNode;
  badge?: number | string;
};

export type NavItem = {
  to?: string;
  label: string;
  icon: ReactNode;
  badge?: number | string;
  sectionHeader?: string;
  isSubItem?: boolean;
  children?: NavSubItem[];
  defaultOpen?: boolean;
  isLocked?: boolean;
};

import { GlobalSearch } from "@/components/dashboard/global-search";
import { SyncStatusIndicator } from "@/components/dashboard/sync-status-indicator";

export function DashboardShell({
  title,
  subtitle,
  nav,
  children,
}: {
  title: string;
  subtitle: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const qc = useQueryClient();

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("mock_admin_user");
        sessionStorage.clear();
      }
      await signOut();
      qc.clear();
      toast.success("Logged out successfully");
      router.push("/");
    } catch (err: any) {
      toast.error(err?.message || "Failed to logout");
      router.push("/");
    }
  };

  // State to track which expandable menu items are open
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  // Auto-expand any parent item whose child matches the active route
  useEffect(() => {
    nav.forEach((n, idx) => {
      if (n.children && n.children.length > 0) {
        const hasActiveChild = n.children.some(
          (c) =>
            pathname === c.to ||
            pathname === c.to.split("?")[0] ||
            (c.to !== "/admin/dashboard" && Boolean(pathname?.startsWith(c.to.split("?")[0])))
        );
        if (hasActiveChild || n.defaultOpen) {
          setExpandedKeys((prev) => ({
            ...prev,
            [n.label || String(idx)]: true,
          }));
        }
      }
    });
  }, [pathname, nav]);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="flex min-h-dvh bg-secondary/30">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 flex flex-col transform border-r border-border bg-background transition-transform md:static md:translate-x-0 overflow-y-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Logo />
          <button onClick={() => setOpen(false)} className="md:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          <p className="font-subhead text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </p>
          <p className="font-display mt-1 text-sm font-medium">{subtitle}</p>
        </div>
        <nav className="px-3 pb-6 space-y-1">
          {nav.map((n, idx) => {
            const itemKey = n.label || String(idx);
            const isExpandable = Array.isArray(n.children) && n.children.length > 0;
            const isExpanded = !!expandedKeys[itemKey];

            // Check if this item or any of its children are active
            const isParentActive = n.to
              ? pathname === n.to || pathname === n.to.split("?")[0]
              : false;
            const hasActiveChild = isExpandable
              ? n.children!.some(
                  (c) =>
                    pathname === c.to ||
                    pathname === c.to.split("?")[0] ||
                    (c.to !== "/admin/dashboard" && Boolean(pathname?.startsWith(c.to.split("?")[0])))
                )
              : false;

            const hasBadge = n.badge !== undefined && n.badge !== null && n.badge !== 0;

            return (
              <div key={itemKey + "_" + idx}>
                {n.sectionHeader && (
                  <div className="mt-4 mb-2 px-3">
                    <p className="font-subhead text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                      {n.sectionHeader}
                    </p>
                  </div>
                )}

                {isExpandable ? (
                  <div>
                    {/* Expandable Header Button */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(itemKey)}
                      className={`font-subhead w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-all cursor-pointer select-none ${
                        hasActiveChild
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={hasActiveChild ? "text-primary" : "text-muted-foreground"}>
                          {n.icon}
                        </span>
                        <span>{n.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasBadge && (
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300">
                            {n.badge}
                          </span>
                        )}
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                            isExpanded ? "rotate-180 text-foreground" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {/* Expandable Submenu Items */}
                    {isExpanded && (
                      <div className="ml-4 pl-3 border-l-2 border-primary/20 space-y-1 my-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        {n.children!.map((child, cIdx) => {
                          const childActive =
                            pathname === child.to || pathname === child.to.split("?")[0];
                          const childHasBadge =
                            child.badge !== undefined && child.badge !== null && child.badge !== 0;

                          return (
                            <Link
                              key={child.to + "_" + cIdx}
                              href={child.to}
                              onClick={() => setOpen(false)}
                              className={`font-subhead flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                                childActive
                                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                  : "text-foreground/75 hover:bg-secondary hover:text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                {child.icon ? (
                                  <span className={childActive ? "" : "text-muted-foreground"}>
                                    {child.icon}
                                  </span>
                                ) : (
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      childActive ? "bg-white" : "bg-muted-foreground/60"
                                    }`}
                                  />
                                )}
                                <span>{child.label}</span>
                              </div>
                              {childHasBadge && (
                                <span
                                  className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    childActive
                                      ? "bg-white/20 text-white"
                                      : "bg-secondary text-foreground"
                                  }`}
                                >
                                  {child.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Standard Link Item */
                  <Link
                    href={n.to || "#"}
                    onClick={() => setOpen(false)}
                    className={`font-subhead flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      n.isSubItem ? "ml-3 pl-2.5 text-[13px]" : ""
                    } ${
                      isParentActive
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-foreground/75 hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isParentActive ? "" : "text-muted-foreground"}>
                        {n.icon}
                      </span>
                      <span>{n.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto">
                      {n.isLocked && (
                        <span title="Locked until Prajnaa Onboarding is verified" className="text-amber-700/80 dark:text-amber-400 flex items-center">
                          <Lock className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {hasBadge && (
                        <span
                          className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isParentActive
                              ? "bg-background text-foreground"
                              : "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}
                        >
                          {n.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
        <div className="mt-auto px-4 pb-5 pt-2 space-y-3">
          {/* Help & Support Card */}
          <div className="rounded-2xl border border-border/80 bg-secondary/50 p-3.5 text-center space-y-2">
            <p className="font-display text-xs font-bold text-foreground">Need Help?</p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Our team is here to help you
            </p>
            <Link
              href="/contact"
              className="font-subhead inline-flex items-center justify-center gap-1.5 w-full rounded-xl border border-border/80 bg-background py-1.5 px-3 text-xs font-medium text-foreground hover:bg-secondary transition shadow-2xs"
            >
              🎧 Contact Support
            </Link>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between">
            <Link
              href="/"
              className="font-subhead text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            >
              ← Back to store
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="font-subhead text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1 transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/85 px-5 backdrop-blur md:px-8">
          <button onClick={() => setOpen(true)} className="md:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-base font-medium hidden sm:block">{subtitle}</h1>
          <div className="flex-1 max-w-md mx-2">
            <GlobalSearch />
          </div>
          <div className="shrink-0 flex items-center">
            <SyncStatusIndicator />
          </div>
        </header>
        <main className="flex-1 p-5 md:p-8">{children}</main>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  deltaTone = "up",
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "up" | "down";
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <p className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="font-display mt-2 text-3xl font-semibold">{value}</p>
      {delta && (
        <p
          className={`font-subhead mt-1 text-xs ${deltaTone === "up" ? "text-success" : "text-destructive"}`}
        >
          {delta}
        </p>
      )}
    </div>
  );
}
