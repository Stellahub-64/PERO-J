/**
 * Tests for src/validateSep41.js — validateSep41()
 *
 * validateSep41.js probes 10 SEP-41 function names by simulating each one.
 * We stub SorobanRpc.Server#simulateTransaction so no real network calls are made.
 *
 * Scenarios:
 *  1. All functions present  → compliant: true,  all results true
 *  2. All functions absent   → compliant: false, all results false
 *  3. Execution errors       → treated as "present" (function exists, rejected dummy args)
 *  4. Mixed presence         → compliant: false, only present ones true
 *  5. Return shape guarantees
 *  6. mapWithConcurrency resolves false on mapper errors (no array holes)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SorobanRpc } from "@stellar/stellar-sdk";

// ── stub helpers ──────────────────────────────────────────────────────────────

// Success: function ran (or succeeded) — present
function simSuccess() {
  return { result: { retval: null } };
}

// Execution error: function exists but rejected our dummy args — still present
function simExecError() {
  return { error: "wasm trap: unreachable instruction" };
}

// Missing function: not present
function simMissingFn() {
  return { error: "function not found" };
}

// ── patch SorobanRpc.Server prototype BEFORE the module is imported ───────────
let _stubbedSimulate = null;

SorobanRpc.Server.prototype.simulateTransaction = async function (_tx) {
  if (typeof _stubbedSimulate === "function") return _stubbedSimulate(_tx);
  return simSuccess();
};

import {
  validateSep41,
  mapWithConcurrency,
  isMissingFunctionError,
} from "../src/validateSep41.js";

const CONTRACT_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

const ALL_SEP41_FUNCTIONS = [
  "name", "symbol", "decimals", "balance", "allowance",
  "transfer", "transfer_from", "approve", "burn", "burn_from",
];

// ── tests ─────────────────────────────────────────────────────────────────────

describe("isMissingFunctionError()", () => {
  it("matches host-style fn_not_found errors", () => {
    assert.equal(isMissingFunctionError("HostError: fn_not_found"), true);
  });

  it("does not misclassify non-function errors", () => {
    assert.equal(isMissingFunctionError("contract error: unauthorized"), false);
    assert.equal(isMissingFunctionError("HostError: underflow"), false);
  });
});

describe("validateSep41() — fully compliant contract", () => {
  it("returns compliant: true when all 10 functions succeed", async () => {
    _stubbedSimulate = () => simSuccess();
    const { compliant, results } = await validateSep41(CONTRACT_ID);
    assert.equal(compliant, true);
    assert.ok(Object.values(results).every((v) => v === true));
  });

  it("results object contains all 10 SEP-41 function names", async () => {
    _stubbedSimulate = () => simSuccess();
    const { results } = await validateSep41(CONTRACT_ID);
    for (const fn of ALL_SEP41_FUNCTIONS) {
      assert.ok(fn in results, `missing key: ${fn}`);
    }
  });
});

describe("validateSep41() — fully non-compliant contract", () => {
  it("returns compliant: false when all functions are missing", async () => {
    _stubbedSimulate = () => simMissingFn();
    const { compliant, results } = await validateSep41(CONTRACT_ID);
    assert.equal(compliant, false);
    assert.ok(Object.values(results).every((v) => v === false));
  });
});

describe("validateSep41() — execution errors treated as present", () => {
  it("returns compliant: true when all functions throw execution errors", async () => {
    _stubbedSimulate = () => simExecError();
    const { compliant, results } = await validateSep41(CONTRACT_ID);
    assert.equal(compliant, true);
    assert.ok(Object.values(results).every((v) => v === true));
  });
});

describe("validateSep41() — mixed compliance", () => {
  it("returns compliant: false when some functions are missing", async () => {
    // First 7 succeed, last 3 fail
    let callCount = 0;
    _stubbedSimulate = async () => (callCount++ < 7 ? simSuccess() : simMissingFn());
    const { compliant } = await validateSep41(CONTRACT_ID);
    assert.equal(compliant, false);
  });

  it("results map contains only boolean values", async () => {
    let callCount = 0;
    _stubbedSimulate = async () => (callCount++ % 2 === 0 ? simSuccess() : simMissingFn());
    const { results } = await validateSep41(CONTRACT_ID);
    for (const [fn, val] of Object.entries(results)) {
      assert.equal(typeof val, "boolean", `${fn} should be boolean, got ${typeof val}`);
    }
  });
});

describe("validateSep41() — return shape", () => {
  it("always returns { compliant, results } with correct types", async () => {
    _stubbedSimulate = () => simSuccess();
    const out = await validateSep41(CONTRACT_ID);
    assert.ok("compliant" in out, "missing compliant key");
    assert.ok("results"   in out, "missing results key");
    assert.equal(typeof out.compliant, "boolean");
    assert.equal(typeof out.results,   "object");
  });

  it("results has exactly 10 entries", async () => {
    _stubbedSimulate = () => simSuccess();
    const { results } = await validateSep41(CONTRACT_ID);
    assert.equal(Object.keys(results).length, 10);
  });
});

describe("mapWithConcurrency() — mapper errors resolve instead of leaving holes", () => {
  it("resolves false for every slot when the mapper throws", async () => {
    const results = await mapWithConcurrency([1, 2, 3, 4], 2, async () => {
      throw new Error("boom");
    });

    assert.equal(results.length, 4);
    assert.deepEqual(results, [false, false, false, false]);
  });

  it("leaves no holes in the result array", async () => {
    const results = await mapWithConcurrency([1, 2, 3, 4, 5], 3, async (n) => {
      if (n % 2 === 0) throw new Error("even");
      return true;
    });

    // Holes are skipped by every(); a dense array is what makes every() reliable.
    assert.equal(results.length, 5);
    for (let i = 0; i < results.length; i += 1) {
      assert.ok(i in results, `hole at index ${i}`);
      assert.equal(typeof results[i], "boolean");
    }
    assert.deepEqual(results, [true, false, true, false, true]);
  });

  it("does not reject when a mapper throws", async () => {
    await assert.doesNotReject(() => mapWithConcurrency([1], 1, async () => {
      throw new Error("boom");
    }));
  });
});

describe("every(Boolean) — false values are not treated as compliant", () => {
  it("returns false for an array containing false", () => {
    assert.equal([true, false, true].every(Boolean), false);
  });

  it("returns true for an all-true array", () => {
    assert.equal([true, true, true].every(Boolean), true);
  });

  it("a failing check makes the contract non-compliant", async () => {
    _stubbedSimulate = () => {
      throw new Error("network down");
    };
    const { compliant, results } = await validateSep41(CONTRACT_ID);
    assert.equal(compliant, false);
    assert.ok(Object.values(results).every((v) => v === false));
  });
});

describe("mapWithConcurrency() — mapper error handling", () => {
  it("fills every slot even when the mapper throws for some items", async () => {
    // Mapper succeeds for the first two items and throws for the rest.
    const results = await mapWithConcurrency(
      [1, 2, 3, 4, 5],
      2,
      async (item) => {
        if (item <= 2) return true;
        throw new Error("boom");
      }
    );

    assert.equal(results.length, 5, "results should have one slot per item");
    assert.ok(
      results.every((v) => v !== undefined),
      "no slot should be left undefined"
    );
    assert.deepEqual(results, [true, true, false, false, false]);
    assert.equal(results.every(Boolean), false, "non-compliant should be detected");
  });

  it("keeps concurrency bounded even when workers throw", async () => {
    let active = 0;
    let maxActive = 0;
    const results = await mapWithConcurrency(
      [1, 2, 3, 4, 5, 6],
      3,
      async (item) => {
        active++;
        maxActive = Math.max(maxActive, active);
        try {
          if (item % 2 === 0) throw new Error("err");
          return true;
        } finally {
          active--;
        }
      }
    );

    assert.ok(maxActive <= 3, `concurrency should not exceed limit (got ${maxActive})`);
    assert.deepEqual(results, [true, false, true, false, true, false]);
  });
});
