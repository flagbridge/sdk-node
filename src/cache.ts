interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

/** Simple in-memory cache with TTL. */
export class Cache {
  private store = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(ttlMs = 10_000) {
    this.ttlMs = ttlMs;
  }

  get(key: string): unknown | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: unknown): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
