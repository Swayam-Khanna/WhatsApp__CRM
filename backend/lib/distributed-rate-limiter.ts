import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  tierName?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterSeconds: number;
  headers: Record<string, string>;
}

// In-Memory fallback tracker for serverless environments when Redis is unconfigured
interface MemoryBucket {
  timestamps: number[];
}
const memoryStore = new Map<string, MemoryBucket>();

// Predefined security tiers
export const RATE_LIMIT_TIERS: Record<string, RateLimitConfig> = {
  auth: { maxRequests: 10, windowMs: 60_000, tierName: "auth" },
  api_standard: { maxRequests: 120, windowMs: 60_000, tierName: "api_standard" },
  webhook: { maxRequests: 300, windowMs: 60_000, tierName: "webhook" },
  broadcast: { maxRequests: 60, windowMs: 60_000, tierName: "broadcast" },
  public_query: { maxRequests: 90, windowMs: 60_000, tierName: "public_query" },
};

/**
 * Extracts normalized client identifier from request (prioritizing authenticated User ID or verified client IP).
 */
export function extractClientIdentifier(req: Request | NextRequest, userId?: string | null): string {
  if (userId) return `usr:${userId}`;
  
  const headers = req.headers;
  const forwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const rawIp = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || "127.0.0.1";
  
  // Hash IP to protect PII while maintaining distinct rate limiting buckets
  const ipHash = crypto.createHash("sha256").update(rawIp).digest("hex").slice(0, 16);
  return `ip:${ipHash}`;
}

/**
 * Checks and increments distributed sliding window rate limit.
 * Uses Upstash Redis REST if configured, with automatic in-memory sliding-window fallback.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMIT_TIERS.api_standard
): Promise<RateLimitResult> {
  const { maxRequests, windowMs, tierName = "general" } = config;
  const now = Date.now();
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // 1. Upstash Redis REST Implementation (Zero-cold-start Distributed Rate Limiting)
  if (upstashUrl && upstashToken && !upstashUrl.includes("placeholder")) {
    try {
      const redisKey = `ratelimit:${tierName}:${identifier}`;
      const windowStart = now - windowMs;

      // Pipeline execution via Upstash REST API:
      // 1. ZREMRANGEBYSCORE (clear timestamps outside window)
      // 2. ZADD (add current timestamp)
      // 3. ZCARD (count current requests)
      // 4. PEXPIRE (set TTL to window duration)
      const pipelineBody = [
        ["ZREMRANGEBYSCORE", redisKey, "0", String(windowStart)],
        ["ZADD", redisKey, String(now), `${now}-${Math.random().toString(36).slice(2, 7)}`],
        ["ZCARD", redisKey],
        ["PEXPIRE", redisKey, String(windowMs)],
      ];

      const res = await fetch(`${upstashUrl.replace(/\/$/, "")}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pipelineBody),
        signal: AbortSignal.timeout(1500), // Strict 1.5s timeout: never block critical requests
      });

      if (res.ok) {
        const results = await res.json();
        const currentCount = Number(results[2]?.result || 1);
        const remaining = Math.max(0, maxRequests - currentCount);
        const success = currentCount <= maxRequests;
        const retryAfterSeconds = success ? 0 : Math.ceil(windowMs / 1000);

        return {
          success,
          limit: maxRequests,
          remaining,
          resetMs: now + windowMs,
          retryAfterSeconds,
          headers: {
            "X-RateLimit-Limit": String(maxRequests),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(Math.ceil((now + windowMs) / 1000)),
            ...(retryAfterSeconds > 0 ? { "Retry-After": String(retryAfterSeconds) } : {}),
          },
        };
      }
    } catch (err: any) {
      console.warn("[DistributedRateLimiter] Redis REST check failed, activating resilient in-memory fallback:", err?.message || err);
    }
  }

  // 2. Resilient In-Memory Sliding-Window Fallback
  const bucketKey = `${tierName}:${identifier}`;
  let bucket = memoryStore.get(bucketKey);
  if (!bucket) {
    bucket = { timestamps: [] };
    memoryStore.set(bucketKey, bucket);
  }

  // Purge expired entries
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);

  const currentCount = bucket.timestamps.length + 1;
  const success = currentCount <= maxRequests;
  const remaining = Math.max(0, maxRequests - currentCount);
  const retryAfterSeconds = success ? 0 : Math.ceil(windowMs / 1000);

  if (success) {
    bucket.timestamps.push(now);
  }

  // Periodic memory store cleanup
  if (memoryStore.size > 5000) {
    for (const [k, v] of memoryStore.entries()) {
      if (v.timestamps.length === 0 || now - v.timestamps[v.timestamps.length - 1] > windowMs) {
        memoryStore.delete(k);
      }
    }
  }

  return {
    success,
    limit: maxRequests,
    remaining,
    resetMs: now + windowMs,
    retryAfterSeconds,
    headers: {
      "X-RateLimit-Limit": String(maxRequests),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(Math.ceil((now + windowMs) / 1000)),
      ...(retryAfterSeconds > 0 ? { "Retry-After": String(retryAfterSeconds) } : {}),
    },
  };
}

/**
 * Convenience helper to enforce rate limit on NextRequest endpoints.
 * Returns null if allowed, or an RFC 6585 compliant HTTP 429 Response if rate limit is exceeded.
 */
export async function enforceRateLimit(
  req: NextRequest,
  config: RateLimitConfig = RATE_LIMIT_TIERS.api_standard,
  userId?: string | null
): Promise<NextResponse | null> {
  const clientId = extractClientIdentifier(req, userId);
  const result = await checkRateLimit(clientId, config);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Too Many Requests",
        message: `Rate limit of ${result.limit} requests per ${Math.round(config.windowMs / 1000)}s exceeded. Please retry after ${result.retryAfterSeconds} seconds.`,
        retryAfter: result.retryAfterSeconds,
      },
      {
        status: 429,
        headers: result.headers,
      }
    );
  }

  return null;
}

/**
 * Checks rate limit and returns the result with headers to attach to subsequent responses.
 */
export async function getRateLimitResult(
  req: NextRequest,
  config: RateLimitConfig = RATE_LIMIT_TIERS.api_standard,
  userId?: string | null
): Promise<{ blockedResponse: NextResponse | null; result: RateLimitResult }> {
  const clientId = extractClientIdentifier(req, userId);
  const result = await checkRateLimit(clientId, config);

  if (!result.success) {
    return {
      blockedResponse: NextResponse.json(
        {
          error: "Too Many Requests",
          message: `Rate limit of ${result.limit} requests per ${Math.round(config.windowMs / 1000)}s exceeded. Please retry after ${result.retryAfterSeconds} seconds.`,
          retryAfter: result.retryAfterSeconds,
        },
        {
          status: 429,
          headers: result.headers,
        }
      ),
      result,
    };
  }

  return { blockedResponse: null, result };
}

export function attachRateLimitHeaders<T extends Response>(res: T, result: RateLimitResult): T {
  for (const [k, v] of Object.entries(result.headers)) {
    res.headers.set(k, v);
  }
  return res;
}
