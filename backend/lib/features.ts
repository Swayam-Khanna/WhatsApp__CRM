/**
 * Shared Feature Flags Helper
 * Single source of truth for application feature flags.
 */

/**
 * Returns true only if online payments (Razorpay / Cashfree) are explicitly enabled.
 * Defaults strictly to false when unset.
 */
export function isOnlinePaymentsEnabled(): boolean {
  const serverFlag = process.env.ONLINE_PAYMENTS_ENABLED;
  const clientFlag = process.env.NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED;

  return serverFlag === "true" || clientFlag === "true";
}
