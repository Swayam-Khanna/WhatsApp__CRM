/**
 * Central Order State Machine
 * 
 * Enforces the strict sequential lifecycle:
 * Pending (or cod_pending/pending_manual_payment) -> Confirmed -> Packed -> Shipped (or Partially shipped) -> Delivered
 * Cancelled is allowed from any state prior to Delivered.
 * Block all invalid jumps.
 */

export type OrderStageKey =
  | "pending"
  | "confirmed"
  | "packed"
  | "partially_shipped"
  | "shipped"
  | "delivered"
  | "cancelled";

/**
 * Normalizes any database status string to a normalized state machine key
 */
export function normalizeToStateKey(status?: string | null): OrderStageKey {
  const s = (status || "").toLowerCase().trim();
  switch (s) {
    case "confirmed":
      return "confirmed";
    case "packed":
      return "packed";
    case "partially_shipped":
    case "partially-shipped":
    case "partially_fulfilled":
    case "partially-fulfilled":
      return "partially_shipped";
    case "shipped":
      return "shipped";
    case "delivered":
      return "delivered";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "pending":
    case "cod_pending":
    case "pending_payment":
    case "pending_manual_payment":
    default:
      return "pending";
  }
}

/**
 * Valid forward transitions from each normalized stage.
 * Cancelled is permissible from any state before 'delivered'.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStageKey, OrderStageKey[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "partially_shipped", "shipped", "cancelled"],
  packed: ["partially_shipped", "shipped", "cancelled"],
  partially_shipped: ["shipped", "packed", "cancelled"],
  shipped: ["delivered", "partially_shipped", "cancelled"],
  delivered: [], // Cannot cancel or transition from delivered
  cancelled: [], // Terminal state
};

/**
 * Human readable action names for next valid statuses
 */
export const STATUS_ACTION_LABELS: Record<OrderStageKey, string> = {
  pending: "Mark as Pending",
  confirmed: "Confirm Order",
  packed: "Mark as Packed",
  partially_shipped: "Partially Ship",
  shipped: "Mark as Shipped",
  delivered: "Mark as Delivered",
  cancelled: "Cancel Order",
};

/**
 * Checks if transition from currentStatus to nextStatus is permissible
 */
export function canTransition(currentStatus?: string | null, nextStatus?: string | null): boolean {
  if (!currentStatus || !nextStatus) return false;
  const currentKey = normalizeToStateKey(currentStatus);
  const nextKey = normalizeToStateKey(nextStatus);

  if (currentKey === nextKey) return true; // Idempotent same-state update

  const allowed = ALLOWED_TRANSITIONS[currentKey] || [];
  return allowed.includes(nextKey);
}

/**
 * Returns array of allowed next stage keys from the current state
 */
export function getAllowedNextStatuses(currentStatus?: string | null): OrderStageKey[] {
  const currentKey = normalizeToStateKey(currentStatus);
  return ALLOWED_TRANSITIONS[currentKey] || [];
}

/**
 * Derives new order status from items allocation
 */
export function deriveOrderStatusFromItems(items: any[], currentStatus?: string): OrderStageKey {
  if (!Array.isArray(items) || items.length === 0) {
    return normalizeToStateKey(currentStatus || "packed");
  }

  const shippedCount = items.filter((it) => Boolean(it.shipment_id)).length;
  if (shippedCount === 0) {
    const cur = normalizeToStateKey(currentStatus);
    // If it was shipped or partially_shipped, roll back to packed
    if (cur === "shipped" || cur === "partially_shipped") {
      return "packed";
    }
    return cur;
  }
  if (shippedCount === items.length) {
    return "shipped";
  }
  return "partially_shipped";
}

export interface TrackingEligibilityResult {
  allowed: boolean;
  reason?: string;
  isPendingPayment?: boolean;
  requiresOverride?: boolean;
}

/**
 * Checks if adding tracking is permitted for the given order
 */
export function canAddTracking(order: any, options?: { shipAnyway?: boolean; overrideReason?: string }): TrackingEligibilityResult {
  if (!order) return { allowed: false, reason: "Order not found." };

  const currentKey = normalizeToStateKey(order.status);
  if (currentKey === "delivered") {
    return { allowed: false, reason: "Delivered orders are read-only for tracking." };
  }
  if (currentKey === "cancelled") {
    return { allowed: false, reason: "Cancelled orders are read-only for tracking." };
  }
  if (currentKey === "pending") {
    return { allowed: false, reason: "Order must be Confirmed before adding tracking numbers." };
  }

  // WhatsApp payment check
  const method = String(order.payment_method || "").toLowerCase().trim();
  const paymentStatus = String(order.payment_status || "").toLowerCase().trim();
  if (method === "whatsapp" && paymentStatus !== "paid") {
    if (!options?.shipAnyway) {
      return {
        allowed: false,
        reason: "WhatsApp payment is awaiting confirmation. Confirm payment or override with reason.",
        isPendingPayment: true,
        requiresOverride: true,
      };
    }
    if (!options?.overrideReason?.trim()) {
      return {
        allowed: false,
        reason: "Override reason is required when shipping an unconfirmed order.",
        isPendingPayment: true,
        requiresOverride: true,
      };
    }
  }

  return { allowed: true };
}

export interface TransitionValidationResult {
  valid: boolean;
  error?: string;
  normalizedNextStatus: OrderStageKey;
  requiresTracking?: boolean;
  requiresCashCollectionPrompt?: boolean;
}

export interface TransitionOptions {
  trackingNumber?: string | null;
  allowWithoutTracking?: boolean;
  cancellationReason?: string | null;
  markCashCollected?: boolean;
  shipAnyway?: boolean;
  overrideReason?: string | null;
}

/**
 * Validates a proposed state change against the order data and business rules
 */
export function validateStatusTransition(
  order: any,
  nextStatus: string,
  options: TransitionOptions = {}
): TransitionValidationResult {
  if (!order) {
    return { valid: false, error: "Order not found.", normalizedNextStatus: "pending" };
  }

  const currentKey = normalizeToStateKey(order.status);
  const nextKey = normalizeToStateKey(nextStatus);

  // 1. Same state check
  if (currentKey === nextKey) {
    return { valid: true, normalizedNextStatus: nextKey };
  }

  // 2. State machine jump check
  const allowed = ALLOWED_TRANSITIONS[currentKey] || [];
  if (!allowed.includes(nextKey)) {
    if (currentKey === "delivered") {
      return {
        valid: false,
        error: `Order is already delivered and cannot be changed to ${nextKey}.`,
        normalizedNextStatus: nextKey,
      };
    }
    if (currentKey === "cancelled") {
      return {
        valid: false,
        error: "Cancelled orders cannot be reopened or transitioned.",
        normalizedNextStatus: nextKey,
      };
    }
    return {
      valid: false,
      error: `Invalid status transition: Cannot jump from ${currentKey.toUpperCase()} to ${nextKey.toUpperCase()}. Expected sequential flow: Pending -> Confirmed -> Packed -> Shipped -> Delivered.`,
      normalizedNextStatus: nextKey,
    };
  }

  // 3. Shipped / Partially shipped requirement: Must have tracking or explicit override
  if (nextKey === "shipped" || nextKey === "partially_shipped") {
    const existingTracking = (order.tracking_number || "").trim();
    const hasShipments = Array.isArray(order.shipments) && order.shipments.length > 0;
    const newTracking = (options.trackingNumber || "").trim();
    const hasTracking = Boolean(existingTracking || hasShipments || newTracking);

    if (!hasTracking && !options.allowWithoutTracking) {
      return {
        valid: false,
        error: "A carrier tracking number is required to mark an order as Shipped. Please provide a tracking ID or select override.",
        normalizedNextStatus: nextKey,
        requiresTracking: true,
      };
    }

    // Check WhatsApp unconfirmed payment
    const method = String(order.payment_method || "").toLowerCase().trim();
    const paymentStatus = String(order.payment_status || "").toLowerCase().trim();
    if (method === "whatsapp" && paymentStatus !== "paid") {
      if (!options.shipAnyway || !options.overrideReason?.trim()) {
        return {
          valid: false,
          error: "Shipping is blocked because WhatsApp payment is unconfirmed. Check 'Ship anyway' and provide a reason to override.",
          normalizedNextStatus: nextKey,
        };
      }
    }
  }

  // 4. Delivered requirement for COD orders
  const isCod = (order.payment_method || "").toLowerCase().trim() === "cod";
  const isPaid = (order.payment_status || "").toLowerCase().trim() === "paid";
  let requiresCashCollectionPrompt = false;
  if (nextKey === "delivered" && isCod && !isPaid) {
    requiresCashCollectionPrompt = true;
  }

  // 5. Cancellation requirement: Require reason when cancelling
  if (nextKey === "cancelled") {
    if (options.cancellationReason !== undefined && !options.cancellationReason?.trim()) {
      return {
        valid: false,
        error: "A cancellation reason must be provided.",
        normalizedNextStatus: nextKey,
      };
    }
  }

  return {
    valid: true,
    normalizedNextStatus: nextKey,
    requiresCashCollectionPrompt,
  };
}
