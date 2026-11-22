/**
 * Route-level tests for GET /api/contracts (#312)
 *
 * Tests that the endpoint returns the correct pagination shape and passes
 * query parameters through to db.getContracts().
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createApp } from "../src/api.js";
import { db } from "../src/db.js";

describe("GET /api/contracts", () => {
  let server;
  let baseUrl;
  let originalGetContracts;

  beforeEach(async () => {
    originalGetContracts = db.getContracts;
    const app = createApp();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    db.getContracts = originalGetContracts;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("returns { contracts, total, page, limit } shape", async () => {
    db.getContracts = async () => ({
      contracts: [],
      total: 0,
      page: 1,
      limit: 25,
    });

    const res = await fetch(`${baseUrl}/api/contracts`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok("contracts" in body, "missing contracts key");
    assert.ok("total" in body, "missing total key");
    assert.ok("page" in body, "missing page key");
    assert.ok("limit" in body, "missing limit key");
    assert.ok(Array.isArray(body.contracts), "contracts should be an array");
  });

  it("returns registered contracts with correct fields", async () => {
    db.getContracts = async () => ({
      contracts: [
        {
          id: "CAAA",
          name: "StellarSwap",
          description: "DEX on Stellar",
          functions: [],
          registered_by: "GAAA",
        },
      ],
      total: 1,
      page: 1,
      limit: 25,
    });

    const res = await fetch(`${baseUrl}/api/contracts`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, 1);
    assert.equal(body.contracts[0].name, "StellarSwap");
  });

  it("passes page query parameter to db.getContracts", async () => {
    let capturedOpts;
    db.getContracts = async (opts) => {
      capturedOpts = opts;
      return { contracts: [], total: 0, page: opts.page, limit: opts.limit ?? 25 };
    };

    await fetch(`${baseUrl}/api/contracts?page=3`);
    assert.equal(capturedOpts.page, 3, "expected page=3 to be passed to db.getContracts");
  });

  it("passes limit query parameter to db.getContracts", async () => {
    let capturedOpts;
    db.getContracts = async (opts) => {
      capturedOpts = opts;
      return { contracts: [], total: 0, page: opts.page ?? 1, limit: opts.limit };
    };

    await fetch(`${baseUrl}/api/contracts?limit=10`);
    assert.equal(capturedOpts.limit, 10, "expected limit=10 to be passed to db.getContracts");
  });

  it("passes q search query parameter to db.getContracts", async () => {
    let capturedOpts;
    db.getContracts = async (opts) => {
      capturedOpts = opts;
      return { contracts: [], total: 0, page: 1, limit: 25 };
    };

    await fetch(`${baseUrl}/api/contracts?q=stellar`);
    assert.equal(capturedOpts.q, "stellar", "expected q to be passed to db.getContracts");
  });

  it("defaults to page=1 when page param is missing", async () => {
    let capturedOpts;
    db.getContracts = async (opts) => {
      capturedOpts = opts;
      return { contracts: [], total: 0, page: opts.page, limit: opts.limit ?? 25 };
    };

    await fetch(`${baseUrl}/api/contracts`);
    assert.equal(capturedOpts.page, 1, "expected default page=1");
  });

  // Regression test for #787: GET /api/contracts?q=swap&page=2 must forward
  // all three of q, page, and limit to db.getContracts() so the correct
  // offset is computed inside the DB layer.
  it("forwards q, page, and limit together for GET /api/contracts?q=swap&page=2 (#787)", async () => {
    let capturedOpts;
    db.getContracts = async (opts) => {
      capturedOpts = opts;
      return { contracts: [], total: 0, page: opts.page, limit: opts.limit ?? 25 };
    };

    await fetch(`${baseUrl}/api/contracts?q=swap&page=2&limit=10`);

    assert.equal(capturedOpts.q, "swap", "expected q='swap' forwarded to db.getContracts");
    assert.equal(capturedOpts.page, 2, "expected page=2 forwarded to db.getContracts");
    assert.equal(capturedOpts.limit, 10, "expected limit=10 forwarded to db.getContracts");
  });
});
