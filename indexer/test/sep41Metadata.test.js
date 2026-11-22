/**
 * Tests for src/sep41Metadata.js — fetchTokenMetadata()
 *
 * sep41Metadata.js calls SorobanRpc.Server#simulateTransaction internally.
 * We stub that prototype method before importing the module so the module-level
 * `rpc` singleton picks up the stub.
 *
 * IMPORTANT: sep41Metadata.js also calls `new Account(DUMMY_SOURCE, seq)` before
 * reaching simulateTransaction, and `new Contract(contractId)` which validates
 * the strkey. We set process.env.OPERATIONAL_ACCOUNT to a valid G-address and
 * use real, checksum-valid contract IDs derived from deterministic seeds.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SorobanRpc, xdr, StrKey } from "@stellar/stellar-sdk";

// Set a valid DUMMY_SOURCE before the module loads.
// Deterministic seed 0x01*32 → valid G… address.
process.env.OPERATIONAL_ACCOUNT =
  "GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR";

// ── stub helpers ──────────────────────────────────────────────────────────────

function scvString(s) { return xdr.ScVal.scvString(s); }
function scvU32(n)    { return xdr.ScVal.scvU32(n); }
function scvVoid()    { return xdr.ScVal.scvVoid(); }

function simOk(scVal) {
  // isSimulationError checks for a truthy `.error` field — omit it for success
  return { result: { retval: scVal } };
}

// Patch the prototype BEFORE the module is imported so the module-level
// `rpc` singleton uses our stub.
let _stubbedSimulate = null;

SorobanRpc.Server.prototype.simulateTransaction = async function (_tx) {
  if (typeof _stubbedSimulate === "function") return _stubbedSimulate(_tx);
  return simOk(scvVoid());
};

// Import after patching
import { fetchTokenMetadata } from "../src/sep41Metadata.js";

// Valid contract IDs derived from deterministic seeds 10-25.
// Each test gets its own ID to avoid the module's internal cache leaking
// between tests.  16 slots is enough for the current 7 tests plus future growth.
const IDS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25].map((i) =>
  StrKey.encodeContract(Buffer.alloc(32, i))
);
let _idIdx = 0;
const nextId = () => IDS[_idIdx++];

// Stub that returns name, symbol, decimals in the order the module calls them
function makeStub(name, symbol, decimals) {
  const responses = [
    simOk(scvString(name)),
    simOk(scvString(symbol)),
    simOk(scvU32(decimals)),
  ];
  let i = 0;
  return async () => responses[i++] ?? simOk(scvVoid());
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("fetchTokenMetadata()", () => {
  it("returns name, symbol, and decimals from simulated calls", async () => {
    _stubbedSimulate = makeStub("USD Coin", "USDC", 6);
    const meta = await fetchTokenMetadata(nextId());
    assert.equal(meta.name, "USD Coin");
    assert.equal(meta.symbol, "USDC");
    assert.equal(meta.decimals, 6);
  });

  it("retries with sequence 1 when source account lookup fails", async () => {
    let calls = 0;
    _stubbedSimulate = async () => {
      calls += 1;
      if (calls === 1) {
        return { error: "sourceAccountNotFound" };
      }
      if (calls === 4) {
        return simOk(scvString("USDC"));
      }
      return simOk(scvVoid());
    };

    const meta = await fetchTokenMetadata(nextId());
    assert.equal(meta.name, "USDC");
    assert.equal(meta.symbol, "");
    assert.equal(meta.decimals, 7);
    assert.equal(calls, 4);
  });

  it("coerces void returns to empty string / default 7 decimals", async () => {
    _stubbedSimulate = async () => simOk(scvVoid());
    const meta = await fetchTokenMetadata(nextId());
    assert.equal(meta.name, "");
    assert.equal(meta.symbol, "");
    assert.equal(meta.decimals, 7);
  });

  it("result is cached — second call fires no extra simulations", async () => {
    let callCount = 0;
    _stubbedSimulate = async () => {
      callCount += 1;
      return simOk(scvString("XLM"));
    };
    const id = nextId();
    const first  = await fetchTokenMetadata(id);
    const second = await fetchTokenMetadata(id); // must hit cache
    assert.ok(callCount <= 3, `expected ≤3 simulate calls, got ${callCount}`);
    assert.deepEqual(first, second);
  });

  it("returned object has exactly { name, symbol, decimals } keys", async () => {
    _stubbedSimulate = makeStub("Token", "TKN", 7);
    const meta = await fetchTokenMetadata(nextId());
    assert.deepEqual(Object.keys(meta).sort(), ["decimals", "name", "symbol"]);
  });

  it("name and symbol are strings", async () => {
    _stubbedSimulate = makeStub("My Token", "MTK", 18);
    const meta = await fetchTokenMetadata(nextId());
    assert.equal(typeof meta.name, "string");
    assert.equal(typeof meta.symbol, "string");
  });

  it("decimals is a number", async () => {
    _stubbedSimulate = makeStub("Token", "TKN", 18);
    const meta = await fetchTokenMetadata(nextId());
    assert.equal(typeof meta.decimals, "number");
    assert.equal(meta.decimals, 18);
  });
});
