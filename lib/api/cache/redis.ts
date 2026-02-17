/**
 * Cache utilities backed by Redis when available and an in-memory fallback otherwise.
 */

import { createClient } from "redis";

interface CacheEnvelope<T> {
  value: T;
  expiresAt: number;
}

interface MemoryRecord {
  serialized: string;
  expiresAt: number;
}

type RedisClientLike = {
  connect: () => Promise<unknown>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { EX: number }) => Promise<unknown>;
  del: (key: string) => Promise<number>;
  on?: (event: "error", listener: (error: unknown) => void) => void;
  isOpen?: boolean;
};

const CACHE_PREFIX = "validate-my-idea:signals";
const MAX_MEMORY_ENTRIES = 1_000;

const memoryCache = new Map<string, MemoryRecord>();
let redisClientPromise: Promise<RedisClientLike | null> | null = null;
let loggedRedisFallback = false;

function nowMs(): number {
  return Date.now();
}

function toNamespacedKey(key: string): string {
  return `${CACHE_PREFIX}:${key}`;
}

function pruneMemoryCache(): void {
  const now = nowMs();

  for (const [key, record] of memoryCache) {
    if (record.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }

  if (memoryCache.size <= MAX_MEMORY_ENTRIES) {
    return;
  }

  const sorted = [...memoryCache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
  const entriesToRemove = memoryCache.size - MAX_MEMORY_ENTRIES;

  for (let index = 0; index < entriesToRemove; index += 1) {
    const entry = sorted[index];
    if (entry) {
      memoryCache.delete(entry[0]);
    }
  }
}

function readFromMemory<T>(key: string): T | null {
  const namespacedKey = toNamespacedKey(key);
  const record = memoryCache.get(namespacedKey);

  if (!record) {
    return null;
  }

  if (record.expiresAt <= nowMs()) {
    memoryCache.delete(namespacedKey);
    return null;
  }

  try {
    const envelope = JSON.parse(record.serialized) as CacheEnvelope<T>;
    return envelope.value;
  } catch {
    memoryCache.delete(namespacedKey);
    return null;
  }
}

function writeToMemory<T>(key: string, value: T, ttlSeconds: number): string {
  const namespacedKey = toNamespacedKey(key);
  const envelope: CacheEnvelope<T> = {
    value,
    expiresAt: nowMs() + ttlSeconds * 1_000
  };

  const serialized = JSON.stringify(envelope);

  memoryCache.set(namespacedKey, {
    serialized,
    expiresAt: envelope.expiresAt
  });

  pruneMemoryCache();

  return serialized;
}

async function getRedisClient(): Promise<RedisClientLike | null> {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    return null;
  }

  if (redisClientPromise) {
    return redisClientPromise;
  }

  redisClientPromise = (async () => {
    try {
      const client = createClient({ url: redisUrl });
      client.on?.("error", (error: unknown) => {
        if (!loggedRedisFallback) {
          console.error("[api-cache] Redis connection error. Falling back to in-memory cache.", error);
          loggedRedisFallback = true;
        }
      });

      if (!client.isOpen) {
        await client.connect();
      }

      return client;
    } catch (error) {
      if (!loggedRedisFallback) {
        console.warn("[api-cache] Redis unavailable. In-memory cache will be used.", error);
        loggedRedisFallback = true;
      }

      return null;
    }
  })();

  return redisClientPromise;
}

/**
 * Stable cache key builder for API source requests.
 */
export function buildCacheKey(namespace: string, params: Record<string, string | number | undefined>): string {
  const sortedPairs = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  const parts = sortedPairs.map(([key, value]) => `${key}=${String(value)}`);
  return `${namespace}:${parts.join("|")}`;
}

/**
 * Reads a cache entry from memory first, then Redis when configured.
 */
export async function getCacheValue<T>(key: string): Promise<T | null> {
  const memoryHit = readFromMemory<T>(key);
  if (memoryHit !== null) {
    return memoryHit;
  }

  const redisClient = await getRedisClient();
  if (!redisClient) {
    return null;
  }

  const namespacedKey = toNamespacedKey(key);

  try {
    const serialized = await redisClient.get(namespacedKey);
    if (!serialized) {
      return null;
    }

    const envelope = JSON.parse(serialized) as CacheEnvelope<T>;

    if (envelope.expiresAt <= nowMs()) {
      await redisClient.del(namespacedKey);
      return null;
    }

    memoryCache.set(namespacedKey, {
      serialized,
      expiresAt: envelope.expiresAt
    });

    return envelope.value;
  } catch {
    return null;
  }
}

/**
 * Writes a cache entry to memory and Redis (when available).
 */
export async function setCacheValue<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  if (ttlSeconds <= 0) {
    throw new Error(`Cache TTL must be greater than zero for key "${key}"`);
  }

  const serialized = writeToMemory(key, value, ttlSeconds);

  const redisClient = await getRedisClient();
  if (!redisClient) {
    return;
  }

  const namespacedKey = toNamespacedKey(key);

  try {
    await redisClient.set(namespacedKey, serialized, { EX: ttlSeconds });
  } catch {
    // Redis write failures should not block core execution.
  }
}

/**
 * Cached read-through helper for source integrations.
 */
export async function getOrSetCache<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const cached = await getCacheValue<T>(key);
  if (cached !== null) {
    return cached;
  }

  const value = await loader();
  await setCacheValue(key, value, ttlSeconds);
  return value;
}
