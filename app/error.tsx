"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Uncaught Client Exception Caught by Boundary]:", error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="max-w-md w-full rounded-3xl border border-border bg-secondary/30 p-8 text-center shadow-lg space-y-4">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-7 w-7" />
        </div>

        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Something went wrong</h2>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            An unexpected loading issue occurred. You can reload this page or return to the main store.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-[11px] font-mono text-left break-words overflow-auto max-h-32">
            {error.message}
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="font-subhead inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition shadow-sm cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </button>
          <Link
            href="/"
            className="font-subhead inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-xs font-bold text-foreground hover:bg-secondary transition shadow-sm"
          >
            <Home className="h-4 w-4" />
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
