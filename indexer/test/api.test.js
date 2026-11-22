/**
 * Tests for src/api.js error handling middleware.
 *
 * api.js imports from index.js (which previously auto-started the indexer).
 * The run() call in index.js is now guarded so that importing api.js in a
 * test environment does not start the server or indexer loop.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { StrKey } from "@stellar/stellar-sdk";
import { createApp, errorHandler } from "../src/api.js";
import { db } from "../src/db.js";

function createMockRes() {
  return {
    statusCode: null,
    body: null,
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send() {
      return this;
    },
  };
}

describe("errorHandler middleware", () => {
  let originalError;
  let consoleOutput;

  beforeEach(() => {
    originalError = console.error;
    consoleOutput = [];
    console.error = (...args) => consoleOutput.push(args);
  });

  afterEach(() => {
    console.error = originalError;
  });

  it("returns 500 with { error: message } for unhandled errors", () => {
    const err = new Error("Something went wrong");
    const req = { method: "GET", path: "/api/events" };
    const res = createMockRes();

    errorHandler(err, req, res, () => {});

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: "Something went wrong" });
  });

  it("falls back to Internal Server Error when err.message is empty", () => {
    const err = Object.assign(new Error(""), { message: "" });
    const req = { method: "GET", path: "/api/events" };
    const res = createMockRes();

    errorHandler(err, req, res, () => {});

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: "Internal Server Error" });
  });

  it("logs request method, path, and stack trace", () => {
    const err = new Error("Boom");
    const req = { method: "POST", path: "/api/contracts" };
    const res = createMockRes();

    errorHandler(err, req, res, () => {});

    assert.equal(consoleOutput.length, 1, "expected one console.error call");
    const [label, details] = consoleOutput[0];
    assert.equal(label, "API Error:");
    assert.equal(details.method, "POST");
    assert.equal(details.path, "/api/contracts");
    assert.ok(details.stack, "expected stack trace in log output");
  });

  it("does not send a response when headers are already sent", () => {
    const err = new Error("Boom");
    const req = { method: "GET", path: "/api/events" };
    const res = createMockRes();
    res.headersSent = true;
    let statusCalled = false;
    res.status = () => {
      statusCalled = true;
      return res;
    };
    let jsonCalled = false;
    res.json = () => {
      jsonCalled = true;
      return res;
    };

    errorHandler(err, req, res, () => {});

    assert.equal(statusCalled, false, "should not call res.status() when headersSent");
    assert.equal(jsonCalled, false, "should not call res.json() when headersSent");
  });
});

describe("async route errors", () => {
  it("returns a 500 JSON error when a database request rejects", async () => {
    const originalGetDistinctFunctions = db.getDistinctFunctions;
    const originalConsoleError = console.error;
    let server;
    db.getDistinctFunctions = async () => {
      throw new Error("database unavailable");
    };
    console.error = () => {};

    try {
      server = createApp().listen(0);
      const { port } = server.address();
      const response = await fetch(`http://127.0.0.1:${port}/api/functions`);

      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { error: "database unavailable" });
    } finally {
      db.getDistinctFunctions = originalGetDistinctFunctions;
      console.error = originalConsoleError;
      if (server) {
        await new Promise((resolve, reject) =>
          server.close((err) => (err ? reject(err) : resolve()))
        );
      }
    }
  });
});

describe("GET /api/functions cache", () => {
  it("reuses the cached result for 60 seconds and refreshes after expiry", async () => {
    const original = db.getDistinctFunctions;
    const originalNow = Date.now;
    let callCount = 0;
    let now = 1_700_000_000_000;

    db.getDistinctFunctions = async () => {
      callCount += 1;
      return ["set_price", "transfer"];
    };
    Date.now = () => now;

    try {
      const app = createApp();
      const server = app.listen(0);
      const { port } = server.address();

      const firstRes = await fetch(`http://127.0.0.1:${port}/api/functions`);
      assert.equal(firstRes.status, 200);
      assert.equal(callCount, 1, "first request should hit the database");
      assert.equal(
        firstRes.headers.get("cache-control"),
        "public, max-age=60",
        "first response should include the cache header"
      );
      assert.deepEqual(await firstRes.json(), ["set_price", "transfer"]);

      now += 30_000;
      const secondRes = await fetch(`http://127.0.0.1:${port}/api/functions`);
      assert.equal(secondRes.status, 200);
      assert.equal(callCount, 1, "second request within 60s should not hit the database");
      assert.deepEqual(await secondRes.json(), ["set_price", "transfer"]);
      assert.equal(
        secondRes.headers.get("cache-control"),
        "public, max-age=60",
        "cached response should include the cache header"
      );

      now += 31_000;
      const thirdRes = await fetch(`http://127.0.0.1:${port}/api/functions`);
      assert.equal(thirdRes.status, 200);
      assert.equal(callCount, 2, "request after the 60s TTL should fetch again");
      assert.deepEqual(await thirdRes.json(), ["set_price", "transfer"]);

      await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    } finally {
      db.getDistinctFunctions = original;
      Date.now = originalNow;
    }
  });
});

describe("wallet address validation", () => {
  it("returns 400 for invalid wallet addresses and never calls the database", async () => {
    const original = db.getWalletEvents;
    let called = false;
    db.getWalletEvents = async () => {
      called = true;
      return { events: [], total: 0, page: 1, limit: 25 };
    };

    try {
      const app = createApp();
      const server = app.listen(0);
      const { port } = server.address();

      const res = await fetch(`http://127.0.0.1:${port}/api/wallet/not-an-address`);
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.deepEqual(body, { error: "Invalid Stellar address" });
      assert.equal(called, false, "wallet DB query should not be called for invalid addresses");

      await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    } finally {
      db.getWalletEvents = original;
    }
  });

  it("accepts a valid G… public key format for the wallet endpoint", async () => {
    const original = db.getWalletEvents;
    let seenAddress;
    db.getWalletEvents = async (address, opts) => {
      seenAddress = address;
      return { events: [], total: 0, page: opts.page, limit: opts.limit };
    };

    try {
      const app = createApp();
      const server = app.listen(0);
      const { port } = server.address();
      const validAddress = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 1));

      const res = await fetch(`http://127.0.0.1:${port}/api/wallet/${validAddress}`);

      assert.equal(res.status, 200);
      assert.equal(seenAddress, validAddress);

      await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    } finally {
      db.getWalletEvents = original;
    }
  });
});
