"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { useNavigate } from "@/lib/tanstack-compat";
import { Loader2 } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";

function OrderSuccessFallbackContent() {
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams?.get("orderId") || searchParams?.get("id");

  useEffect(() => {
    if (orderId) {
      navigate({ to: `/order-success/${encodeURIComponent(orderId)}`, replace: true });
    } else {
      navigate({ to: "/account", replace: true });
    }
  }, [orderId, navigate]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-[#8B3A1A]" />
    </div>
  );
}

export default function OrderSuccessFallbackPage() {
  return (
    <MarketingLayout>
      <Suspense
        fallback={
          <div className="min-h-[50vh] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#8B3A1A]" />
          </div>
        }
      >
        <OrderSuccessFallbackContent />
      </Suspense>
    </MarketingLayout>
  );
}

