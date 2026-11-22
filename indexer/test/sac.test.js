import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Asset, Contract, Keypair, Networks } from "@stellar/stellar-sdk";
import { detectSac, sacLabel, reloadSacMap } from "../src/sac.js";

const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || Networks.TESTNET;
const NATIVE_CONTRACT_ID = new Contract(Asset.native().contractId(NETWORK_PASSPHRASE)).contractId();

const sampleIssuer = Keypair.random().publicKey();
const usdcAsset = new Asset("USDC", sampleIssuer);
const usdcContractId = new Contract(usdcAsset.contractId(NETWORK_PASSPHRASE)).contractId();

describe("sac", () => {
  const originalSacAssets = process.env.SAC_ASSETS;

  afterEach(() => {
    if (originalSacAssets !== undefined) {
      process.env.SAC_ASSETS = originalSacAssets;
    } else {
      delete process.env.SAC_ASSETS;
    }
    reloadSacMap();
  });

  it("detects native XLM SAC contract", () => {
    const res = detectSac(NATIVE_CONTRACT_ID);
    assert.deepEqual(res, { isSac: true, assetCode: "XLM" });
    assert.equal(sacLabel(NATIVE_CONTRACT_ID, "fallback"), "XLM");
  });

  it("returns isSac false for unknown contract IDs", () => {
    const unknownContract = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC3M";
    const res = detectSac(unknownContract);
    assert.deepEqual(res, { isSac: false, assetCode: null });
    assert.equal(sacLabel(unknownContract, "fallback"), "fallback");
  });

  it("reloads SAC map dynamically when SAC_ASSETS env var is updated", () => {
    // Before reload, USDC is not in SAC map
    assert.equal(detectSac(usdcContractId).isSac, false);

    // Update env var and reload SAC map
    process.env.SAC_ASSETS = JSON.stringify([{ code: "USDC", issuer: sampleIssuer }]);
    reloadSacMap();

    // After reload, USDC is recognised
    const res = detectSac(usdcContractId);
    assert.deepEqual(res, { isSac: true, assetCode: "USDC" });
    assert.equal(sacLabel(usdcContractId), "USDC");
  });

  it("logs malformed assets while registering valid assets and reporting the count", () => {
    const errors = [];
    const logs = [];
    const originalError = console.error;
    const originalLog = console.log;
    console.error = (...args) => errors.push(args);
    console.log = (...args) => logs.push(args.join(" "));

    try {
      process.env.SAC_ASSETS = JSON.stringify([
        null,
        { code: "USDC" },
        { code: "USDC", issuer: "invalid-issuer" },
        { code: "USDC", issuer: sampleIssuer },
      ]);
      assert.doesNotThrow(() => reloadSacMap());
    } finally {
      console.error = originalError;
      console.log = originalLog;
    }

    const malformedLogs = errors.filter(([message]) =>
      message.startsWith("[sac] skipping malformed SAC entry ")
    );
    assert.equal(malformedLogs.length, 3);
    assert.equal(detectSac(usdcContractId).isSac, true);
    assert.equal(detectSac(NATIVE_CONTRACT_ID).isSac, true);
    assert.ok(logs.includes("[sac] registered 2 SAC asset(s)"));
  });

  it("handles malformed SAC_ASSETS JSON gracefully without throwing", () => {
    process.env.SAC_ASSETS = "invalid-json-string";
    assert.doesNotThrow(() => reloadSacMap());

    // Native XLM should still be recognised
    assert.equal(detectSac(NATIVE_CONTRACT_ID).isSac, true);
  });

  it("logs a console.error when SAC_ASSETS contains invalid JSON (#320)", () => {
    const errors = [];
    const originalError = console.error;
    console.error = (...args) => errors.push(args.join(" "));

    try {
      process.env.SAC_ASSETS = "not-valid-json";
      reloadSacMap();
    } finally {
      console.error = originalError;
    }

    assert.ok(
      errors.some((msg) => msg.includes("[sac] SAC_ASSETS is not valid JSON:")),
      `expected error log about invalid JSON, got: ${JSON.stringify(errors)}`
    );
  });

  it("includes the parse error message in the console.error log (#320)", () => {
    const errors = [];
    const originalError = console.error;
    console.error = (...args) => errors.push(args);
    let parseErrorMessage;

    try {
      process.env.SAC_ASSETS = "{broken json";
      try {
        JSON.parse(process.env.SAC_ASSETS);
      } catch (err) {
        parseErrorMessage = err.message;
      }
      reloadSacMap();
    } finally {
      console.error = originalError;
    }

    assert.ok(parseErrorMessage, "expected invalid JSON to produce a parse error");
    assert.ok(
      errors.some((args) =>
        args.length === 2 &&
        args[0] === "[sac] SAC_ASSETS is not valid JSON:" &&
        args[1] === parseErrorMessage
      ),
      `expected the parse error message to be logged, got: ${JSON.stringify(errors)}`
    );
  });
});
