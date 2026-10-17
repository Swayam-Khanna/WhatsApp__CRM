/**
 * Shared Cashfree Configuration & Base URL Resolver
 * Single source of truth for Cashfree API credentials and endpoints across KYC & Payments.
 */

export interface CashfreeConfig {
  clientId: string;
  clientSecret: string;
  env: "production" | "sandbox";
  apiVersion: string;
  verificationBaseUrl: string;
  pgBaseUrl: string;
}

/**
 * Returns the Cashfree configuration with unified base URL resolution.
 * Automatically validates environment consistency and logs warnings if credential prefixes mismatch CASHFREE_ENV.
 */
export function getCashfreeConfig(): CashfreeConfig {
  const envRaw = (process.env.CASHFREE_ENV || "sandbox").trim().toLowerCase();
  let env: "production" | "sandbox" = envRaw === "production" ? "production" : "sandbox";

  let clientId = (
    process.env.CASHFREE_CLIENT_ID ||
    process.env.CASHFREE_APP_ID ||
    process.env.NEXT_PUBLIC_CASHFREE_APP_ID ||
    ""
  ).trim();

  let clientSecret = (
    process.env.CASHFREE_CLIENT_SECRET ||
    process.env.CASHFREE_SECRET_KEY ||
    ""
  ).trim();

  const apiVersion = (process.env.CASHFREE_API_VERSION || "2023-08-01").trim();

  // Fallback to empty string if not provided in environment
  if (!clientId || !clientSecret || clientId.includes("[SENSITIVE]")) {
    if (process.env.NODE_ENV === "production" && (!clientId || !clientSecret)) {
      console.error("[Cashfree Config Error]: Missing CASHFREE_CLIENT_ID or CASHFREE_CLIENT_SECRET in production environment.");
    }
  }

  // Detect signature / prefix mismatches
  const isTestSecret = clientSecret.startsWith("cfsk_ma_test_");
  const isProdSecret = clientSecret.startsWith("cfsk_ma_prod_");
  const isTestClientId = clientId.startsWith("TEST");
  const isProdClientId = clientId.startsWith("CF") && !isTestClientId;

  // Startup / Config validation check
  if (env === "production" && (isTestSecret || isTestClientId)) {
    console.warn(
      `[Cashfree Config Warning]: CASHFREE_ENV is set to "production", but configured credentials appear to be TEST/SANDBOX keys (Client ID: "${clientId.slice(
        0,
        6,
      )}...", Secret: "${clientSecret.slice(
        0,
        13,
      )}..."). Automatically routing to SANDBOX URL to prevent "Client secret belongs to test environment" error.`,
    );
    env = "sandbox";
  } else if (env === "sandbox" && isProdSecret && isProdClientId && !isTestSecret && !isTestClientId) {
    console.warn(
      `[Cashfree Config Notice]: CASHFREE_ENV is set to "sandbox", but configured credentials use Production format (Client ID: "${clientId.slice(
        0,
        6,
      )}..."). Using Sandbox base URL as specified by CASHFREE_ENV. If you encounter authentication errors, make sure to use credentials from the Sandbox tab of the Cashfree dashboard.`,
    );
  }

  const verificationBaseUrl =
    env === "production"
      ? "https://api.cashfree.com/verification"
      : "https://sandbox.cashfree.com/verification";

  const pgBaseUrl =
    env === "production"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";

  return {
    clientId,
    clientSecret,
    env,
    apiVersion,
    verificationBaseUrl,
    pgBaseUrl,
  };
}

/**
 * Returns the resolved verification base URL (Single Source of Truth)
 * E.g.: "https://sandbox.cashfree.com/verification" or "https://api.cashfree.com/verification"
 */
export function getCashfreeVerificationBaseUrl(): string {
  return getCashfreeConfig().verificationBaseUrl;
}
