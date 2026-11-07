/**
 * Central Order Constants & Wix-Style Status Mapping
 * 
 * Maps raw system status values (stored in DB) to human-friendly Wix Stores-style display labels.
 * Stored values are NEVER rewritten or changed.
 */

// Allowed payment methods for new orders and manual orders
export const ALLOWED_PAYMENT_METHODS = ["cod", "whatsapp"] as const;
export type AllowedPaymentMethod = (typeof ALLOWED_PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "Cash on Delivery (COD)",
  whatsapp: "WhatsApp (Manual)",
  online: "Online (Legacy)",
};

export const PAYMENT_METHOD_SHORT_LABELS: Record<string, string> = {
  cod: "COD",
  whatsapp: "WhatsApp",
  online: "Online",
};

// Shipments data model
export interface OrderShipment {
  id: string; // e.g. shp_...
  order_id: string;
  carrier: string;
  tracking_number: string;
  tracking_url?: string | null;
  shipped_at: string;
  created_by: string;
  notified_email: boolean;
  notified_whatsapp: boolean;
  email_sent_at?: string | null;
  email_error?: string | null;
  item_ids?: string[]; // IDs or indices of order items covered by this shipment
}

// Raw fulfillment/order statuses stored in database
export type RawOrderStatus =
  | "pending"
  | "cod_pending"
  | "pending_payment"
  | "pending_manual_payment"
  | "confirmed"
  | "packed"
  | "partially_shipped"
  | "shipped"
  | "delivered"
  | "partially_fulfilled"
  | "cancelled";

// Wix-style readable fulfillment labels
export type WixFulfillmentLabel =
  | "Unfulfilled"
  | "Confirmed"
  | "Packed"
  | "Partially shipped"
  | "Shipped"
  | "Delivered"
  | "Partially fulfilled"
  | "Canceled";

/**
 * Maps any raw database status string to Wix Stores-style fulfillment label
 */
export function getWixFulfillmentLabel(rawStatus?: string | null): WixFulfillmentLabel {
  const s = (rawStatus || "").toLowerCase().trim();
  switch (s) {
    case "confirmed":
      return "Confirmed";
    case "packed":
      return "Packed";
    case "partially_shipped":
    case "partially-shipped":
      return "Partially shipped";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "partially_fulfilled":
    case "partially-fulfilled":
      return "Partially fulfilled";
    case "cancelled":
    case "canceled":
      return "Canceled";
    case "pending":
    case "cod_pending":
    case "pending_payment":
    case "pending_manual_payment":
    default:
      return "Unfulfilled";
  }
}

/**
 * Visual styling classes for fulfillment badges
 */
export const FULFILLMENT_BADGE_STYLES: Record<WixFulfillmentLabel, { bg: string; text: string; border: string }> = {
  Unfulfilled: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-800 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800/60",
  },
  Confirmed: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-800 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800/60",
  },
  Packed: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-800 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800/60",
  },
  "Partially shipped": {
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    text: "text-cyan-800 dark:text-cyan-300 font-semibold",
    border: "border-cyan-200 dark:border-cyan-800/60",
  },
  Shipped: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-800 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800/60",
  },
  Delivered: {
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    text: "text-emerald-900 dark:text-emerald-200 font-semibold",
    border: "border-emerald-300 dark:border-emerald-700/60",
  },
  "Partially fulfilled": {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-800 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800/60",
  },
  Canceled: {
    bg: "bg-stone-100 dark:bg-stone-800/40",
    text: "text-stone-600 dark:text-stone-400 line-through",
    border: "border-stone-200 dark:border-stone-700/60",
  },
};

// Wix-style payment status labels
export type WixPaymentLabel = "Paid" | "Unpaid" | "Pending confirmation" | "Refunded";

/**
 * Maps raw payment_status and payment_method into Wix payment badge
 */
export function getWixPaymentLabel(
  paymentStatus?: string | null,
  paymentMethod?: string | null
): WixPaymentLabel {
  const ps = (paymentStatus || "").toLowerCase().trim();
  const pm = (paymentMethod || "").toLowerCase().trim();

  if (ps === "paid" || ps === "collected") {
    return "Paid";
  }
  if (ps === "refunded") {
    return "Refunded";
  }
  if (ps === "cancelled" || ps === "canceled" || ps === "failed") {
    return "Unpaid";
  }
  if (pm === "whatsapp") {
    return "Pending confirmation";
  }
  // COD default before collection
  return "Unpaid";
}

/**
 * Visual styling classes for payment badges
 */
export const PAYMENT_BADGE_STYLES: Record<WixPaymentLabel, { bg: string; text: string; border: string; dot: string }> = {
  Paid: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800/50",
    dot: "bg-emerald-500",
  },
  Unpaid: {
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800/50",
    dot: "bg-rose-500",
  },
  "Pending confirmation": {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800/50",
    dot: "bg-amber-500",
  },
  Refunded: {
    bg: "bg-stone-100 dark:bg-stone-800/30",
    text: "text-stone-600 dark:text-stone-400",
    border: "border-stone-200 dark:border-stone-700/50",
    dot: "bg-stone-400",
  },
};

/**
 * Pending Review Rule (exact definition):
 * An order needs admin review if:
 * 1. It is WhatsApp payment and payment is still pending confirmation (admin needs to check screenshot/UTR).
 * 2. It is newly placed and unconfirmed (status is 'pending', 'cod_pending', 'pending_payment', 'pending_manual_payment').
 * 3. It is not cancelled or delivered.
 */
export function isOrderPendingReview(order: any): boolean {
  if (!order) return false;
  const status = (order.status || "").toLowerCase().trim();
  const paymentStatus = (order.payment_status || "").toLowerCase().trim();
  const method = (order.payment_method || "").toLowerCase().trim();

  if (status === "cancelled" || status === "delivered") return false;

  const isUnconfirmed = ["pending", "cod_pending", "pending_payment", "pending_manual_payment"].includes(status);
  const isWhatsAppAwaitingConfirmation = method === "whatsapp" && paymentStatus !== "paid";

  return isUnconfirmed || isWhatsAppAwaitingConfirmation;
}
