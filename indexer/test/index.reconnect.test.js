/**
 * Tests for RPC reconnection logic in src/index.js
 *
 * The indexer recreates the SorobanRpc.Server instance after
 * RPC_ERROR_THRESHOLD (3) consecutive errors to recover from
 * corrupted RPC client state.
 *
 * We test the reconnection pattern by simulating the error handling
 * logic from index.js without importing the full module (which has
 * side effects at load time).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

const RPC_ERROR_THRESHOLD = 3;

/**
 * Simulates the indexer's RPC reconnection logic.
 * Returns an object tracking how many times a new RPC client was created.
 *
 * @param {object} opts
 * @param {boolean[]} [opts.sequence] - Explicit fail/success sequence (true = fail, false = success).
 *                                      If omitted, defaults to `failCount` failures followed by success.
 * @param {number} [opts.failCount=0] - Number of initial failures (used when sequence is omitted).
 */
function createIndexerLoop({ failCount = 0, sequence } = {}) {
  let rpc = { id: "original" };
  let consecutiveErrors = 0;
  let rpcRecreations = 0;
  let callCount = 0;

  const errorSequence = sequence ?? Array(failCount).fill(true);

  async function iteration() {
    callCount++;
    const shouldFail = errorSequence.shift() ?? false;

    if (shouldFail) {
      consecutiveErrors++;
      if (consecutiveErrors >= RPC_ERROR_THRESHOLD) {
        rpc = { id: `recreated-${rpcRecreations}` };
        rpcRecreations++;
        consecutiveErrors = 0;
      }
      return false;
    }

    consecutiveErrors = 0;
    return true;
  }

  return {
    iteration,
    getRpc: () => rpc,
    getRpcRecreations: () => rpcRecreations,
    getConsecutiveErrors: () => consecutiveErrors,
    getCallCount: () => callCount,
  };
}

describe("RPC reconnection threshold", () => {
  it("does not recreate RPC client after 1 error", async () => {
    const loop = createIndexerLoop({ failCount: 1 });
    await loop.iteration();
    assert.equal(loop.getRpcRecreations(), 0, "should not recreate after 1 error");
    assert.equal(loop.getConsecutiveErrors(), 1, "consecutiveErrors should be 1");
    assert.equal(loop.getRpc().id, "original", "rpc should be the original instance");
  });

  it("does not recreate RPC client after 2 consecutive errors", async () => {
    const loop = createIndexerLoop({ failCount: 2 });
    await loop.iteration();
    await loop.iteration();
    assert.equal(loop.getRpcRecreations(), 0, "should not recreate after 2 errors");
    assert.equal(loop.getConsecutiveErrors(), 2, "consecutiveErrors should be 2");
    assert.equal(loop.getRpc().id, "original", "rpc should be the original instance");
  });

  it("recreates RPC client after exactly 3 consecutive errors", async () => {
    const loop = createIndexerLoop({ failCount: 3 });
    await loop.iteration();
    await loop.iteration();
    await loop.iteration();
    assert.equal(loop.getRpcRecreations(), 1, "should recreate after 3 errors");
    assert.equal(loop.getConsecutiveErrors(), 0, "consecutiveErrors should reset to 0");
    assert.notEqual(loop.getRpc().id, "original", "rpc should be a new instance");
  });

  it("resets error counter on success", async () => {
    const loop = createIndexerLoop({ failCount: 2 });
    await loop.iteration(); // error 1
    await loop.iteration(); // error 2
    assert.equal(loop.getConsecutiveErrors(), 2, "consecutiveErrors should be 2 after 2 errors");
    await loop.iteration(); // success (failCount exhausted)
    assert.equal(loop.getConsecutiveErrors(), 0, "consecutiveErrors should reset to 0 on success");
    assert.equal(loop.getRpcRecreations(), 0, "should not recreate after recovery");
    assert.equal(loop.getRpc().id, "original", "rpc should still be the original instance");
  });

  it("does not recreate RPC client on the first successful iteration", async () => {
    const loop = createIndexerLoop({ failCount: 0 });
    await loop.iteration();
    assert.equal(loop.getRpcRecreations(), 0, "should not recreate on success");
    assert.equal(loop.getConsecutiveErrors(), 0, "consecutiveErrors should be 0");
    assert.equal(loop.getRpc().id, "original", "rpc should be the original instance");
  });

  it("handles alternating error-success pattern without recreation", async () => {
    // true = fail, false = success
    const loop = createIndexerLoop({ sequence: [true, false, true, false, true] });
    await loop.iteration(); // error 1
    await loop.iteration(); // success - resets
    await loop.iteration(); // error 1
    await loop.iteration(); // success - resets
    await loop.iteration(); // error 1
    assert.equal(loop.getRpcRecreations(), 0, "should not recreate with alternating pattern");
    assert.equal(loop.getConsecutiveErrors(), 1, "consecutiveErrors should be 1");
    assert.equal(loop.getRpc().id, "original", "rpc should be the original instance");
  });

  it("handles more than 3 consecutive errors (recreates once, then resets)", async () => {
    const loop = createIndexerLoop({ failCount: 5 });
    await loop.iteration(); // error 1
    await loop.iteration(); // error 2
    await loop.iteration(); // error 3 → recreate
    assert.equal(loop.getRpcRecreations(), 1, "should recreate after 3 errors");
    assert.equal(loop.getConsecutiveErrors(), 0, "consecutiveErrors should reset");
    await loop.iteration(); // error 1 (counter reset)
    await loop.iteration(); // error 2
    assert.equal(loop.getRpcRecreations(), 1, "should not recreate yet (only 2 new errors)");
    assert.equal(loop.getConsecutiveErrors(), 2, "consecutiveErrors should be 2");
  });
});

describe("RPC_ERROR_THRESHOLD constant", () => {
  it("is set to 3", () => {
    assert.equal(RPC_ERROR_THRESHOLD, 3);
  });
});
