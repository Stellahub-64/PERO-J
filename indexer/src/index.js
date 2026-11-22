import dotenv from "dotenv";
import { SorobanRpc, StrKey } from "@stellar/stellar-sdk";
import { startApi } from "./api.js";
import { db } from "./db.js";
import { registerFixtures } from "./registerFixtures.js";
import { decode, evictContractMeta } from "./decoder.js";
import { reloadSacMap } from "./sac.js";
import { validateNetwork } from "./validateNetwork.js";
import { submitEvent } from "./contract.js";
import { resolvePollMs } from "./resolvePollMs.js";

dotenv.config();

/** @typedef {import('./types.js').HealthState} HealthState */

const RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const START_LEDGER = Number(process.env.START_LEDGER || 0);
const POLL_MS = resolvePollMs();
const RPC_ERROR_THRESHOLD = 3;
const EXPLORER_CONTRACT_ID = process.env.SOROBAN_EXPLORER_CONTRACT_ID;

/**
 * Advisory lock id used to serialize migrations across indexer instances.
 * Any two instances sharing this id will not run migrations concurrently.
 */
const MIGRATION_LOCK_ID = 836;

let rpc = new SorobanRpc.Server(RPC_URL, { allowHttp: true });

/**
 * Shared health state exposed to the REST API via api.js.
 * Updated each time a ledger is successfully indexed.
 *
 * @type {HealthState}
 */
export const health = {
  /** Timestamp (ms) of the last successfully processed ledger, or null if none yet. */
  lastIndexedAt: null,
  /** Most-recently processed ledger sequence number. */
  lastLedger: null,
  /** Process start time for uptime calculation. */
  startedAt: Date.now(),
};

/**
 * Recursively walk decoded topic/data values and collect every Stellar
 * public key (strkey `G…`, 56 chars) found in the structure.
 *
 * Handles nested arrays and plain objects so addresses embedded in
 * structs, vectors, and maps are all discovered.
 *
 * @param {*} values - Decoded value(s) to scan.
 * @param {Set<string>} [found] - Accumulator for deduplication.
 * @returns {string[]} Deduplicated list of Stellar public keys.
 */
export function extractAddresses(values, found = new Set()) {
  if (values === null || values === undefined) {
    return [...found];
  }

  if (typeof values === "string") {
    if (values.length === 56 && values.startsWith("G")) {
      try {
        if (StrKey.isValidEd25519PublicKey(values)) {
          found.add(values);
        }
      } catch {
        // Not a valid strkey — ignore.
      }
    }
    return [...found];
  }

  if (Array.isArray(values)) {
    for (const item of values) {
      extractAddresses(item, found);
    }
    return [...found];
  }

  if (typeof values === "object") {
    for (const value of Object.values(values)) {
      extractAddresses(value, found);
    }
  }

  return [...found];
}

export async function indexLedger(ledger, rpcClient = rpc) {
  // getEvents supports cursor-based pagination; we use ledger range here
  const res = await rpcClient.getEvents({
    startLedger: ledger,
    filters: [{ type: "contract" }],
    limit: 200,
  });

  for (const ev of res.events) {
    // On-chain `update` events from the explorer contract let us invalidate
    // the in-memory ABI cache immediately, instead of waiting for the 60s LRU
    // TTL to expire, so an ABI update is reflected near-instantly.
    if (isExplorerUpdateEvent(ev)) {
      const targetContractId = updateEventContractId(ev);
      if (targetContractId) {
        evictContractMeta(targetContractId);
      }
      continue;
    }

    const decoded = await decode(ev);
    decoded.event_addresses = extractAddresses([decoded.topic, decoded.data]);
    const onchain_seq = await submitEvent(decoded);
    if (onchain_seq !== null) {
      decoded.onchain_seq = onchain_seq;
    }
    await db.upsertEvent(decoded);
    console.log(`[${ev.ledger}] ${decoded.function}: ${decoded.description}`);
  }

  // Record the time we finished processing this ledger batch
  health.lastIndexedAt = Date.now();
  health.lastLedger = res.latestLedger;

  return res.latestLedger;
}

/**
 * Return true when an event is the explorer contract's `update` event, which
 * signals that a registered contract's ABI metadata changed on-chain.
 *
 * The first topic is the `update` symbol; the second is the target contract's
 * raw 32-byte id held in `BytesN<32>`.
 *
 * @param {object} ev - Raw event object from SorobanRpc.getEvents()
 * @returns {boolean}
 */
export function isExplorerUpdateEvent(ev) {
  if (!EXPLORER_CONTRACT_ID || ev.contractId !== EXPLORER_CONTRACT_ID) {
    return false;
  }
  const topic = ev.topic?.[0];
  if (!topic) {
    return false;
  }
  try {
    const symbol =
      typeof topic.sym === "function" ? topic.sym() : topic.value?.()?.sym();
    return symbol === "update";
  } catch {
    return false;
  }
}

/**
 * Extract the strkey contract id (C…) of the contract whose ABI was updated
 * from an explorer `update` event, or null if it cannot be recovered.
 *
 * @param {object} ev - Raw event object from SorobanRpc.getEvents()
 * @returns {string|null}
 */
export function updateEventContractId(ev) {
  const topic = ev.topic?.[1];
  if (!topic) {
    return null;
  }
  try {
    const bytes = topic.bytes();
    return StrKey.encodeContract(bytes);
  } catch {
    return null;
  }
}

let shuttingDown = false;

function gracefulShutdown() {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log("Shutdown signal received, finishing current iteration…");
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
process.on("SIGHUP", () => {
  console.log("SIGHUP received, reloading environment and SAC map...");
  dotenv.config({ override: true });
  reloadSacMap();
});

/**
 * Run migrations under a Postgres advisory lock so that two indexer instances
 * starting at the same time cannot run migrations concurrently (which would
 * cause duplicate-key errors or partial state).
 *
 * The lock is always released in `finally`; a failed unlock is logged but
 * never masks the original migration error.
 */
async function initWithMigrationLock() {
  await db.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
  try {
    await db.init();
  } catch (err) {
    // Roll back any partial migration state before releasing the lock.
    try {
      await db.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("[migrations] rollback failed:", rollbackErr.message);
    }
    throw err;
  } finally {
    try {
      await db.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]);
    } catch (unlockErr) {
      console.error("[migrations] failed to release advisory lock:", unlockErr.message);
    }
  }
}

async function run() {
  await initWithMigrationLock();
  await registerFixtures().catch((err) => {
    console.error("[fixtures] failed to register ABI fixtures:", err.message);
  });

  startApi();

  await validateNetwork(rpc);

  const persisted = await db.getCursor();
  let cursor = persisted ?? (START_LEDGER || (await rpc.getLatestLedger()).sequence - 100);
  if (persisted !== null) {
    console.log(`Resuming from persisted ledger ${cursor}`);
  }

  let consecutiveErrors = 0;

  while (!shuttingDown) {
    try {
      const latest = await indexLedger(cursor);
      cursor = latest + 1;
      await db.setCursor(latest);
      consecutiveErrors = 0;
    } catch (err) {
      consecutiveErrors++;
      console.error("Indexer error:", err.message);
      if (consecutiveErrors >= RPC_ERROR_THRESHOLD) {
        console.warn(`${consecutiveErrors} consecutive RPC errors — recreating RPC client`);
        rpc = new SorobanRpc.Server(RPC_URL, { allowHttp: true });
        consecutiveErrors = 0;
      }
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  await db.close();
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
