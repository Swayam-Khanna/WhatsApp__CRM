"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { PrajnaaCopilot } from "@/components/copilot/prajnaa-copilot";
import { FarmerCopilot } from "@/components/copilot/farmer-copilot";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { SyncStatusProvider } from "@/lib/sync/sync-status-context";

function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SyncStatusProvider>
        <AuthProvider>
          <ScrollToTop />
          {children}
          <Toaster richColors position="top-center" />
          <PrajnaaCopilot />
          <FarmerCopilot />
        </AuthProvider>
      </SyncStatusProvider>
    </QueryClientProvider>
  );
}

