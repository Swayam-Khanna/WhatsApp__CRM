"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

interface CancelOrderDialogProps {
  isOpen: boolean;
  orderId: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function CancelOrderDialog({
  isOpen,
  orderId,
  onClose,
  onConfirm,
}: CancelOrderDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3 border-b border-border pb-3">
          <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-bold text-base text-foreground">
              Cancel Order #{orderId}?
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cancelling this order will restore reserved product stock to farmers and update the payment status. This action cannot be undone.
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Cancellation Reason <span className="text-destructive">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Customer requested cancellation via phone, item unavailable, address out of reach..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-destructive transition"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 text-xs rounded-xl border border-border text-muted-foreground hover:bg-secondary font-medium transition cursor-pointer"
            >
              Keep Order
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-destructive text-destructive-foreground hover:opacity-90 active:scale-[0.98] transition cursor-pointer disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel Order"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
