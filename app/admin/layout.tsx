"use client";

import { createFileRoute, Outlet, useNavigate, Link, usePathname } from "@/lib/tanstack-compat";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingBag,
  UserCog,
  Ticket,
  Tag,
  Image,
  Wallet,
  Settings,
  Loader2,
  ShieldOff,
  ShieldCheck,
  Activity,
  Truck,
  MessageSquare,
  BookOpen,
  Award,
  Layers,
  HardDrive,
  QrCode,
  Send,
  TrendingUp,
} from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/dashboard/shell";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin, hasPermission } from "@/lib/admin/use-admin";
import { useFarmerProfile } from "@/lib/farmer/use-farmer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { messagingService } from "@/lib/services/messagingService";

const allNavItems: NavItem[] = [
  // 1. Insights
  {
    to: "/admin/dashboard",
    label: "Overview",
    icon: <LayoutDashboard className="h-4 w-4" />,
    sectionHeader: "Insights",
  },
  {
    to: "/admin/live-traffic",
    label: "Live visitor traffic",
    icon: <Activity className="h-4 w-4" />,
  },

  // 2. Dedicated Prajnaa WhatsApp CRM
  {
    to: "/admin/whatsapp-crm/inbox",
    label: "WhatsApp CRM",
    icon: <MessageSquare className="h-4 w-4 text-emerald-600" />,
    sectionHeader: "WhatsApp CRM",
    badge: "Live",
    defaultOpen: true,
    children: [
      {
        to: "/admin/whatsapp-crm/inbox",
        label: "Shared Inbox",
        icon: <MessageSquare className="h-3.5 w-3.5" />,
      },
      {
        to: "/admin/whatsapp-crm/fulfillment",
        label: "Packaging & Dispatch (2-3d)",
        icon: <Package className="h-3.5 w-3.5" />,
      },
      {
        to: "/admin/whatsapp-crm/broadcasts",
        label: "Broadcast Campaigns",
        icon: <Send className="h-3.5 w-3.5" />,
      },
      {
        to: "/admin/whatsapp-crm/payments",
        label: "Payment QR & Verification",
        icon: <QrCode className="h-3.5 w-3.5" />,
      },
      {
        to: "/admin/whatsapp-crm/tracking",
        label: "Shipping & Tracking",
        icon: <Truck className="h-3.5 w-3.5" />,
      },
      {
        to: "/admin/leads",
        label: "Leads & Sales",
        icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />,
        badge: "New",
      },
    ],
  },

  // 2. Sell
  {
    to: "/admin/products",
    label: "Product catalog",
    icon: <Package className="h-4 w-4" />,
    sectionHeader: "Sell",
  },
  {
    to: "/admin/inventory",
    label: "Inventory",
    icon: <Layers className="h-4 w-4" />,
    badge: "New",
  },
  {
    to: "/admin/orders",
    label: "Orders & fulfillment",
    icon: <ShoppingBag className="h-4 w-4" />,
  },
  {
    to: "/admin/shipping",
    label: "Shipping & packaging",
    icon: <Truck className="h-4 w-4" />,
  },

  // 3. People
  {
    to: "/admin/vendors",
    label: "Farmers & showcase",
    icon: <Users className="h-4 w-4" />,
    sectionHeader: "People",
  },
  {
    to: "/admin/vendors?tab=certificates",
    label: "Farmer Certificates",
    icon: <Award className="h-4 w-4" />,
  },
  {
    to: "/admin/verification-queue",
    label: "Verification Queue",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    to: "/admin/customers",
    label: "Customer directory",
    icon: <UserCog className="h-4 w-4" />,
  },
  {
    to: "/admin/messages",
    label: "Farmer inquiries",
    icon: <MessageSquare className="h-4 w-4" />,
  },

  // 4. Marketing
  {
    to: "/admin/coupons",
    label: "Coupons & discounts",
    icon: <Ticket className="h-4 w-4" />,
    sectionHeader: "Marketing",
  },
  {
    to: "/admin/discounts",
    label: "Discount rules",
    icon: <Tag className="h-4 w-4" />,
  },
  {
    to: "/admin/banners",
    label: "Promotional banners",
    icon: <Image className="h-4 w-4" />,
  },
  {
    to: "/admin/journal",
    label: "Journal & stories",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    to: "/admin/reviews",
    label: "Product reviews",
    icon: <MessageSquare className="h-4 w-4" />,
  },

  // 5. Money
  {
    to: "/admin/settlements",
    label: "Settlements & payouts",
    icon: <Wallet className="h-4 w-4" />,
    sectionHeader: "Money",
  },

  // 6. System
  {
    to: "/admin/media",
    label: "Media & Folders",
    icon: <HardDrive className="h-4 w-4" />,
    sectionHeader: "System",
  },
  {
    to: "/admin/settings",
    label: "Admin settings",
    icon: <Settings className="h-4 w-4" />,
  },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const pathname = usePathname();
  const qc = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, roleLevel = "super_admin", isLoading: roleLoading } = useIsAdmin();
  const { data: farmerProfile } = useFarmerProfile();

  // Fetch badges at top level so hook count never changes between renders (Fixes React Error #310)
  const { data: countsData } = useQuery({
    queryKey: ["admin-reviews-counts"],
    enabled: !!user && !!isAdmin,
    queryFn: async () => {
      try {
        const res = await fetch("/api/admin/reviews/counts");
        if (!res.ok) return { counts: { pending: 0 } };
        return res.json();
      } catch (e) {
        return { counts: { pending: 0 } };
      }
    },
    refetchInterval: 15000,
  });

  const { data: unreadMessagesData } = useQuery({
    queryKey: ["admin-unread-messages"],
    enabled: !!user && !!isAdmin,
    queryFn: () => messagingService.getUnreadCounts(),
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth/login", search: { redirect: pathname || "/admin/dashboard" }, replace: true });
  }, [authLoading, user, navigate, pathname]);

  if (authLoading || (user && roleLoading)) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="grid min-h-dvh place-items-center bg-secondary/30 p-6">
        <div className="max-w-md w-full rounded-3xl border border-border bg-background p-8 text-center shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-destructive/10 text-destructive mb-2 shadow-inner">
            <ShieldOff className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
            Cannot Access
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The Admin Panel is strictly restricted. Only authorized administrator accounts are permitted to view or manage this portal.
          </p>
          {user?.email && (
            <div className="p-3 rounded-2xl bg-secondary/60 border border-border text-xs font-mono text-muted-foreground">
              Logged in as: <span className="text-foreground font-semibold block mt-0.5">{user.email}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              to="/auth/login"
              params={{ redirect: "/admin/dashboard" }}
              className="font-subhead inline-flex items-center justify-center gap-2 rounded-full bg-[#0F3D2E] px-5 py-3 text-sm font-semibold text-white hover:bg-[#154d3b] transition-all shadow-sm cursor-pointer"
            >
              Sign in with Authorized Admin Email
            </Link>

            {farmerProfile ? (
              <Link
                to="/farmer-portal/dashboard"
                className="font-subhead inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Go to Farmer Portal
              </Link>
            ) : (
              <Link
                to="/account"
                className="font-subhead inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Go to My Account
              </Link>
            )}

            <Link
              to="/"
              className="font-subhead inline-flex items-center justify-center rounded-full px-5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Return to Main Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pendingCount = countsData?.counts?.pending || 0;
  const adminUnreadTotal = unreadMessagesData?.unreadForAdminTotal || 0;

  const navWithBadges = (allNavItems || []).map((n) => {
    if (n.to === "/admin/reviews") {
      return { ...n, badge: pendingCount > 0 ? pendingCount : undefined };
    }
    if (n.to === "/admin/messages") {
      return { ...n, badge: adminUnreadTotal > 0 ? adminUnreadTotal : undefined };
    }
    return n;
  });

  const currentRole = roleLevel || "super_admin";
  const filteredNav = navWithBadges
    .map((n) => {
      if (n.children && n.children.length > 0) {
        const permittedChildren = n.children.filter((c) => hasPermission(currentRole, c.to));
        if (permittedChildren.length === 0) return null;
        return { ...n, children: permittedChildren };
      }
      if (n.to && !hasPermission(currentRole, n.to)) return null;
      return n;
    })
    .filter(Boolean) as NavItem[];
  const roleDisplay = (currentRole || "super_admin").replace(/_/g, " ").toUpperCase();

  return (
    <DashboardShell title="Admin" subtitle={`Prajnaa Farm · ${roleDisplay}`} nav={filteredNav}>
      {children}
    </DashboardShell>
  );
}

export default AdminShell;
