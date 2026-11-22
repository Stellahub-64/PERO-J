// Indexer ABI cache
//
// Registered ABIs are cached for the full TTL. Negative (not-registered)
// lookups use a much shorter TTL so that a contract registered during the
// negative-cache window is re-discovered quickly instead of being served
// generic descriptions until the long TTL expires.

const ABI_TTL_MS = 60 * 1000;
const NOT_REGISTERED_TTL_MS = 2000;

// Map<contractId, { abi: object | null, expiresAt: number }>
const abiCache = new Map();

/**
 * Resolve the ABI for a contract, using a short-lived negative cache for
 * contracts that are not (yet) registered.
 *
 * @param {string} contractId
 * @param {(contractId: string) => Promise<object | null>} fetchAbi
 * @returns {Promise<object | null>}
 */
async function getAbi(contractId, fetchAbi) {
  const now = Date.now();
  const cached = abiCache.get(contractId);

  if (cached && cached.expiresAt > now) {
    return cached.abi;
  }

  const abi = await fetchAbi(contractId);

  // Negative lookups (null ABI) expire quickly so newly registered
  // contracts are picked up within NOT_REGISTERED_TTL_MS.
  const ttl = abi ? ABI_TTL_MS : NOT_REGISTERED_TTL_MS;
  abiCache.set(contractId, { abi, expiresAt: now + ttl });

  return abi;
}

module.exports = {
  ABI_TTL_MS,
  NOT_REGISTERED_TTL_MS,
  getAbi,
};
