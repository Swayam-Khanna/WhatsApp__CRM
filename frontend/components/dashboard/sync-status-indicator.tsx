"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Wifi,
  WifiOff,
  Activity,
} from "lucide-react";
import { useSyncStatus } from "@/lib/sync/sync-status-context";

export function SyncStatusIndicator() {
  const {
    state,
    lastSuccessfulSync,
    relativeTimeText,
    exactTimeText,
    isOnline,
    isSyncing,
    isSlow,
    lastError,
    triggerResync,
  } = useSyncStatus();

  const [showTooltip, setShowTooltip] = useState(false);

  const handleRetryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerResync();
  };

  // 1. Synced State (Green)
  if (state === "synced") {
    return (
      <div
        className="relative inline-flex items-center"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <button
          type="button"
          onClick={() => triggerResync()}
          title="Click to refresh data"
          aria-label={`Data is synchronized. Synced ${relativeTimeText}`}
          className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer bg-emerald-50/80 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 hover:bg-emerald-100/90 shadow-2xs"
        >
          {isSyncing ? (
            <RotateCw className="h-2.5 w-2.5 text-emerald-600 animate-spin" />
          ) : (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
          )}
          <span className="font-subhead tracking-tight select-none">
            {isSyncing ? "Syncing..." : `Synced ${relativeTimeText}`}
          </span>
        </button>

        {/* Hover Diagnostic Tooltip */}
        {showTooltip && (
          <div className="absolute right-0 top-full mt-2 z-50 w-64 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-border shadow-xl text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Live Data Synchronized
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">🟢 Active</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Last synced at <strong className="text-foreground">{exactTimeText}</strong> ({relativeTimeText}).
            </p>
            <div className="pt-1.5 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Wifi className="h-3 w-3 text-emerald-600" /> Connected
              </span>
              <span>Click to force refresh</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Delayed / Slow State (Yellow / Amber)
  if (state === "delayed") {
    return (
      <div
        className="relative inline-flex items-center"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <button
          type="button"
          onClick={() => triggerResync()}
          title="Click to refresh data"
          aria-label={`Data synchronization delayed. Synced ${relativeTimeText}`}
          className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 shadow-2xs"
        >
          {isSyncing ? (
            <RotateCw className="h-2.5 w-2.5 text-amber-700 animate-spin" />
          ) : (
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
          )}
          <span className="font-subhead tracking-tight select-none">
            {isSlow
              ? "Syncing (slow)..."
              : isSyncing
              ? "Syncing..."
              : `Synced ${relativeTimeText}`}
          </span>
        </button>

        {/* Hover Diagnostic Tooltip */}
        {showTooltip && (
          <div className="absolute right-0 top-full mt-2 z-50 w-64 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-border shadow-xl text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {isSlow ? "Slow Network Response" : "Data Stale (>5m)"}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">🟡 Delayed</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {isSlow
                ? "Server is taking longer than usual to respond (>10s)."
                : `Last successful sync was at ${exactTimeText} (${relativeTimeText}).`}
            </p>
            <div className="pt-1.5 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-amber-600" /> Reconnecting
              </span>
              <span>Click to re-sync</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Failed State (Red / Error)
  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800/50 shadow-2xs"
      >
        <span className="h-2 w-2 rounded-full bg-red-600" />
        <span className="font-subhead tracking-tight select-none">
          {!isOnline ? "Offline" : "Sync failed"}
        </span>
        <span className="text-red-400">·</span>
        <button
          type="button"
          onClick={handleRetryClick}
          disabled={isSyncing}
          className="font-bold underline decoration-red-400 hover:text-red-950 dark:hover:text-white cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
        >
          {isSyncing ? (
            <RotateCw className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <span>Retry</span>
          )}
        </button>
      </div>

      {/* Hover Diagnostic Tooltip */}
      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-border shadow-xl text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
          <div className="flex items-center justify-between text-[11px] font-bold text-red-700 dark:text-red-400">
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Connection / Sync Error
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">🔴 Error</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {!isOnline
              ? "Your browser is currently offline. Please check your network connection."
              : lastError || "The latest data sync attempt timed out or failed."}
          </p>
          <div className="pt-1.5 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              {!isOnline ? <WifiOff className="h-3 w-3 text-red-600" /> : <Activity className="h-3 w-3 text-red-600" />}
              {lastSuccessfulSync ? `Last: ${exactTimeText}` : "No sync"}
            </span>
            <span className="text-red-600 font-bold">Click Retry</span>
          </div>
        </div>
      )}
    </div>
  );
}
