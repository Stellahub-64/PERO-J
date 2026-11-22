/**
 * Tests for GET /api/tokens/:id/metadata route in src/api.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { SorobanRpc, xdr, StrKey } from "@stellar/stellar-sdk";

// Valid operational account for Account constructor
process.env.OPERATIONAL_ACCOUNT =
  "GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR";

let _stubbedSimulate = null;

SorobanRpc.Server.prototype.simulateTransaction = async function (_tx) {
  if (typeof _stubbedSimulate === "function") return _stubbedSimulate(_tx);
  return { result: { retval: xdr.ScVal.scvVoid() } };
};

// Import createApp after patching
import { createApp } from "../src/api.js";

const IDS = [20, 21, 22, 23, 24].map((i) =>
  StrKey.encodeContract(Buffer.alloc(32, i))
);
let _idIdx = 0;
const nextId = () => IDS[_idIdx++];

function simOk(scVal) {
  return { result: { retval: scVal } };
}

describe("GET /api/tokens/:id/metadata", () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = createApp();
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
  });

  after(() => {
    if (server) server.close();
  });

  it("returns { contract_id, name, symbol, decimals } for valid SEP-41 contract", async () => {
    const responses = [
      simOk(xdr.ScVal.scvString("USD Coin")),
      simOk(xdr.ScVal.scvString("USDC")),
      simOk(xdr.ScVal.scvU32(6)),
    ];
    let i = 0;
    _stubbedSimulate = async () => responses[i++];

    const contractId = nextId();
    const res = await fetch(`${baseUrl}/api/tokens/${contractId}/metadata`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "public, max-age=3600");

    const body = await res.json();
    assert.deepEqual(body, {
      contract_id: contractId,
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
    });
  });

  it("returns 404 when simulation fails / contract is not SEP-41 compliant", async () => {
    _stubbedSimulate = async () => ({
      error: "HostError: Error(Contract, #1)",
    });

    const contractId = nextId();
    const res = await fetch(`${baseUrl}/api/tokens/${contractId}/metadata`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.ok(body.error);
  });
});
