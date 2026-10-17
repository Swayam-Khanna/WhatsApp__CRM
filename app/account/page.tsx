"use client";

import { createFileRoute, Link } from "@/lib/tanstack-compat";
import { useEffect, useState } from "react";
import { ShoppingBag, Heart, MapPin, CreditCard, Bell, Star, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AccountPageHeader } from "@/components/account/page-header";
import { inr } from "@/lib/format";

type Counts = {
  orders: number;
  wishlist: number;
  addresses: number;
  reviews: number;
};

function AccountOverview() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Counts>({
    orders: 0,
    wishlist: 0,
    addresses: 0,
    reviews: 0,
  });
  const [fullName, setFullName] = useState<string>("");
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // Fetch profile + counts via API routes
        const [profileRes, ordersRes, wishlistRes, addressesRes, reviewsRes] = await Promise.all([
          fetch("/api/account/profile"),
          fetch("/api/orders?limit=50"),
          fetch("/api/account/wishlist"),
          fetch("/api/account/addresses"),
          fetch("/api/account/reviews"),
        ]);

        const [profileData, ordersData, wishlistData, addressesData, reviewsData] = await Promise.all([
          profileRes.ok ? profileRes.json() : { data: null },
          ordersRes.ok ? ordersRes.json() : { data: [] },
          wishlistRes.ok ? wishlistRes.json() : { data: [] },
          addressesRes.ok ? addressesRes.json() : { data: [] },
          reviewsRes.ok ? reviewsRes.json() : { data: [] },
        ]);

        const ordersList: any[] = ordersData.data ?? [];
        setFullName(profileData?.data?.full_name ?? "");
        setRecentOrders(ordersList);
        setCounts({
          orders: ordersList.length,
          wishlist: (wishlistData.data ?? []).length,
          addresses: (addressesData.data ?? []).length,
          reviews: (reviewsData.data ?? []).length,
        });
      } catch (err) {
        console.warn("[AccountOverview] fetch error:", err);
      }
    })();
  }, [user]);

  const displayName = fullName || user?.name || user?.email?.split("@")[0] || "there";
  const recent = recentOrders.slice(0, 3);

  const cards = [
    {
      to: "/account/orders",
      label: "Your orders",
      icon: ShoppingBag,
      value: `${counts.orders} total`,
      hint: "Track, return, or buy again",
    },
    {
      to: "/account/wishlist",
      label: "Wishlist",
      icon: Heart,
      value: `${counts.wishlist} saved`,
      hint: "Items you love",
    },
    {
      to: "/account/addresses",
      label: "Addresses",
      icon: MapPin,
      value: `${counts.addresses} on file`,
      hint: "Manage delivery addresses",
    },
    {
      to: "/account/reviews",
      label: "Your reviews",
      icon: Star,
      value: `${counts.reviews} written`,
      hint: "Edit your ratings",
    },
    {
      to: "/account/notifications",
      label: "Notifications",
      icon: Bell,
      value: "Preferences",
      hint: "Email & SMS settings",
    },
  ] as const;

  return (
    <>
      <AccountPageHeader
        eyebrow="Account"
        title={`Welcome back, ${displayName}.`}
        description="Manage your orders, addresses, and personal information."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ to, label, icon: Icon, value, hint }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-card/80"
          >
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="font-display mt-4 text-base font-semibold">{label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{value}</p>
            <p className="mt-3 text-xs text-muted-foreground">{hint}</p>
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold">Recent orders</h2>
          <Link to="/account/orders" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="space-y-3">
          {recent.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">You haven't placed any orders yet.</p>
              <Link
                to="/shop"
                className="font-subhead mt-3 inline-block rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Explore products
              </Link>
            </div>
          ) : (
            recent.map((o) => {
              const displayDate = o.created_at
                ? new Date(o.created_at).toLocaleDateString("en-IN")
                : "Recent";
              const orderId = o.order_id || o.id;
              return (
                <Link
                  key={o.id}
                  to="/orders/$id"
                  params={{ id: o.id }}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary/40"
                >
                  <div>
                    <p className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {displayDate} · {o.status}
                    </p>
                    <p className="font-display mt-1 text-sm font-medium">Order {orderId}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.items?.length || 0} item(s) · {o.payment_method || "COD"}
                    </p>
                  </div>
                  <p className="font-display text-base font-semibold">{inr(o.total)}</p>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}

export default AccountOverview;
