// In-memory sliding window rate limiter with bounded storage & LRU eviction
interface RateLimitRecord {
  timestamps: number[];
  lastAccessed: number;
}

const MAX_STORE_ENTRIES = 10000;
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes with unreferenced timer
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((record, key) => {
      record.timestamps = record.timestamps.filter((ts: number) => now - ts < 300000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    });
  }, 300000);

  // Unreference timer so it doesn't hold Node process open
  if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Checks and updates the rate limit for a given key.
 * Enforces sliding window rate limits with memory safety bounds.
 * 
 * Deployment Note:
 * This in-memory implementation is optimized for single-instance or persistent Node runtimes.
 * In a horizontally autoscaling multi-instance setup, distributed state (e.g. Redis) can be plugged in seamlessly.
 *
 * @param key Unique identifier (e.g. `ip:endpoint` or `userId:action`)
 * @param limit Maximum allowed requests in the time window
 * @param windowMs Time window in milliseconds (default: 60000ms / 1 min)
 */
export function checkRateLimit(key: string, limit: number, windowMs: number = 60000): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Enforce memory bounds: if store exceeds capacity, prune oldest entries
  if (!rateLimitStore.has(key) && rateLimitStore.size >= MAX_STORE_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    rateLimitStore.forEach((rec, k) => {
      if (rec.lastAccessed < oldestAccess) {
        oldestAccess = rec.lastAccessed;
        oldestKey = k;
      }
    });

    if (oldestKey) {
      rateLimitStore.delete(oldestKey);
    }
  }

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [], lastAccessed: now };
    rateLimitStore.set(key, record);
  } else {
    record.lastAccessed = now;
  }

  // Filter out timestamps outside the active sliding window
  record.timestamps = record.timestamps.filter((ts: number) => ts > windowStart);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0] || now;
    const reset = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.max(1, reset),
    };
  }

  record.timestamps.push(now);

  return {
    success: true,
    limit,
    remaining: limit - record.timestamps.length,
    reset: Math.ceil(windowMs / 1000),
  };
}

/**
 * Extracts client IP address safely from Request headers
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Diagnostic utility for test suites and health checks
 */
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}

/**
 * Diagnostic utility for test suites
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
