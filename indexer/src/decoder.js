import { LRUCache } from "lru-cache";
import { scValToNative } from "@stellar/stellar-sdk"; // only scValToNative is used; xdr and StrKey are intentionally excluded (#30)
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
  const topics = ev.topic.map((t, index) => decodeTopic(t, ev, index));
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
    raw_data: JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
    event_addresses: eventAddresses,
    ...(isSac && { sac_asset: assetCode }),
  };
}

function decodeTopic(topic, ev, index) {
  try {
    return scValToNative(topic);
  } catch (err) {
    console.warn("Topic decode error:", {
      contractId: ev.contractId,
      ledger: ev.ledger,
      txHash: ev.txHash,
      topicIndex: index,
      rawTopic: topicToBase64(topic),
      error: err?.message ?? String(err),
    });
    return "<decode_error>";
  }
}

function topicToBase64(topic) {
  try {
    return typeof topic?.toXDR === "function" ? topic.toXDR("base64") : String(topic);
  } catch {
    return "<unserializable_topic>";
  }
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
      return `Address ${fmt(from)} (via ${fmt(spender)}) transferred ${amount} ${token ?? ""} to ${fmt(to)} on ${contractName}`;
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
      return `${amount} ${token ?? ""} burned from ${fmt(from)} (via ${fmt(spender)}) on ${contractName}`;
    }
    default:
      return genericDescription(fn, args, data, contractName);
  }
}

/** Regex for a valid Stellar public key (G… strkey). */
const VALID_STRKEY_RE = /^G[A-Z0-9]{55}$/;

/**
 * Return true when a stringified argument value looks sensitive and should be
 * redacted from the public description.  Matches:
 *  - 56-character strings starting with G that are NOT valid strkeys — could
 *    be encoded secrets masquerading as addresses.
 *  - Hex strings of 32+ bytes (64+ hex chars) — likely raw key / nonce material.
 *  - Base64 blobs of 44+ chars — could encode 32-byte secrets.
 *
 * @param {string} s - Stringified argument value.
 * @returns {boolean}
 */
function isSensitive(s) {
  // 56-char G-prefixed string that is NOT a valid public strkey
  if (s.length === 56 && s.startsWith("G") && !VALID_STRKEY_RE.test(s)) return true;
  // Raw hex data: 64+ contiguous hex characters
  if (/^[0-9a-fA-F]{64,}$/.test(s)) return true;
  // Base64 blob of ≥ 44 chars (covers 32-byte secrets encoded in base64)
  if (/^[A-Za-z0-9+/]{44,}={0,2}$/.test(s)) return true;
  return false;
}

/**
 * Sanitise a single stringified argument value for safe inclusion in a
 * human-readable description:
 *  1. Redact values that match a known sensitive pattern with "[REDACTED]".
 *  2. Truncate values longer than 64 characters to "first…last" form.
 *
 * @param {unknown} val - Raw decoded argument value.
 * @returns {string}
 */
function sanitiseArg(val) {
  const s = String(val);
  if (isSensitive(s)) {
    return "[REDACTED]";
  }
  if (s.length > 64) {
    return `${s.slice(0, 32)}…${s.slice(-16)}`;
  }
  return s;
}

/**
 * Produce a generic description for unrecognised function names.
 * Argument values are sanitised (truncated + sensitive patterns redacted)
 * before being embedded in the description to prevent leaking private data
 * into PostgreSQL / the public API.
 *
 * @param {string} fn           - Function / event name
 * @param {unknown[]} args      - Decoded topic values
 * @param {unknown} data        - Decoded event data (unused but kept for symmetry with buildDescription)
 * @param {string} contractId   - Contract address or display name
 * @returns {string}
 */
function genericDescription(fn, args, data, contractId) {
  const argStr = args.map(sanitiseArg).join(", ");
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
