import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createApp } from "../src/api.js";
import { db } from "../src/db.js";

describe("GET /api/events/:seq/raw", () => {
  let server;
  let baseUrl;
  let originalGetEvent;

  beforeEach(async () => {
    originalGetEvent = db.getEvent;
    const app = createApp();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    db.getEvent = originalGetEvent;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("returns { seq, raw_topics, raw_data, tx_hash } for a valid event", async () => {
    db.getEvent = async (seq) => {
      if (seq === 1) {
        return {
          seq: 1,
          contract_id: "CAAA",
          function: "transfer",
          ledger: 100,
          tx_hash: "0xdeadbeef",
          description: "Transferred 10 tokens",
          raw_topics: ["AAA==", "BBB=="],
          raw_data: "CCC==",
          sac_asset: null,
          onchain_seq: 1,
        };
      }
      return null;
    };

    const res = await fetch(`${baseUrl}/api/events/1/raw`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, {
      seq: 1,
      raw_topics: ["AAA==", "BBB=="],
      raw_data: "CCC==",
      tx_hash: "0xdeadbeef",
    });
    assert.equal(body.description, undefined);
    assert.equal(body.function, undefined);
  });

  it("returns 400 when seq is not a valid non-negative integer", async () => {
    const invalidSeqs = ["abc", "-1", "1.5", "foo123"];
    for (const invalid of invalidSeqs) {
      const res = await fetch(`${baseUrl}/api/events/${invalid}/raw`);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.ok(body.error);
    }
  });

  it("returns 404 when event is not found", async () => {
    db.getEvent = async () => null;

    const res = await fetch(`${baseUrl}/api/events/999/raw`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.deepEqual(body, { error: "Not found" });
  });
});
