"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFarmerProfile } from "@/lib/farmer/use-farmer";
import { useVerificationStatus } from "@/lib/farmer/use-verification-status";
import { LockedSectionBanner } from "@/components/farmer/locked-section-banner";
import { orderService } from "@/lib/services/orderService";
import { FarmerOrdersReportTable } from "@/components/farmer/farmer-orders-report-table";

function FarmerOrdersPage() {
  const { data: farmer } = useFarmerProfile();
  const { isLocked } = useVerificationStatus();
  const qc = useQueryClient();

  // Fetch strictly scoped live orders
  const {
    data: orders = [],
    isLoading,
  } = useQuery({
    enabled: !!farmer?.id || !!farmer?.slug,
    queryKey: ["farmer-scoped-orders", farmer?.id, farmer?.slug],
    queryFn: () => orderService.getFarmerOrders(farmer?.id, farmer?.slug || undefined),
    refetchInterval: 10000, // 10s polling fallback
  });

  // Real-time Supabase event listener for Admin status updates & new customer orders
  useEffect(() => {
    if (!farmer) return;

    const channel = supabase
      .channel("farmer-orders-live-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload: any) => {
          qc.invalidateQueries({ queryKey: ["farmer-scoped-orders"] });
          qc.invalidateQueries({ queryKey: ["farmer-dashboard-stats"] });
          qc.invalidateQueries({ queryKey: ["farmer-recent-orders"] });
          qc.invalidateQueries({ queryKey: ["farmer-listings-summary"] });

          if (payload.eventType === "INSERT") {
            const rawItems: any[] = Array.isArray(payload.new?.items) ? payload.new.items : [];
            const hasMyProduce = rawItems.some(
              (it: any) =>
                it.farmer_id === farmer.id ||
                it.farmer_slug === farmer.slug ||
                it.farmerSlug === farmer.slug
            );
            if (hasMyProduce) {
              const displayCode = payload.new.order_id || `#ORD-${payload.new.id?.slice(0, 8)}`;
              toast.success(`🎉 New customer order received! (${displayCode})`, {
                duration: 6000,
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const newStatus = payload.new?.status;
            if (newStatus) {
              toast.info(`Order status updated to "${newStatus}" by Admin.`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [farmer, qc]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Fulfillment Orders
          </h2>
          <p className="font-subhead text-xs sm:text-sm text-muted-foreground mt-1">
            Read-only status monitor. Fulfillment, packaging, and dispatch are managed exclusively by Prajnaa Super Admin.
          </p>
        </div>
      </div>

      {isLocked && (
        <LockedSectionBanner
          sectionName="Customer Orders & Fulfillment"
          description="Customer order tracking and payout processing are locked until your Prajnaa Onboarding is verified."
        />
      )}

      {/* Orders Report Table */}
      <FarmerOrdersReportTable orders={orders} isLoading={isLoading} />
    </div>
  );
}

export default FarmerOrdersPage;
