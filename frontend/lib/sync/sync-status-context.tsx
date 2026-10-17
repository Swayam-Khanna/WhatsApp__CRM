"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SyncState = "synced" | "delayed" | "failed" | "syncing";

// Defined freshness and health thresholds (in milliseconds)
export const SYNC_THRESHOLDS = {
  FRESH_THRESHOLD_MS: 5 * 60 * 1000, // < 5 mins = Green (Synced)
  STALE_THRESHOLD_MS: 15 * 60 * 1000, // 5–15 mins = Yellow (Delayed), >15 mins = Failed/Stale
  SLOW_SYNC_TIMEOUT_MS: 10 * 1000, // > 10s pending fetch = Yellow warning
  EVALUATION_INTERVAL_MS: 10 * 1000, // Recompute time elapsed every 10 seconds
} as const;

export interface SyncStatusContextValue {
  state: SyncState;
  lastSuccessfulSync: Date | null;
  relativeTimeText: string;
  exactTimeText: string;
  isOnline: boolean;
  isSyncing: boolean;
  isSlow: boolean;
  lastError: string | null;
  triggerResync: () => Promise<void>;
  reportSuccess: (timestamp?: Date) => void;
  reportFailure: (errorMsg?: string) => void;
}

const SyncStatusContext = createContext<SyncStatusContextValue | null>(null);

/**
 * Format relative duration from timestamp to human friendly label
 */
export function formatSyncRelativeTime(date: Date | null): string {
  if (!date) return "never";

  const diffMs = Math.max(0, Date.now() - date.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  if (diffSec < 45) {
    return "just now";
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function SyncStatusProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  // Initialize with the current time (page load/mount timestamp)
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<Date | null>(() => new Date());
  const [lastError, setLastError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSlow, setIsSlow] = useState<boolean>(false);
  const [tick, setTick] = useState<number>(0);

  const slowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeFetchesCountRef = useRef<number>(0);

  // Manual report hooks
  const reportSuccess = useCallback((timestamp: Date = new Date()) => {
    setLastSuccessfulSync(timestamp);
    setLastError(null);
    setIsSlow(false);
  }, []);

  const reportFailure = useCallback((errorMsg?: string) => {
    setLastError(errorMsg || "Network request failed");
    setIsSlow(false);
  }, []);

  // Manual / Retry re-sync trigger
  const triggerResync = useCallback(async () => {
    setIsSyncing(true);
    setIsSlow(false);

    // Start slow timeout detector for manual resync
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => {
      setIsSlow(true);
    }, SYNC_THRESHOLDS.SLOW_SYNC_TIMEOUT_MS);

    try {
      // Check browser network status first
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("No internet connection available");
      }

      // Ping Supabase realtime channel or basic check
      const start = Date.now();
      const [queryResult] = await Promise.allSettled([
        qc.refetchQueries({ type: "active" }),
        supabase.from("orders").select("id").limit(1).maybeSingle(),
      ]);

      if (queryResult.status === "rejected") {
        throw queryResult.reason || new Error("Sync failed");
      }

      reportSuccess(new Date());
    } catch (err: any) {
      reportFailure(err?.message || "Sync attempt failed");
    } finally {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setIsSyncing(false);
      setIsSlow(false);
    }
  }, [qc, reportSuccess, reportFailure]);

  // 1. Subscribe to TanStack QueryCache with debounced state sync
  useEffect(() => {
    const queryCache = qc.getQueryCache();
    let debounceTimer: NodeJS.Timeout | null = null;

    const unsubscribe = queryCache.subscribe((event) => {
      if (!event) return;

      if (event.type === "updated" && event.action?.type === "fetch") {
        activeFetchesCountRef.current += 1;
        if (!isSyncing) setIsSyncing(true);

        if (!slowTimerRef.current) {
          slowTimerRef.current = setTimeout(() => {
            if (activeFetchesCountRef.current > 0) {
              setIsSlow(true);
            }
          }, SYNC_THRESHOLDS.SLOW_SYNC_TIMEOUT_MS);
        }
      }

      if (event.type === "updated" && (event.action?.type === "success" || event.action?.type === "error")) {
        activeFetchesCountRef.current = Math.max(0, activeFetchesCountRef.current - 1);
        
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (activeFetchesCountRef.current === 0) {
            setIsSyncing(false);
            setIsSlow(false);
            if (slowTimerRef.current) {
              clearTimeout(slowTimerRef.current);
              slowTimerRef.current = null;
            }
          }
          if (event.action?.type === "success") {
            reportSuccess(new Date());
          }
        }, 150);
      }
    });

    return () => {
      unsubscribe();
      if (debounceTimer) clearTimeout(debounceTimer);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [qc, isSyncing, reportSuccess]);

  // 2. Listen for window online / offline events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      setLastError(null);
      triggerResync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastError("Device is offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [triggerResync]);

  // 3. Regular evaluation timer (runs every 30 seconds only when tab is visible)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setTick((t) => t + 1);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // 4. Compute effective state based on rules & thresholds
  const computeState = (): SyncState => {
    if (!isOnline || lastError !== null) {
      return "failed";
    }

    if (isSlow) {
      return "delayed";
    }

    if (!lastSuccessfulSync) {
      return "failed";
    }

    const elapsedMs = Date.now() - lastSuccessfulSync.getTime();

    if (elapsedMs < SYNC_THRESHOLDS.FRESH_THRESHOLD_MS) {
      return "synced";
    }

    if (elapsedMs < SYNC_THRESHOLDS.STALE_THRESHOLD_MS) {
      return "delayed";
    }

    return "failed";
  };

  const state = computeState();
  const relativeTimeText = formatSyncRelativeTime(lastSuccessfulSync);
  const exactTimeText = lastSuccessfulSync
    ? lastSuccessfulSync.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "No recent sync";

  return (
    <SyncStatusContext.Provider
      value={{
        state,
        lastSuccessfulSync,
        relativeTimeText,
        exactTimeText,
        isOnline,
        isSyncing,
        isSlow,
        lastError,
        triggerResync,
        reportSuccess,
        reportFailure,
      }}
    >
      {children}
    </SyncStatusContext.Provider>
  );
}

export function useSyncStatus(): SyncStatusContextValue {
  const context = useContext(SyncStatusContext);
  if (!context) {
    throw new Error("useSyncStatus must be used within a SyncStatusProvider");
  }
  return context;
}
