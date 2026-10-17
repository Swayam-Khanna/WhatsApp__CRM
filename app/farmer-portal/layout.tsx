"use client";

import {
  createFileRoute,
  Outlet,
  useNavigate,
  Link,
  useRouterState,
  usePathname,
} from "@/lib/tanstack-compat";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingBag,
  IndianRupee,
  User,
  Loader2,
  AlertCircle,
  Award,
  ShieldCheck,
  ClipboardCheck,
  MessageSquare,
  Settings,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardShell, type NavItem } from "@/components/dashboard/shell";
import { useAuth } from "@/hooks/use-auth";
import { useFarmerProfile } from "@/lib/farmer/use-farmer";
import { useVerificationStatus } from "@/lib/farmer/use-verification-status";
import { MarketingLayout } from "@/components/marketing/layout";
import { messagingService } from "@/lib/services/messagingService";

function FarmerPortalShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { data: farmer, isLoading: farmerLoading } = useFarmerProfile();
  const { isLocked } = useVerificationStatus();

  // Query unread messages count for this farmer
  const { data: unreadData } = useQuery({
    enabled: !!farmer?.id,
    queryKey: ["farmer-unread-messages", farmer?.id],
    queryFn: () => messagingService.getUnreadCounts(farmer?.id),
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth/login", search: { redirect: pathname || "/farmer-portal/dashboard" }, replace: true });
      return;
    }
  }, [authLoading, user, navigate, pathname]);

  if (authLoading || (user && farmerLoading)) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return null;

  if (!farmer) {
    return (
      <MarketingLayout>
        <div className="container-prj py-20 max-w-xl">
          <h1 className="font-display text-3xl font-semibold">Become a seller first</h1>
          <p className="mt-2 text-muted-foreground">
            Complete the short registration so we can verify your farm.
          </p>
          <Link
            to="/become-a-seller/register"
            className="font-subhead mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Start registration
          </Link>
        </div>
      </MarketingLayout>
    );
  }

  const visibleNav: NavItem[] = [
    {
      to: "/farmer-portal/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      to: "/farmer-portal/onboarding",
      label: "Prajnaa Onboarding",
      icon: <ClipboardCheck className="h-4 w-4" />,
    },
    {
      to: "/farmer-portal/products",
      label: "Products",
      icon: <Package className="h-4 w-4" />,
      isLocked,
    },
    {
      to: "/farmer-portal/inventory",
      label: "Inventory",
      icon: <Boxes className="h-4 w-4" />,
      isLocked,
    },
    {
      to: "/farmer-portal/orders",
      label: "Orders",
      icon: <ShoppingBag className="h-4 w-4" />,
      isLocked,
    },
    {
      to: "/farmer-portal/earnings",
      label: "Earnings",
      icon: <IndianRupee className="h-4 w-4" />,
      isLocked,
    },
    {
      to: "/farmer-portal/messages",
      label: "Messages",
      icon: <MessageSquare className="h-4 w-4" />,
      badge: unreadData?.unreadForFarmer ? unreadData.unreadForFarmer : undefined,
    },
    {
      to: "/farmer-portal/profile",
      label: "My Profile",
      icon: <User className="h-4 w-4" />,
    },
    {
      to: "/farmer-portal/settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  return (
    <DashboardShell
      title="PORTAL"
      subtitle={`${farmer.farm_name || farmer.village || "Farmer Portal"}`}
      nav={visibleNav}
    >
      {farmer.status !== "approved" && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 text-warning" />
          <div className="text-sm">
            <p className="font-medium capitalize">Application {farmer.status}</p>
            <p className="text-muted-foreground">
              {farmer.status === "draft" && "Finish your registration to submit for review."}
              {farmer.status === "pending" &&
                "We're reviewing your application. You'll get full access once approved."}
              {farmer.status === "rejected" &&
                (farmer.rejection_reason || "Please contact support.")}
              {farmer.status === "suspended" && "Your account is suspended. Contact support."}
            </p>
            {farmer.status === "draft" && (
              <Link
                to="/become-a-seller/register"
                className="font-subhead mt-2 inline-block text-xs text-primary"
              >
                Continue registration →
              </Link>
            )}
          </div>
        </div>
      )}
      {farmer.status === "approved" &&
        (!farmer.portrait_url ||
          !farmer.kishan_pehchan_patra ||
          !farmer.khasra_numbers ||
          !farmer.cultivated_area) && (
          <div className="mb-6 flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-warning/30 bg-warning/10 p-5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div className="flex-1 text-sm">
            <p className="font-semibold text-warning-foreground mb-1">Action Required: Complete your profile credentials</p>
            <p className="text-muted-foreground leading-relaxed">
              Prajnaa Marketplace now requires a Profile Picture, Kishan Pehchan Patra (Farmer ID), and detailed Land details (Khasra numbers, cultivated area) for all active farmers. Please complete your profile to keep your account fully compliant.
            </p>
          </div>
          <Link
            to="/farmer-portal/profile"
            className="shrink-0 mt-3 sm:mt-0 rounded-full bg-warning/20 px-4 py-2.5 text-xs font-semibold text-warning-foreground hover:bg-warning/30 transition-colors"
          >
            Update Profile
          </Link>
        </div>
      )}

      {children}
    </DashboardShell>
  );
}

export default FarmerPortalShell;
