// Keep track of timestamps per client key in memory
const tracker = new Map<string, number[]>();

// Sensible defaults: 60 requests per 1 minute window (60000ms)
const DEFAULT_WINDOW_MS = 60000;
const DEFAULT_MAX_LIMIT = 60;

/**
 * Checks and enforces rate limits on a public endpoint using IP and optional User ID.
 * Throws a graceful error if limit is exceeded.
 */
export async function applyRateLimit(
  userId?: string | null,
  maxLimit = DEFAULT_MAX_LIMIT,
  windowMs = DEFAULT_WINDOW_MS,
) {
  let ip = "127.0.0.1";
  if (typeof window === "undefined") {
    try {
      const { headers } = await import("next/headers");
      const headersList = await headers();
      ip =
        headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
        headersList.get("x-real-ip") ||
        "127.0.0.1";
    } catch (e) {
      // If not in a request context, fallback to localhost
    }
  }

  // 2. Define rate limiting key (prefer User ID if authenticated, fallback to IP)
  const clientKey = userId || ip;

  const now = Date.now();
  if (!tracker.has(clientKey)) {
    tracker.set(clientKey, []);
  }

  const timestamps = tracker.get(clientKey)!;

  // Filter out expired timestamps outside the sliding window
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxLimit) {
    console.warn(`[Rate Limiter] Limit exceeded for key: ${clientKey}`);
    throw new Error(
      "Too Many Requests: Rate limit exceeded. Please wait a moment before trying again.",
    );
  }

  // Record this request
  validTimestamps.push(now);
  tracker.set(clientKey, validTimestamps);
}
