/**
 * =========================================================================================
 * PRAJNAA PAYMENT GATEWAYS CENTRAL CONFIGURATION (SINGLE SOURCE OF TRUTH)
 * =========================================================================================
 * 
 * HOW TO RE-ENABLE A GATEWAY:
 * ----------------------------
 * 1. To re-enable Razorpay:
 *    Change `enabled: false` to `enabled: true` in the `razorpay` section of `PAYMENT_GATEWAYS_CONFIG` below,
 *    OR set the environment variable `NEXT_PUBLIC_ENABLE_RAZORPAY=true` (or `PAYMENT_GATEWAY_RAZORPAY_ENABLED=true`).
 * 
 * 2. To re-enable Cashfree:
 *    Change `enabled: false` to `enabled: true` in the `cashfree` section of `PAYMENT_GATEWAYS_CONFIG` below,
 *    OR set the environment variable `NEXT_PUBLIC_ENABLE_CASHFREE=true` (or `PAYMENT_GATEWAY_CASHFREE_ENABLED=true`).
 * 
 * NOTE ON AUTO-EXPIRY / REACTIVATION:
 * -----------------------------------
 * There is NO date-based or timer-based auto-expiry logic.
 * Disabled gateways will remain disabled indefinitely until explicitly enabled by an admin.
 * =========================================================================================
 */

import { isOnlinePaymentsEnabled } from "../lib/features.ts";

export type GatewayId = "razorpay" | "cashfree" | "cod" | "whatsapp";

export interface GatewayStatusConfig {
  id: GatewayId;
  name: string;
  subtitle: string;
  enabled: boolean;
  isRestricted: boolean;
  disabledReason?: string;
  unavailableBadge?: string;
  feeType: "flat" | "percentage" | "none";
  feeAmount?: number; // e.g. 40 for flat COD fee
  feeRate?: number; // e.g. 0.0236 for Razorpay
  feeDescription: string;
  highlightBadge?: string;
}

/**
 * List of gateways that are currently restricted/disabled by policy.
 */
export const RESTRICTED_GATEWAYS: readonly GatewayId[] = ["razorpay", "cashfree"] as const;

/**
 * Standard Cash on Delivery Flat Handling Fee in Rupees (INR).
 * Set to ₹40.
 */
export const COD_FLAT_FEE = 40;

/**
 * Helper to parse boolean environment variable override safely.
 */
function getEnvBooleanOverride(keys: string[], defaultValue: boolean): boolean {
  if (typeof process === "undefined" || !process.env) return defaultValue;

  for (const key of keys) {
    const val = process.env[key];
    if (val !== undefined && val !== null) {
      const lower = String(val).trim().toLowerCase();
      if (lower === "true" || lower === "1" || lower === "yes") return true;
      if (lower === "false" || lower === "0" || lower === "no") return false;
    }
  }
  return defaultValue;
}

/**
 * Central dictionary of payment gateways.
 * Razorpay & Cashfree are default DISABLED.
 * COD & WhatsApp are default ENABLED.
 */
export const PAYMENT_GATEWAYS_CONFIG: Record<GatewayId, GatewayStatusConfig> = {
  whatsapp: {
    id: "whatsapp",
    name: "WhatsApp Order & Direct Payment",
    subtitle: "Opens WhatsApp click-to-chat order summary with direct bank transfer / UPI option.",
    enabled: true,
    isRestricted: false,
    feeType: "none",
    feeAmount: 0,
    feeDescription: "No Extra Fee",
    highlightBadge: "Instant Confirmation",
  },
  cod: {
    id: "cod",
    name: "Cash on Delivery (COD)",
    subtitle: "Pay cash upon delivery at your doorstep.",
    enabled: true,
    isRestricted: false,
    feeType: "flat",
    feeAmount: COD_FLAT_FEE,
    feeDescription: `+₹${COD_FLAT_FEE} COD Fee`,
    highlightBadge: "Available",
  },
  razorpay: {
    id: "razorpay",
    name: "Razorpay (UPI / Cards / Netbanking)",
    subtitle: "Instant online checkout via UPI, Credit/Debit Cards, Netbanking.",
    enabled: isOnlinePaymentsEnabled() && getEnvBooleanOverride(
      ["PAYMENT_GATEWAY_RAZORPAY_ENABLED", "NEXT_PUBLIC_ENABLE_RAZORPAY", "ENABLE_RAZORPAY"],
      true,
    ),
    isRestricted: true,
    disabledReason: "Razorpay online payment is temporarily unavailable. Please select Cash on Delivery or WhatsApp order.",
    unavailableBadge: "Temporarily unavailable",
    feeType: "percentage",
    feeRate: (2.0 / 100) * (1 + 18 / 100), // ~2.36%
    feeDescription: "+2.36% Gateway Fee",
  },
  cashfree: {
    id: "cashfree",
    name: "Cashfree Payments",
    subtitle: "Instant online checkout via Cashfree PG.",
    enabled: isOnlinePaymentsEnabled() && getEnvBooleanOverride(
      ["PAYMENT_GATEWAY_CASHFREE_ENABLED", "NEXT_PUBLIC_ENABLE_CASHFREE", "ENABLE_CASHFREE"],
      true,
    ),
    isRestricted: true,
    disabledReason: "Cashfree online payment is temporarily unavailable. Please select Cash on Delivery or WhatsApp order.",
    unavailableBadge: "Temporarily unavailable",
    feeType: "percentage",
    feeRate: (1.95 / 100) * (1 + 18 / 100), // ~2.30%
    feeDescription: "+2.30% Gateway Fee",
  },
};

/**
 * Checks if a specific payment gateway is enabled.
 * Single source of truth for both frontend and backend validation.
 */
export function isGatewayEnabled(gateway: string | null | undefined): boolean {
  if (!gateway) return false;
  const key = gateway.toLowerCase().trim() as GatewayId;
  if ((key === "razorpay" || key === "cashfree") && !isOnlinePaymentsEnabled()) {
    return false;
  }
  const config = PAYMENT_GATEWAYS_CONFIG[key];
  return Boolean(config && config.enabled);
}

/**
 * Returns configuration details for a given gateway.
 */
export function getGatewayConfig(gateway: string | null | undefined): GatewayStatusConfig | null {
  if (!gateway) return null;
  const key = gateway.toLowerCase().trim() as GatewayId;
  const config = PAYMENT_GATEWAYS_CONFIG[key];
  if (!config) return null;
  if ((key === "razorpay" || key === "cashfree") && !isOnlinePaymentsEnabled()) {
    return { ...config, enabled: false };
  }
  return config;
}

/**
 * Returns all payment gateway configurations.
 */
export function getAllGatewaysConfig(): Record<GatewayId, GatewayStatusConfig> {
  const online = isOnlinePaymentsEnabled();
  const cfg = { ...PAYMENT_GATEWAYS_CONFIG };
  if (!online) {
    if (cfg.razorpay) cfg.razorpay = { ...cfg.razorpay, enabled: false };
    if (cfg.cashfree) cfg.cashfree = { ...cfg.cashfree, enabled: false };
  }
  return cfg;
}

/**
 * Returns a list of all currently enabled gateways.
 */
export function getAvailableGateways(): GatewayStatusConfig[] {
  const online = isOnlinePaymentsEnabled();
  return Object.values(PAYMENT_GATEWAYS_CONFIG).filter((g) => {
    if ((g.id === "razorpay" || g.id === "cashfree") && !online) return false;
    return g.enabled;
  });
}

/**
 * Returns the recommended default payment method (the first enabled gateway, e.g. "whatsapp").
 */
export function getDefaultPaymentMethod(): GatewayId {
  const available = getAvailableGateways();
  return available[0]?.id || "whatsapp";
}

/**
 * Calculates the payment gateway / handling fee for a given method.
 */
export function calculateGatewayFee(
  paymentMethod: string | null | undefined,
  subtotalWithTaxAndShipping: number,
): number {
  if (!paymentMethod) return 0;
  const key = paymentMethod.toLowerCase().trim() as GatewayId;
  const config = PAYMENT_GATEWAYS_CONFIG[key];
  if (!config || !config.enabled) return 0;

  if (config.feeType === "flat") {
    return config.feeAmount || 0;
  }
  if (config.feeType === "percentage" && config.feeRate) {
    return Math.round(subtotalWithTaxAndShipping * config.feeRate);
  }
  return 0;
}
