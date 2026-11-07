"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function WhatsAppCrmRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/whatsapp-crm/inbox");
  }, [router]);

  return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm">Loading Prajnaa WhatsApp CRM...</p>
      </div>
    </div>
  );
}
