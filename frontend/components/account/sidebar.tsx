import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Heart,
  MapPin,
  CreditCard,
  User,
  Lock,
  Bell,
  Clock,
  Star,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/lib/admin/use-admin";
import { useFarmerProfile } from "@/lib/farmer/use-farmer";
import { Sprout } from "lucide-react";
import { toast } from "sonner";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

export const accountNav: NavItem[] = [
  { to: "/account", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/account/orders", label: "Your orders", icon: ShoppingBag },
  { to: "/account/wishlist", label: "Wishlist", icon: Heart },
  { to: "/account/addresses", label: "Addresses", icon: MapPin },
  { to: "/account/payments", label: "Payment methods", icon: CreditCard },
  { to: "/account/profile", label: "Login & profile", icon: User },
  { to: "/account/security", label: "Security", icon: Lock },
  { to: "/account/notifications", label: "Notifications", icon: Bell },
  { to: "/account/recently-viewed", label: "Recently viewed", icon: Clock },
  { to: "/account/reviews", label: "Your reviews", icon: Star },
];

export function AccountSidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { data: farmerProfile } = useFarmerProfile();
  const router = useRouter();

  return (
    <nav aria-label="Account navigation" className="flex flex-col gap-1">
      {isAdmin && (
        <Link
          href="/admin/dashboard"
          onClick={onNavigate}
          className="mb-2 flex items-center gap-3 rounded-xl bg-[#0F3D2E] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#154d3b] transition-all"
        >
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          <span>Admin Dashboard</span>
        </Link>
      )}
      {farmerProfile && (
        <Link
          href="/farmer-portal/dashboard"
          onClick={onNavigate}
          className="mb-2 flex items-center gap-3 rounded-xl bg-amber-950/20 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-500/30 px-3.5 py-2.5 text-sm font-semibold shadow-sm hover:bg-amber-900/30 transition-all"
        >
          <Sprout className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>Farmer Portal</span>
        </Link>
      )}
      {accountNav.map(({ to, label, icon: Icon, exact }) => {
        const active = exact ? pathname === to : pathname === to || Boolean(pathname?.startsWith(to + "/"));
        return (
          <Link
            key={to}
            href={to}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
              active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-secondary"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="font-medium">{label}</span>
          </Link>
        );
      })}
      <button
        onClick={async () => {
          onNavigate?.();
          localStorage.removeItem("mock_admin_user");
          await signOut();
          toast.success("Signed out");
          router.push("/");
        }}
        className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        <span className="font-medium">Sign out</span>
      </button>
    </nav>
  );
}
