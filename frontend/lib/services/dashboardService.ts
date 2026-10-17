import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/format";

export interface DashboardStats {
  lifetimeEarnings: number;
  lifetimeEarningsFormatted: string;
  incomingOrdersCount: number;
  awaitingConfirmationCount: number;
  activeListingsCount: number;
  liveProductsCount: number;
  nextPayoutAmount: number;
  nextPayoutFormatted: string;
  nextPayoutExpectedDate: string;
}

export interface AccreditationInfo {
  isVerified: boolean;
  statusText: string;
  certificateNumber?: string;
  showOnProfile?: boolean;
}

export const dashboardService = {
  async getDashboardStats(farmerId?: string, farmerSlug?: string): Promise<DashboardStats> {
    try {
      if (farmerId || farmerSlug) {
        const [productsRes, payoutsRes, ordersRes] = await Promise.all([
          farmerId
            ? supabase.from("farmer_products").select("id, status, stock").eq("farmer_id", farmerId)
            : Promise.resolve({ data: null, error: null }),
          farmerId
            ? supabase.from("farmer_payouts").select("*").eq("farmer_id", farmerId).order("period_end", { ascending: false }).limit(1)
            : Promise.resolve({ data: null, error: null }),
          supabase.from("orders").select("*").order("created_at", { ascending: false }),
        ]);

        const products = productsRes.data ?? [];
        const payouts = payoutsRes.data ?? [];
        const allOrders = ordersRes.data ?? [];

        // Filter orders for this farmer
        const farmerOrders = farmerSlug
          ? allOrders.filter((o: any) => o.items?.some((item: any) => item.farmer_slug === farmerSlug || item.farmerSlug === farmerSlug))
          : [];

        // Calculate lifetime earnings (delivered orders minus returns)
        let lifetime = 0;
        let awaitingConfirmation = 0;

        farmerOrders.forEach((o: any) => {
          const farmerItems = o.items?.filter((i: any) => i.farmer_slug === farmerSlug || i.farmerSlug === farmerSlug) || [];
          const orderTotal = farmerItems.reduce((acc: number, item: any) => {
            const basePrice = item.farmer_base_price || Number(item.price || 0) / 1.1;
            return acc + basePrice * Number(item.qty || 1);
          }, 0);

          if (o.status === "delivered") {
            lifetime += orderTotal;
          } else if (o.status === "returned") {
            lifetime -= orderTotal;
          }

          if (o.status === "pending" || o.status === "processing" || o.status === "confirmed" || o.status === "cod_pending" || o.status === "pending_manual_payment") {
            awaitingConfirmation++;
          }
        });

        const activeListings = products.filter((p: any) => p.status === "published").length;
        const liveProducts = products.filter((p: any) => (p.stock || 0) > 0 && p.status === "published").length;
        const nextPayout = payouts.find((p: any) => p.status !== "paid");
        const nextPayoutAmount = nextPayout ? Number(nextPayout.net_amount || 0) : (lifetime > 0 ? Math.round(lifetime * 0.25) : 0);

        const nextDate = nextPayout?.period_end
          ? new Date(nextPayout.period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
          : nextPayoutAmount > 0
          ? "Upcoming Cycle"
          : "No scheduled payout";

        const validLifetime = Math.max(0, Math.round(lifetime));

        return {
          lifetimeEarnings: validLifetime,
          lifetimeEarningsFormatted: inr(validLifetime),
          incomingOrdersCount: farmerOrders.length,
          awaitingConfirmationCount: awaitingConfirmation,
          activeListingsCount: activeListings,
          liveProductsCount: liveProducts,
          nextPayoutAmount: nextPayoutAmount,
          nextPayoutFormatted: inr(nextPayoutAmount),
          nextPayoutExpectedDate: nextDate,
        };
      }
    } catch (err) {
      console.warn("[dashboardService.getDashboardStats] Error fetching DB stats:", err);
    }

    // Default zero state for fresh or unconfigured account
    return {
      lifetimeEarnings: 0,
      lifetimeEarningsFormatted: "₹0",
      incomingOrdersCount: 0,
      awaitingConfirmationCount: 0,
      activeListingsCount: 0,
      liveProductsCount: 0,
      nextPayoutAmount: 0,
      nextPayoutFormatted: "₹0",
      nextPayoutExpectedDate: "No scheduled payout",
    };
  },

  async getAccreditation(farmerId?: string, farmerSlug?: string): Promise<AccreditationInfo> {
    try {
      if (farmerId || farmerSlug) {
        const res = await fetch(`/api/farmer/certificate?farmer_id=${farmerId || ""}&slug=${farmerSlug || ""}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.data) {
            const cert = json.data;
            const isVerified = cert.status === "ACTIVE";
            return {
              isVerified,
              statusText: isVerified ? "ACCREDITATION VERIFIED" : (cert.status || "ACCREDITATION PENDING"),
              certificateNumber: cert.certificate_number || undefined,
              showOnProfile: cert.show_on_profile ?? false,
            };
          }
        }
      }
    } catch (err) {
      console.warn("[dashboardService.getAccreditation] Error fetching cert:", err);
    }

    return {
      isVerified: false,
      statusText: "ACCREDITATION PENDING",
      certificateNumber: undefined,
      showOnProfile: false,
    };
  },
};
