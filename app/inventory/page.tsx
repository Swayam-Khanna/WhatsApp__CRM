"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RootInventoryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/farmer-portal/inventory");
  }, [router]);

  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-[#0F3D2E]" />
        <span className="text-xs font-semibold text-muted-foreground">
          Redirecting to Inventory Control...
        </span>
      </div>
    </div>
  );
}
