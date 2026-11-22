'use strict';

/**
 * In-memory ABI cache with LRU eviction and TTL support.
 *
 * The cache stores contract ABIs keyed by contract id. Entries are evicted
 * either when the TTL (default 60s) expires or when an on-chain `update`
 * event for the explorer contract is observed by the indexer.
 */

const DEFAULT_TTL_MS = 60 * 1000;
const DEFAULT_MAX_ENTRIES = 256;

// The explorer contract emits `update` events when a contract's ABI changes.
// We detect those events so the stale ABI can be evicted immediately instead
// of waiting for the TTL to expire.
const EXPLORER_CONTRACT_ID = process.env.EXPLORER_CONTRACT_ID || 'explorer';
const UPDATE_EVENT_TOPIC = 'update';

class AbiCache {
  constructor({ ttlMs = DEFAULT_TTL_MS, maxEntries = DEFAULT_MAX_ENTRIES } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    // Map preserves insertion order, which we use to implement LRU eviction.
    this.store = new Map();
  }

  get(contractId) {
    const entry = this.store.get(contractId);
    if (!entry) {
      return undefined;
    }
    if (Date.now() - entry.cachedAt > this.ttlMs) {
      this.store.delete(contractId);
      return undefined;
    }
    // Refresh recency for LRU ordering.
    this.store.delete(contractId);
    this.store.set(contractId, entry);
    return entry.abi;
  }

  set(contractId, abi) {
    if (this.store.has(contractId)) {
      this.store.delete(contractId);
    }
    this.store.set(contractId, { abi, cachedAt: Date.now() });
    this._evictOverflow();
  }

  evict(contractId) {
    return this.store.delete(contractId);
  }

  clear() {
    this.store.clear();
  }

  _evictOverflow() {
    while (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }
  }
}

const abiCache = new AbiCache();

/**
 * Detect an `update` event emitted by the explorer contract.
 *
 * @param {object} ev indexer event
 * @returns {boolean} true when the event is an explorer update event
 */
function isExplorerUpdateEvent(ev) {
  if (!ev || typeof ev !== 'object') {
    return false;
  }
  const contractId = ev.contractId || ev.contract_id || ev.contract;
  const topic = ev.topic || ev.event || ev.name || ev.type;
  return contractId === EXPLORER_CONTRACT_ID && topic === UPDATE_EVENT_TOPIC;
}

/**
 * Evict the cached ABI for a contract so the next lookup re-fetches it.
 *
 * @param {string} contractId
 * @returns {boolean} true when an entry was evicted
 */
function evictContractMeta(contractId) {
  if (!contractId) {
    return false;
  }
  return abiCache.evict(contractId);
}

/**
 * Handle an indexer event. When an explorer `update` event is observed the
 * affected contract's ABI is evicted immediately, forcing a fresh fetch on
 * the next access rather than waiting for the TTL to expire.
 *
 * @param {object} ev indexer event
 * @returns {boolean} true when an eviction was triggered
 */
function handleIndexerEvent(ev) {
  if (!isExplorerUpdateEvent(ev)) {
    return false;
  }
  const contractId = ev.contractId || ev.contract_id || ev.contract;
  return evictContractMeta(contractId);
}

module.exports = {
  AbiCache,
  abiCache,
  isExplorerUpdateEvent,
  evictContractMeta,
  handleIndexerEvent,
  DEFAULT_TTL_MS,
  DEFAULT_MAX_ENTRIES,
  EXPLORER_CONTRACT_ID,
  UPDATE_EVENT_TOPIC,
};
