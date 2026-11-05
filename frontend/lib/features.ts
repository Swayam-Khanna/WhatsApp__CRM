/**
 * Shared Feature Flags Helper
 * Single source of truth for application feature flags.
 */

/**
 * Returns true only if online payments (Razorpay / Cashfree) are explicitly enabled.
 * Defaults strictly to false when unset.
 */
export function isOnlinePaymentsEnabled(): boolean {
  const serverFlag = typeof process !== "undefined" ? process.env?.ONLINE_PAYMENTS_ENABLED : undefined;
  const clientFlag = typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED : undefined;

  return serverFlag === "true" || clientFlag === "true";
}
