const metaEnv =
  typeof import.meta !== "undefined" && (import.meta as any).env ? (import.meta as any).env : {};

const safeGetEnv = (
  nextPublic: string | undefined,
  viteKey: string,
  metaVal: string | undefined,
): string => {
  if (nextPublic) return nextPublic;
  if (typeof process !== "undefined" && process.env) {
    const val = (process.env as any)[viteKey];
    if (val) return val;
  }
  return metaVal || "";
};

export const VITE_FIREBASE_API_KEY = "";
export const VITE_FIREBASE_AUTH_DOMAIN = "";
export const VITE_FIREBASE_PROJECT_ID = "";
export const VITE_FIREBASE_STORAGE_BUCKET = "";
export const VITE_FIREBASE_MESSAGING_SENDER_ID = "";
export const VITE_FIREBASE_APP_ID = "";

export const VITE_SUPABASE_URL = safeGetEnv(
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined,
  "VITE_SUPABASE_URL",
  metaEnv.VITE_SUPABASE_URL,
);
export const VITE_SUPABASE_PUBLISHABLE_KEY = safeGetEnv(
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY : undefined,
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
);

export const VITE_RAZORPAY_KEY_ID = safeGetEnv(
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID : undefined,
  "VITE_RAZORPAY_KEY_ID",
  metaEnv.VITE_RAZORPAY_KEY_ID,
);
export const VITE_CASHFREE_APP_ID = safeGetEnv(
  typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_CASHFREE_APP_ID || process.env.CASHFREE_APP_ID) : undefined,
  "VITE_CASHFREE_APP_ID",
  metaEnv.VITE_CASHFREE_APP_ID,
);
export const VITE_SENTRY_DSN = safeGetEnv(
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SENTRY_DSN : undefined,
  "VITE_SENTRY_DSN",
  metaEnv.VITE_SENTRY_DSN,
);
export const NEXT_PUBLIC_APP_URL = safeGetEnv(
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_APP_URL : undefined,
  "NEXT_PUBLIC_APP_URL",
  metaEnv.NEXT_PUBLIC_APP_URL,
);
export const MODE =
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_NODE_ENV : "") ||
  (typeof process !== "undefined" ? process.env.NODE_ENV : "") ||
  metaEnv.MODE ||
  "development";
