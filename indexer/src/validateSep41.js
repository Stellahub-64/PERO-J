/**
 * SEP-41 compliance validator.
 *
 * Simulates each mandatory SEP-41 interface function against the target
 * contract. A simulation error means the function exists but rejected our
 * dummy args (expected). A "not found" / "no such function" error means the
 * function is absent (non-compliant).
 *
 * Usage:
 *   node src/validateSep41.js <contractId>
 */
import "dotenv/config";
import { fileURLToPath } from "url";
import {
  SorobanRpc,
  TransactionBuilder,
  Networks,
  Account,
  Contract,
  nativeToScVal,
  Address,
} from "@stellar/stellar-sdk";

const RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || Networks.TESTNET;
const DUMMY_SOURCE = "GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR";
const MAX_CONCURRENT_CHECKS = 3;
const MAX_RATE_LIMIT_RETRIES = 3;
const RATE_LIMIT_RETRY_BASE_MS = 250;

const rpc = new SorobanRpc.Server(RPC_URL, { allowHttp: true });

// Dummy ScVal arguments for each mandatory function signature
const DUMMY_ADDR = nativeToScVal(Address.fromString(DUMMY_SOURCE), { type: "address" });
const DUMMY_I128 = nativeToScVal(0n, { type: "i128" });

const SEP41_FUNCTIONS = [
  { name: "name", args: [] },
  { name: "symbol", args: [] },
  { name: "decimals", args: [] },
  { name: "balance", args: [DUMMY_ADDR] },
  { name: "allowance", args: [DUMMY_ADDR, DUMMY_ADDR] },
  { name: "transfer", args: [DUMMY_ADDR, DUMMY_ADDR, DUMMY_I128] },
  { name: "transfer_from", args: [DUMMY_ADDR, DUMMY_ADDR, DUMMY_ADDR, DUMMY_I128] },
  {
    name: "approve",
    args: [DUMMY_ADDR, DUMMY_ADDR, DUMMY_I128, nativeToScVal(0, { type: "u32" })],
  },
  { name: "burn", args: [DUMMY_ADDR, DUMMY_I128] },
  { name: "burn_from", args: [DUMMY_ADDR, DUMMY_ADDR, DUMMY_I128] },
];

// Errors that indicate the function exists but rejected our dummy inputs
const EXECUTION_ERROR_PATTERNS = [
  /wasm trap/i,
  /contract error/i,
  /unauthorized/i,
  /insufficient/i,
  /overflow/i,
];

function isExecutionError(msg) {
  return EXECUTION_ERROR_PATTERNS.some((p) => p.test(msg));
}

export function isMissingFunctionError(err) {
  const msg = String(err?.message ?? err?.error ?? err ?? "");
  return (
    /fn[_ ]not[_ ]found/i.test(msg) ||
    /function not found/i.test(msg) ||
    /no such function/i.test(msg) ||
    /invalid function/i.test(msg)
  );
}

function isRateLimitError(err) {
  const status = err?.status || err?.response?.status;
  const msg = String(err?.message || err?.error || err || "");
  return status === 429 || msg.includes("429") || /rate.?limit/i.test(msg);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRateLimitRetry(fn) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (!isRateLimitError(err) || attempt >= MAX_RATE_LIMIT_RETRIES) {
        throw err;
      }
      await wait(RATE_LIMIT_RETRY_BASE_MS * 2 ** attempt);
    }
  }
}

export async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      try {
        results[currentIndex] = await mapper(items[currentIndex]);
      } catch {
        // A failing mapper must resolve to a concrete value. Leaving the slot
        // empty creates a hole in the array, and every() skips holes entirely —
        // so a throw would silently be reported as compliance.
        // A throwing mapper must never leave a hole in results. Treat the
        // item as non-compliant (false) so the caller's
        // Object.values(results).every(Boolean) check correctly reports the
        // contract as non-compliant instead of silently skipping the check.
        results[currentIndex] = false;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function functionExists(contract, fnName, args) {
  const account = new Account(DUMMY_SOURCE, "0");
  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(fnName, ...args))
    .setTimeout(30)
    .build();

  const result = await withRateLimitRetry(() => rpc.simulateTransaction(tx));

  if (!SorobanRpc.Api.isSimulationError(result)) {
    return true;
  } // success → exists

  if (isMissingFunctionError(result.error)) {
    return false;
  }

  // If the error looks like a runtime/logic error the function is present
  if (isExecutionError(result.error)) {
    return true;
  }

  // Otherwise assume the function is missing
  return false;
}

/**
 * Validate SEP-41 compliance for a contract.
 * @param {string} contractId
 * @returns {Promise<{ compliant: boolean, results: Record<string, boolean> }>}
 */
export async function validateSep41(contractId) {
  const contract = new Contract(contractId);

  const checks = await mapWithConcurrency(SEP41_FUNCTIONS, MAX_CONCURRENT_CHECKS, ({ name, args }) =>
    functionExists(contract, name, args),
  );

  // checks is dense: every slot is a boolean, `false` for any mapper failure.
  const results = Object.fromEntries(SEP41_FUNCTIONS.map(({ name }, i) => [name, checks[i] === true]));

  const compliant = Object.values(results).every(Boolean);
  return { compliant, results };
}

// CLI entry point
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  const contractId = process.argv[2];
  if (!contractId) {
    console.error("Usage: node src/validateSep41.js <contractId>");
    process.exit(1);
  }

  validateSep41(contractId)
    .then(({ compliant, results }) => {
      console.log(`\nSEP-41 compliance for ${contractId}:`);
      for (const [fn, ok] of Object.entries(results)) {
        console.log(`  ${ok ? "✓" : "✗"} ${fn}`);
      }
      console.log(`\nResult: ${compliant ? "COMPLIANT ✓" : "NON-COMPLIANT ✗"}`);
      process.exit(compliant ? 0 : 1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
