interface Bucket {
  tokens: number;
  updatedAt: number;
}

interface Rule {
  capacity: number;
  perSecond: number;
}

const RULES: Record<string, Rule> = {
  'room:create': { capacity: 4, perSecond: 0.2 },
  'room:solo': { capacity: 6, perSecond: 0.3 },
  'room:join': { capacity: 8, perSecond: 0.5 },
  'room:quickmatch': { capacity: 5, perSecond: 0.2 },
  'room:config': { capacity: 12, perSecond: 1 },
  'room:ready': { capacity: 15, perSecond: 1 },
  'room:votekick': { capacity: 6, perSecond: 0.2 },
  'room:remove': { capacity: 6, perSecond: 0.2 },
  'invite:send': { capacity: 5, perSecond: 0.1 },
  'presence:watch': { capacity: 10, perSecond: 0.5 },
  'game:guess': { capacity: 12, perSecond: 2 },
  'game:move': { capacity: 12, perSecond: 2 },
  'game:hint': { capacity: 4, perSecond: 0.2 },
  'game:skip': { capacity: 6, perSecond: 0.3 },
};

const DEFAULT_RULE: Rule = { capacity: 20, perSecond: 2 };

const buckets = new Map<string, Bucket>();

export function take(userId: string, action: string) {
  const rule = RULES[action] ?? DEFAULT_RULE;
  const key = `${userId}:${action}`;
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: rule.capacity, updatedAt: now };

  const elapsed = (now - bucket.updatedAt) / 1000;
  bucket.tokens = Math.min(rule.capacity, bucket.tokens + elapsed * rule.perSecond);
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}

export function sweepBuckets() {
  const cutoff = Date.now() - 10 * 60 * 1000;

  for (const [key, bucket] of buckets) {
    if (bucket.updatedAt < cutoff) buckets.delete(key);
  }
}

export function bucketCount() {
  return buckets.size;
}

export function httpLimiter(capacity: number, perSecond: number) {
  const hits = new Map<string, Bucket>();

  return (ip: string) => {
    const now = Date.now();
    const bucket = hits.get(ip) ?? { tokens: capacity, updatedAt: now };
    const elapsed = (now - bucket.updatedAt) / 1000;

    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * perSecond);
    bucket.updatedAt = now;

    if (bucket.tokens < 1) {
      hits.set(ip, bucket);
      return false;
    }

    bucket.tokens -= 1;
    hits.set(ip, bucket);
    return true;
  };
}
