import { LRUCache } from "lru-cache";
import { scValToNative, StrKey } from "@stellar/stellar-sdk";
import { db } from "./db.js";
import { detectSac } from "./sac.js";
import { scValToJs } from "./scval.js";

/** @typedef {import('./types.js').DecodedEvent} DecodedEvent */
/** @typedef {import('./types.js').ContractMeta} ContractMeta */
/** @typedef {import('./types.js').FunctionAbi} FunctionAbi */

const contractMetaCache = new LRUCache({
  max: 500,
  ttl: 60_000,
});

// How long a "not registered" (null) lookup stays cached. This is deliberately
// much shorter than the ABI TTL so that a contract registered in the DB during
// the 60s ABI cache window is re-discovered promptly instead of being stuck
// behind a stale null value for up to the full window.
const NOT_REGISTERED_TTL_MS = 2_000;

export function serializeRawData(data) {
  return JSON.stringify(data, (_, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
}

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
  const data = scValToJs(ev.value);

  // First topic is typically the function name symbol
  const fnName =
    typeof topics[0] === "symbol" || typeof topics[0] === "string" ? String(topics[0]) : "unknown";

  // Look up registered ABI for richer description (cached with 60s TTL).
  // Distinguish between "not yet checked" (no cache entry → always query DB)
  // and "not registered" (explicit negative entry cached briefly) so that a
  // contract registered while events are flowing is decoded against the new ABI
  // as soon as the short negative cache expires.
  let meta = contractMetaCache.get(contractId);
  if (meta === undefined) {
    meta = await db.getContractMeta(contractId).catch(() => null);
    if (meta !== null) {
      contractMetaCache.set(contractId, meta);
    } else {
      contractMetaCache.set(contractId, null, { ttl: NOT_REGISTERED_TTL_MS });
    }
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
    raw_data: serializeRawData(data),
    event_addresses: eventAddresses,
    ...(isSac && { sac_asset: assetCode }),
  };
}

function decodeTopic(topic, ev, index) {
  try {
    return scValToJs(topic);
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
      const [from, to] = args;
      const amount = data;
      return `Address ${fmt(from)} transferred ${amount} to ${fmt(to)} on ${contractName}`;
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
    case "transfer_from": {
      const [owner, spender, to, amount, token] = args;
      return `Address ${fmt(owner)} (via ${fmt(spender)}) transferred ${amount} ${token ?? ""} to ${fmt(to)} on ${contractName}`;
    }
    case "burn_from": {
      const [owner, spender, amount, token] = args;
      return `${amount} ${token ?? ""} burned from ${fmt(owner)} (via ${fmt(spender)}) on ${contractName}`;
    }
    case "approve": {
      const [from, spender] = args;
      return `Address ${fmt(from)} approved ${fmt(spender)} to spend on ${contractName}`;
    }
    case "deposit": {
      const [from, amount, token] = args;
      return `Address ${fmt(from)} deposited ${amount} ${token ?? ""} into ${contractName}`;
    }
    case "withdraw": {
      const [from, amount, token] = args;
      return `Address ${fmt(from)} withdrew ${amount} ${token ?? ""} from ${contractName}`;
    }
    case "stake": {
      const [from, amount, token] = args;
      return `Address ${fmt(from)} staked ${amount} ${token ?? ""} on ${contractName}`;
    }
    case "unstake": {
      const [from, amount, token] = args;
      return `Address ${fmt(from)} unstaked ${amount} ${token ?? ""} on ${contractName}`;
    }
    case "supply": {
      const [from, token, amount] = args;
      return `Address ${fmt(from)} supplied ${amount} ${token ?? ""} into ${contractName}`;
    }
    case "borrow": {
      const [from, token, amount] = args;
      return `Address ${fmt(from)} borrowed ${amount} ${token ?? ""} from ${contractName}`;
    }
    case "repay": {
      const [from, token, amount] = args;
      return `Address ${fmt(from)} repaid ${amount} ${token ?? ""} on ${contractName}`;
    }
    case "liquidate": {
      const [borrower, liquidator, token, amount] = args;
      return `Address ${fmt(liquidator)} liquidated ${fmt(borrower)} for ${amount} ${token ?? ""} on ${contractName}`;
    }
    case "deposit": {
      const [from, amount, token] = args;
      return `Address ${fmt(from)} deposited ${amount} ${token ?? ""} into ${contractName}`;
    }
    case "withdraw": {
      const [from, amount, token] = args;
      return `Address ${fmt(from)} withdrew ${amount} ${token ?? ""} from ${contractName}`;
    }
    default:
      return genericDescription(fn, args, data, contractName);
  }
}

/** Regex for the shape of a Stellar public key (G… strkey). */
const VALID_STRKEY_RE = /^G[A-Z0-9]{55}$/;

/**
 * Maximum length for non-address string arguments displayed in generic event
 * descriptions.  Values longer than this are truncated to "first32…last16".
 * Valid 56-char Stellar strkeys bypass this limit.
 */
const MAX_ARG_DISPLAY_LEN = 128;

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
  if (s.length === 56 && s.startsWith("G") && !StrKey.isValidEd25519PublicKey(s)) {
    return true;
  }
  // Raw hex data: 64+ contiguous hex characters
  if (/^[0-9a-fA-F]{64,}$/.test(s)) {
    return true;
  }
  // Base64 blob of ≥ 44 chars, including any trailing padding
  if (s.length >= 44 && /^[A-Za-z0-9+/]+={0,2}$/.test(s)) {
    return true;
  }
  return false;
}

/**
 * Sanitise a single stringified argument value for safe inclusion in a
 * human-readable description:
 *  1. Redact values that match a known sensitive pattern with "[REDACTED]".
 *  2. Bypass truncation for valid Stellar strkeys (56 chars, always safe).
 *  3. Truncate non-address values longer than MAX_ARG_DISPLAY_LEN to
 *     "first32…last16" form.
 *
 * @param {unknown} val - Raw decoded argument value.
 * @returns {string}
 */
function sanitiseArg(val) {
  const s = String(val);
  if (StrKey.isValidEd25519PublicKey(s)) {
    return s;
  }
  if (isSensitive(s)) {
    return "[REDACTED]";
  }
  if (s.length > MAX_ARG_DISPLAY_LEN) {
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
    if (typeof v === "string" && VALID_STRKEY_RE.test(v)) {
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

const ADDRESS_RE = /^[GC][A-Z0-9]{55}$/;

/**
 * Evict a cached contract-meta entry so the next decoded event for that
 * contract re-fetches fresh ABI metadata from the DB.
 *
 * Called by the indexer when it observes an on-chain `update` event for a
 * contract, so that ABI cache invalidation is near-instant instead of waiting
 * for the 60s LRU TTL to expire.
 *
 * @param {string} contractId - Strkey-encoded contract address (C…)
 */
export function evictContractMeta(contractId) {
  if (contractId) {
    contractMetaCache.delete(contractId);
  }
}

export function fmt(addr) {
  if (typeof addr === "string" && ADDRESS_RE.test(addr)) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }
  return typeof addr === "string" ? addr : String(addr);
}

