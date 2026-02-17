/**
 * Lightweight in-process rate limiter for outbound third-party API calls.
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  namespace: string;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimitExceededError extends Error {
  public readonly retryAfterMs: number;
  public readonly namespace: string;
  public readonly identifier: string;

  constructor(namespace: string, identifier: string, retryAfterMs: number) {
    super(`Rate limit exceeded for ${namespace}`);
    this.name = "RateLimitExceededError";
    this.retryAfterMs = retryAfterMs;
    this.namespace = namespace;
    this.identifier = identifier;
  }
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

function getBucketKey(identifier: string, namespace: string): string {
  return `${namespace}:${identifier}`;
}

function compactBuckets(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  if (buckets.size <= MAX_BUCKETS) {
    return;
  }

  const sorted = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
  const overage = buckets.size - MAX_BUCKETS;

  for (let index = 0; index < overage; index += 1) {
    const entry = sorted[index];
    if (entry) {
      buckets.delete(entry[0]);
    }
  }
}

/**
 * Checks and consumes one request from the configured rate-limit bucket.
 */
export function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitStatus {
  const now = Date.now();
  compactBuckets(now);

  const key = getBucketKey(identifier, config.namespace);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + config.windowMs;
    buckets.set(key, {
      count: 1,
      resetAt
    });

    return {
      allowed: true,
      remaining: Math.max(0, config.maxRequests - 1),
      resetAt
    };
  }

  if (existing.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt
    };
  }

  existing.count += 1;

  return {
    allowed: true,
    remaining: Math.max(0, config.maxRequests - existing.count),
    resetAt: existing.resetAt
  };
}

/**
 * Throws a structured error when the provided bucket has been exhausted.
 */
export function enforceRateLimit(identifier: string, config: RateLimitConfig): void {
  const status = checkRateLimit(identifier, config);

  if (!status.allowed) {
    const retryAfterMs = Math.max(0, status.resetAt - Date.now());
    throw new RateLimitExceededError(config.namespace, identifier, retryAfterMs);
  }
}
