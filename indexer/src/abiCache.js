'use strict';

/**
 * ABI cache for the indexer.
 *
 * Positive (registered) ABI lookups are cached for the full TTL, while
 * negative (not-registered) lookups use a much shorter TTL so that a
 * contract registered shortly after a failed lookup is re-discovered
 * quickly instead of waiting for the full cache window to expire.
 */

const ABI_TTL_MS = 60 * 1000;
const NOT_REGISTERED_TTL_MS = 2000;

class AbiCache {
  constructor({ ttlMs = ABI_TTL_MS, notRegisteredTtlMs = NOT_REGISTERED_TTL_MS } = {}) {
    this.ttlMs = ttlMs;
    this.notRegisteredTtlMs = notRegisteredTtlMs;
    this.cache = new Map();
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key, value) {
    const ttl = value == null ? this.notRegisteredTtlMs : this.ttlMs;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

module.exports = {
  AbiCache,
  ABI_TTL_MS,
  NOT_REGISTERED_TTL_MS,
};
