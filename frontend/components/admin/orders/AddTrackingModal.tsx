"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Truck,
  AlertTriangle,
  Mail,
  MessageSquare,
  Package,
  Calendar,
  ExternalLink,
  Eye,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { SUPPORTED_CARRIERS, validateTrackingNumber, getCarrierTrackingUrl } from "@/lib/orders/order-carriers";
import { inr } from "@/lib/format";
import { OrderShipment } from "@/lib/orders/order-constants";

interface AddTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  editShipment?: OrderShipment | null;
  onSave: (data: {
    shipment_action: "add_shipment" | "edit_shipment";
    shipment_id?: string;
    carrier: string;
    tracking_number: string;
    tracking_url?: string;
    delivery_date?: string;
    delivery_route?: string;
    item_ids?: string[];
    notified_email?: boolean;
    notified_whatsapp?: boolean;
    ship_anyway?: boolean;
    override_reason?: string;
  }) => Promise<boolean>;
}

export function AddTrackingModal({
  isOpen,
  onClose,
  order,
  editShipment,
  onSave,
}: AddTrackingModalProps) {
  const isEdit = Boolean(editShipment);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Form State
  const [carrier, setCarrier] = useState(editShipment?.carrier || "Delhivery");
  const [trackingNumber, setTrackingNumber] = useState(editShipment?.tracking_number || "");
  const [trackingUrl, setTrackingUrl] = useState(editShipment?.tracking_url || "");
  const [deliveryRoute, setDeliveryRoute] = useState(order?.delivery_route || "Direct Courier");
  const [deliveryDate, setDeliveryDate] = useState(
    order?.delivery_date ? order.delivery_date.split("T")[0] : ""
  );

  // Checkboxes
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [applyToAll, setApplyToAll] = useState(true);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Override WhatsApp Payment
  const [shipAnyway, setShipAnyway] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  // UI & Validation
  const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // WhatsApp Payment status check
  const isWhatsApp = String(order?.payment_method || "").toLowerCase().trim() === "whatsapp";
  const isPaymentPaid = String(order?.payment_status || "").toLowerCase().trim() === "paid";
  const isWhatsAppPaymentUnconfirmed = isWhatsApp && !isPaymentPaid;

  const orderItems: any[] = Array.isArray(order?.items) ? order.items : [];
  const unshippedItems = orderItems.filter((it, idx) => {
    if (isEdit && editShipment) {
      return !it.shipment_id || it.shipment_id === editShipment.id;
    }
    return !it.shipment_id;
  });
  const shippableItems = unshippedItems.length > 0 ? unshippedItems : orderItems;

  // Pre-order items check
  const hasPreOrderItems = orderItems.some(
    (it, idx) =>
      (applyToAll || selectedItemIds.includes(String(it.id || idx))) &&
      (it.is_preorder || it.preorder || it.preOrderNote || it.expected_dispatch_date)
  );

  // Reset form when modal opens or editShipment changes
  useEffect(() => {
    if (isOpen) {
      if (editShipment) {
        setCarrier(editShipment.carrier || "Delhivery");
        setTrackingNumber(editShipment.tracking_number || "");
        setTrackingUrl(editShipment.tracking_url || "");
        setSendEmail(editShipment.notified_email ?? true);
        setSendWhatsApp(editShipment.notified_whatsapp ?? false);
        setApplyToAll(false);
        setSelectedItemIds(editShipment.item_ids || []);
      } else {
        setCarrier("Delhivery");
        setTrackingNumber("");
        setTrackingUrl("");
        setSendEmail(true);
        setSendWhatsApp(false);
        setApplyToAll(true);
        setSelectedItemIds(shippableItems.map((it, idx) => String(it.id || idx)));
      }
      setShipAnyway(false);
      setOverrideReason("");
      setInlineErrors({});

      // Auto-focus first input
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, editShipment]);

  // Trap focus & close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCarrierChange = (newCarrier: string) => {
    setCarrier(newCarrier);
    const resolved = getCarrierTrackingUrl(newCarrier, trackingNumber, null);
    if (resolved) {
      setTrackingUrl(resolved);
    }
    if (inlineErrors.carrier) {
      setInlineErrors((prev) => ({ ...prev, carrier: "" }));
    }
  };

  const handleTrackingNumberChange = (val: string) => {
    setTrackingNumber(val);
    const resolved = getCarrierTrackingUrl(carrier, val, null);
    if (resolved) {
      setTrackingUrl(resolved);
    }
    if (inlineErrors.trackingNumber) {
      setInlineErrors((prev) => ({ ...prev, trackingNumber: "" }));
    }
  };

  const toggleItemSelection = (idKey: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(idKey) ? prev.filter((id) => id !== idKey) : [...prev, idKey]
    );
    if (inlineErrors.items) {
      setInlineErrors((prev) => ({ ...prev, items: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    // Validate Tracking Number
    const trkCheck = validateTrackingNumber(trackingNumber);
    if (!trkCheck.valid) {
      errors.trackingNumber = trkCheck.error || "Invalid tracking number";
    }

    // Validate Carrier
    if (!carrier.trim()) {
      errors.carrier = "Carrier is required";
    }

    // Validate Items
    if (!applyToAll && selectedItemIds.length === 0) {
      errors.items = "Please select at least one item to ship in this package";
    }

    // Validate WhatsApp unconfirmed payment
    if (isWhatsAppPaymentUnconfirmed && !isEdit) {
      if (!shipAnyway) {
        errors.payment = "Cannot ship order until WhatsApp payment is confirmed or override is selected";
      } else if (!overrideReason.trim()) {
        errors.overrideReason = "Please provide an override reason for shipping unconfirmed order";
      }
    }

    if (Object.keys(errors).length > 0) {
      setInlineErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsToShip = (applyToAll || selectedItemIds.length === 0)
        ? shippableItems.map((it, idx) => String(it.id || idx))
        : selectedItemIds;

      const cleanPayload: Record<string, any> = {
        shipment_action: isEdit ? "edit_shipment" : "add_shipment",
        carrier: carrier.trim(),
        tracking_number: trackingNumber.trim(),
        item_ids: itemsToShip,
        notified_email: sendEmail,
        notified_whatsapp: sendWhatsApp,
        ship_anyway: shipAnyway,
      };
      if (editShipment?.id) cleanPayload.shipment_id = editShipment.id;
      if (trackingUrl.trim()) cleanPayload.tracking_url = trackingUrl.trim();
      if (deliveryDate) cleanPayload.delivery_date = deliveryDate;
      if (deliveryRoute.trim()) cleanPayload.delivery_route = deliveryRoute.trim();
      if (overrideReason.trim()) cleanPayload.override_reason = overrideReason.trim();

      const success = await onSave(cleanPayload as any);

      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerName = order?.customer_name || order?.shipping_address?.full_name || "Valued Customer";
  const customerEmail = order?.customer_email || order?.shipping_address?.email || "customer@example.com";
  const orderNumber = order?.order_id || order?.id || "PRJ-ORDER";

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) onClose();
        }}
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary grid place-items-center">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-foreground">
                  {isEdit ? "Edit Tracking Number" : "Add Tracking Number"}
                </h3>
                <p className="text-[11px] text-muted-foreground">Order #{orderNumber}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            {/* Warning Banner: WhatsApp Payment Awaiting Confirmation */}
            {isWhatsAppPaymentUnconfirmed && !isEdit && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-xs">WhatsApp Payment Pending</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      This order was placed via WhatsApp manual payment and has not been confirmed as Paid. Confirm payment in the Payment card first, or check override below.
                    </p>
                  </div>
                </div>

                <div className="pt-1 border-t border-amber-500/20 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-amber-950 dark:text-amber-200">
                    <input
                      type="checkbox"
                      checked={shipAnyway}
                      onChange={(e) => setShipAnyway(e.target.checked)}
                      className="rounded border-amber-400 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                    <span>Ship anyway (Admin Override)</span>
                  </label>

                  {shipAnyway && (
                    <div>
                      <input
                        type="text"
                        placeholder="Reason for shipping without confirmed payment (required)..."
                        value={overrideReason}
                        onChange={(e) => {
                          setOverrideReason(e.target.value);
                          if (inlineErrors.overrideReason) {
                            setInlineErrors((prev) => ({ ...prev, overrideReason: "" }));
                          }
                        }}
                        className={`h-8 w-full rounded-lg border bg-background px-2.5 text-xs outline-none focus:border-primary ${
                          inlineErrors.overrideReason ? "border-destructive" : "border-border"
                        }`}
                      />
                      {inlineErrors.overrideReason && (
                        <p className="text-[10px] text-destructive mt-1">{inlineErrors.overrideReason}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Warning Banner: Pre-order Items */}
            {hasPreOrderItems && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2 text-blue-900 dark:text-blue-300">
                <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-xs">Pre-Order Items Selected</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Ship only after the new stock has arrived from the farm.
                  </p>
                </div>
              </div>
            )}

            {/* Field 1: Tracking Number & Carrier Partner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Tracking Number <span className="text-destructive">*</span>
                </label>
                <input
                  ref={firstInputRef}
                  type="text"
                  required
                  placeholder="e.g. 4123 8890 2210 or ED123456789IN"
                  value={trackingNumber}
                  onChange={(e) => handleTrackingNumberChange(e.target.value)}
                  className={`h-9 w-full rounded-xl border bg-background px-3 text-xs font-mono outline-none focus:border-primary transition ${
                    inlineErrors.trackingNumber ? "border-destructive" : "border-border"
                  }`}
                />
                {inlineErrors.trackingNumber && (
                  <p className="text-[10px] text-destructive mt-1">{inlineErrors.trackingNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Shipping Carrier <span className="text-destructive">*</span>
                </label>
                <select
                  value={carrier}
                  onChange={(e) => handleCarrierChange(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary cursor-pointer"
                >
                  {SUPPORTED_CARRIERS.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {inlineErrors.carrier && (
                  <p className="text-[10px] text-destructive mt-1">{inlineErrors.carrier}</p>
                )}
              </div>
            </div>

            {/* Field 2: Custom Tracking URL (Optional / Other) */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Tracking URL {carrier === "Other" ? "(Recommended)" : "(Optional)"}
              </label>
              <input
                type="url"
                placeholder={carrier === "Other" ? "https://courier-site.com/track/..." : "https://..."}
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
              />
            </div>

            {/* Field 3: Delivery Route & Estimated Delivery Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Delivery Route</label>
                <input
                  type="text"
                  placeholder="e.g. Central Hub -> City Express"
                  value={deliveryRoute}
                  onChange={(e) => setDeliveryRoute(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Est. Delivery Date</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

              {/* Checkboxes: Items to Ship (Full or Partial Shipment) */}
            <div className="space-y-2 border-t border-border pt-3">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setApplyToAll(checked);
                    if (checked) {
                      setSelectedItemIds(shippableItems.map((it, idx) => String(it.id || idx)));
                    }
                  }}
                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span>
                  {unshippedItems.length > 0
                    ? `Apply to all unshipped items in this order (${unshippedItems.length})`
                    : `Apply to all items in this order (${orderItems.length})`}
                </span>
              </label>

              {/* Per-Item Checkbox List when Unchecked */}
              {!applyToAll && (
                <div className="p-3 bg-secondary/30 border border-border rounded-xl space-y-2 max-h-48 overflow-y-auto">
                  <p className="text-[10px] font-subhead uppercase tracking-wider font-bold text-muted-foreground">
                    Select products included in this package:
                  </p>
                  <div className="divide-y divide-border">
                    {shippableItems.map((it: any, idx: number) => {
                      const idKey = String(it.id || idx);
                      const isChecked = selectedItemIds.includes(idKey);
                      return (
                        <label
                          key={idKey}
                          className="flex items-center gap-3 py-2 cursor-pointer hover:bg-secondary/40 px-1.5 rounded-lg transition"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleItemSelection(idKey)}
                            className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                          />
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {it.image ? (
                              <img
                                src={it.image}
                                alt={it.name}
                                className="h-7 w-7 rounded-lg object-cover border border-border shrink-0"
                              />
                            ) : (
                              <div className="h-7 w-7 rounded bg-secondary grid place-items-center shrink-0">
                                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-display font-medium text-xs text-foreground truncate">
                                {it.name || "Product"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Qty: {it.qty || it.quantity || 1} · {it.weight || "Standard"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-xs font-semibold text-foreground">
                            {inr(Number(it.price || 0) * Number(it.qty || 1))}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {inlineErrors.items && (
                    <p className="text-[10px] text-destructive font-medium">{inlineErrors.items}</p>
                  )}
                </div>
              )}
            </div>

            {/* Notification Checkbox (Email confirmation via Resend) */}
            <div className="space-y-1.5 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-foreground font-medium">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    <span>Send shipping confirmation email (Resend)</span>
                  </div>
                </label>

                {/* Preview Link */}
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  <Eye className="h-3 w-3" />
                  <span>Preview</span>
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground pl-5.5">
                Sends branded tracking notification to <span className="font-mono text-foreground font-semibold">{customerEmail}</span>
              </p>
            </div>

            {/* Error message */}
            {inlineErrors.payment && (
              <p className="text-[11px] text-destructive font-medium bg-destructive/10 p-2.5 rounded-xl border border-destructive/20">
                {inlineErrors.payment}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-2 text-xs rounded-xl border border-border text-muted-foreground hover:bg-secondary font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (isWhatsAppPaymentUnconfirmed && !shipAnyway && !isEdit)}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition cursor-pointer shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <span>{isEdit ? "Save Changes" : "Apply"}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Customer Email Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <h4 className="font-display font-bold text-sm text-foreground">Customer Email Preview</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 bg-background border border-border rounded-xl space-y-3 font-sans text-xs">
              <div className="border-b border-border pb-2 text-[11px] text-muted-foreground space-y-1">
                <div>
                  <span className="font-semibold text-foreground">To:</span> {customerName} &lt;{customerEmail}&gt;
                </div>
                <div>
                  <span className="font-semibold text-foreground">Subject:</span> Your Prajnaa Farm Order #{orderNumber} has been dispatched!
                </div>
              </div>

              <div className="space-y-2.5 text-foreground leading-relaxed">
                <p>Namaste {customerName},</p>
                <p>
                  Great news! Your package for order <strong>#{orderNumber}</strong> has been handed over to our courier partner and is now on its way to you.
                </p>

                <div className="p-3 bg-secondary/50 rounded-xl border border-border space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carrier:</span>
                    <span className="font-semibold text-foreground">{carrier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tracking Number:</span>
                    <span className="font-mono font-bold text-primary">{trackingNumber || "—"}</span>
                  </div>
                  {deliveryDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expected Delivery:</span>
                      <span className="text-foreground">{new Date(deliveryDate).toLocaleDateString("en-IN")}</span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Thank you for supporting natural, chemical-free produce directly from Indian organic farmers.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
