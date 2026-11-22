import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { validateNetwork } from "../src/validateNetwork.js";

// ── helpers ────────────────────────────────────────────────────────────────────

let exitCode = null;
let exitMessage = null;

const originalExit = process.exit;
const originalError = console.error;

beforeEach(() => {
  exitCode = null;
  exitMessage = null;
  process.exit = (code) => {
    exitCode = code;
    throw new Error(`process.exit(${code})`);
  };
  console.error = (...args) => {
    exitMessage = args.join(" ");
  };
});

afterEach(() => {
  process.exit = originalExit;
  console.error = originalError;
});

// ── tests ──────────────────────────────────────────────────────────────────────

describe("validateNetwork()", () => {
  it("exits with code 1 when passphrase mismatches", async () => {
    process.env.NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
    const fakeRpc = { getNetwork: () => Promise.resolve({ passphrase: "Standalone Network ; February 2017" }) };

    let threw = false;
    try {
      await validateNetwork(fakeRpc);
    } catch (err) {
      threw = true;
    }
    assert.equal(threw, true);
    assert.equal(exitCode, 1);
  });

  it("does not exit when passphrase matches", async () => {
    process.env.NETWORK_PASSPHRASE = "Standalone Network ; February 2017";
    const fakeRpc = { getNetwork: () => Promise.resolve({ passphrase: "Standalone Network ; February 2017" }) };

    await validateNetwork(fakeRpc);
    assert.equal(exitCode, null);
  });

  it("exits with code 1 when RPC call fails", async () => {
    process.env.NETWORK_PASSPHRASE = "Standalone Network ; February 2017";
    const fakeRpc = { getNetwork: () => Promise.reject(new Error("connection refused")) };

    let threw = false;
    try {
      await validateNetwork(fakeRpc);
    } catch (err) {
      threw = true;
    }
    assert.equal(threw, true);
    assert.equal(exitCode, 1);
  });

  it("skips validation when NETWORK_PASSPHRASE is not set", async () => {
    delete process.env.NETWORK_PASSPHRASE;
    const fakeRpc = { getNetwork: () => Promise.resolve({ passphrase: "any-passphrase" }) };

    await validateNetwork(fakeRpc);
    assert.equal(exitCode, null);
  });
});
