"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { MarketingLayout } from "@/components/marketing/layout";
import { Loader2 } from "lucide-react";

export default function TrackOrderDeepLinkPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  useEffect(() => {
    if (orderId) {
      router.replace(`/track-order?orderId=${encodeURIComponent(orderId)}`);
    } else {
      router.replace("/track-order");
    }
  }, [orderId, router]);

  return (
    <MarketingLayout>
      <div className="min-h-[70vh] grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="font-subhead text-sm text-muted-foreground font-medium">
            Redirecting to order tracking...
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
}
