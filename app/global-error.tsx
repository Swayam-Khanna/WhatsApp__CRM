"use client";

import { useEffect } from "react";

export default function GlobalRootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Root Error]:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="grid min-h-dvh place-items-center bg-stone-50 p-6 font-sans">
        <div className="max-w-md w-full rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-lg space-y-4">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-100 text-red-600">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold text-stone-900">Application Error</h2>
            <p className="mt-2 text-xs text-stone-500 leading-relaxed">
              A temporary runtime exception occurred. Click below to reload the platform.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.reload();
                } else {
                  reset();
                }
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0F3D2E] px-5 py-2.5 text-xs font-bold text-white hover:opacity-90 transition cursor-pointer shadow-sm"
            >
              Reload Platform
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
