import { LRUCache } from "lru-cache";
import { scValToNative } from "@stellar/stellar-sdk";
import { db } from "./db.js";
import { detectSac } from "./sac.js";

/** @typedef {import('./types.js').DecodedEvent} DecodedEvent */
/** @typedef {import('./types.js').ContractMeta} ContractMeta */
/** @typedef {import('./types.js').FunctionAbi} FunctionAbi */

const contractMetaCache = new LRUCache({
  max: 500,
  ttl: 60_000,
});

/**
 * Decode a raw Soroban RPC event into a human-readable record.
 * Falls back to a generic description when no ABI is registered.
 *
 * @param {object} ev - Raw event object from SorobanRpc.getEvents()
 * @param {string}   ev.contractId - Strkey-encoded contract address
 * @param {object[]} ev.topic      - Array of XDR ScVal topic values
 * @param {object}   ev.value      - XDR ScVal event data value
 * @param {number}   ev.ledger     - Ledger sequence number
 * @param {string}   ev.txHash     - Transaction hash
 * @returns {Promise<DecodedEvent>}
 */
export async function decode(ev) {
  const contractId = ev.contractId;
  const topics = ev.topic.map((t) => scValToNative(t));
  const data = scValToNative(ev.value);

  // First topic is typically the function name symbol
  const fnName =
    typeof topics[0] === "symbol" || typeof topics[0] === "string" ? String(topics[0]) : "unknown";

  // Look up registered ABI for richer description (cached with 60s TTL)
  let meta = contractMetaCache.get(contractId);
  if (meta === undefined) {
    meta = await db.getContractMeta(contractId).catch(() => null);
    contractMetaCache.set(contractId, meta);
  }
  const fnAbi = meta?.functions?.find((f) => f.name === fnName);

  const { isSac, assetCode } = detectSac(contractId);
  const contractLabel = isSac
    ? `${assetCode} (SAC:${contractId.slice(0, 8)}…)`
    : (meta?.name ?? contractId);

  const description = fnAbi
    ? buildDescription(fnName, topics.slice(1), data, contractLabel)
    : genericDescription(fnName, topics.slice(1), data, contractLabel);

  const eventAddresses = extractAddresses([...topics.slice(1), data]);

  return {
    contract_id: contractId,
    function: fnName,
    ledger: ev.ledger,
    tx_hash: ev.txHash,
    description,
    raw_topics: topics.map(String),
    raw_data: JSON.stringify(data),
    event_addresses: eventAddresses,
    ...(isSac && { sac_asset: assetCode }),
  };
}

/**
 * Build a rich human-readable description using registered ABI parameter names.
 *
 * @param {string} fn            - Function / event name
 * @param {unknown[]} args       - Decoded topic values (topics[1..])
 * @param {unknown} data         - Decoded event data ScVal
 * @param {string} contractName  - Display name for the contract
 * @returns {string}
 */
export function buildDescription(fn, args, data, contractName) {
  switch (fn) {
    case "swap": {
      const [from, amtIn, tokenIn, amtOut, tokenOut] = args;
      return `Address ${fmt(from)} swapped ${amtIn} ${tokenIn} → ${amtOut} ${tokenOut} on ${contractName}`;
    }
    case "transfer": {
      const [from, to, amount, token] = args;
      return `Address ${fmt(from)} transferred ${amount} ${token ?? ""} to ${fmt(to)} on ${contractName}`;
    }
    case "transfer_from": {
      const [spender, from, to, amount, token] = args;
      return (
        `Address ${fmt(from)} (via ${fmt(spender)}) transferred ${amount} ${token ?? ""} ` +
        `to ${fmt(to)} on ${contractName}`
      );
    }
    case "mint": {
      const [to, amount, token] = args;
      return `${amount} ${token ?? ""} minted to ${fmt(to)} on ${contractName}`;
    }
    case "burn": {
      const [from, amount, token] = args;
      return `${amount} ${token ?? ""} burned from ${fmt(from)} on ${contractName}`;
    }
    case "burn_from": {
      const [spender, from, amount, token] = args;
      return (
        `${amount} ${token ?? ""} burned from ${fmt(from)} ` +
        `(via ${fmt(spender)}) on ${contractName}`
      );
    }
    default:
      return genericDescription(fn, args, data, contractName);
  }
}

/**
 * Produce a generic description for unrecognised function names.
 *
 * @param {string} fn           - Function / event name
 * @param {unknown[]} args      - Decoded topic values
 * @param {unknown} data        - Decoded event data (unused but kept for symmetry with buildDescription)
 * @param {string} contractId   - Contract address or display name
 * @returns {string}
 */
function genericDescription(fn, args, data, contractId) {
  const argStr = args.map(String).join(", ");
  return `${fn}(${argStr}) called on ${contractId}`;
}

/**
 * Walk through decoded values and collect all G… Stellar public addresses.
 *
 * @param {unknown[]} values - Decoded topic/data values from an event.
 * @returns {string[]} Deduplicated list of G… addresses found.
 */
function extractAddresses(values) {
  const found = new Set();
  const walk = (v) => {
    if (typeof v === "string" && /^G[A-Z0-9]{55}$/.test(v)) {
      found.add(v);
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === "object") {
      Object.values(v).forEach(walk);
    }
  };
  walk(values);
  return [...found];
}

function fmt(addr) {
  if (typeof addr !== "string" || addr.length < 10) {
    return String(addr);
  }
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
