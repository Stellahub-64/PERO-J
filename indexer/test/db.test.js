/**
 * Tests for src/db.js
 *
 * db.js uses pg.Pool to talk to PostgreSQL. There is no real DB in CI, so we
 * monkey-patch pg.Pool.prototype.query and pg.Pool.prototype.connect before
 * importing the module.
 *
 * The mock records every SQL call so we can assert on the queries sent without
 * running an actual database.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

// ── in-memory SQL mock ────────────────────────────────────────────────────────

const _calls = [];          // { sql, params }[]
let _nextRow = null;        // override row returned by the next query
let _queryError = null;     // if set, next query throws this error

function resetMock() {
  _calls.length = 0;
  _nextRow = null;
  _queryError = null;
}

function lastCall() {
  return _calls[_calls.length - 1];
}

// Fake client returned by pool.connect()
const fakeClient = {
  query: async (sql, params) => {
    if (_queryError) {
      const err = _queryError;
      _queryError = null;
      throw err;
    }
    _calls.push({ sql, params });
    if (_nextRow !== null) {
      const row = _nextRow;
      _nextRow = null;
      return { rows: [row], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  },
  release: () => {},
};

// Patch Pool before the module loads
pg.Pool.prototype.connect = async () => fakeClient;
pg.Pool.prototype.query = async (sql, params) => {
  if (_queryError) {
    const err = _queryError;
    _queryError = null;
    throw err;
  }
  _calls.push({ sql, params });
  if (_nextRow !== null) {
    const row = _nextRow;
    _nextRow = null;
    return { rows: [row], rowCount: 1 };
  }
  return { rows: [], rowCount: 0 };
};
pg.Pool.prototype.end = async () => {};

// Import AFTER patching
import { db } from "../src/db.js";

// ── tests ─────────────────────────────────────────────────────────────────────

describe("db.ping()", () => {
  beforeEach(() => resetMock());

  it("returns true when query succeeds", async () => {
    const result = await db.ping();
    assert.equal(result, true);
  });

  it("returns false when query throws", async () => {
    _queryError = new Error("connection refused");
    const result = await db.ping();
    assert.equal(result, false);
  });
});

describe("db.upsertEvent()", () => {
  beforeEach(() => resetMock());

  const sampleEvent = {
    contract_id: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    function: "transfer",
    ledger: 1234,
    tx_hash: "deadbeef",
    description: "Address GA… transferred 100 USDC",
    raw_topics: ["transfer", "GABC"],
    raw_data: '{"amount":"100"}',
    sac_asset: null,
    event_addresses: ["GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN"],
  };

  it("executes an INSERT query", async () => {
    await db.upsertEvent(sampleEvent);
    assert.ok(_calls.length >= 1, "expected at least one query");
    const { sql } = lastCall();
    assert.ok(sql.toUpperCase().includes("INSERT"), "expected INSERT statement");
  });

  it("includes ON CONFLICT DO NOTHING for idempotency", async () => {
    await db.upsertEvent(sampleEvent);
    const { sql } = lastCall();
    assert.ok(
      sql.toUpperCase().includes("ON CONFLICT"),
      "expected ON CONFLICT clause"
    );
  });

  it("passes contract_id as first parameter", async () => {
    await db.upsertEvent(sampleEvent);
    const { params } = lastCall();
    assert.equal(params[0], sampleEvent.contract_id);
  });
});

describe("db.getEvent()", () => {
  beforeEach(() => resetMock());

  it("returns null when no row is found", async () => {
    const result = await db.getEvent(999);
    assert.equal(result, null);
  });

  it("returns the row when found", async () => {
    _nextRow = { seq: 1, contract_id: "CABC", function: "swap" };
    const result = await db.getEvent(1);
    assert.deepEqual(result, { seq: 1, contract_id: "CABC", function: "swap" });
  });

  it("queries by seq parameter", async () => {
    await db.getEvent(42);
    const { params } = lastCall();
    assert.ok(params.includes(42), "expected seq=42 in params");
  });
});

describe("db.getEventByTxHash()", () => {
  beforeEach(() => resetMock());

  it("returns null when no transaction hash matches", async () => {
    const result = await db.getEventByTxHash("deadbeef");
    assert.equal(result, null);
  });

  it("returns the matching event", async () => {
    _nextRow = { seq: 7, tx_hash: "deadbeef", function: "place_bet" };
    const result = await db.getEventByTxHash("deadbeef");
    assert.equal(result.seq, 7);
    assert.equal(result.function, "place_bet");
  });

  it("queries by tx_hash parameter", async () => {
    await db.getEventByTxHash("deadbeef");
    const { sql, params } = lastCall();
    assert.ok(sql.includes("tx_hash"));
    assert.ok(params.includes("deadbeef"));
  });
});

describe("db.getEvents()", () => {
  beforeEach(() => resetMock());

  it("returns default pagination shape when no rows", async () => {
    // First query: COUNT(*) returns 0; second: data rows
    _nextRow = { count: "0" };
    const result = await db.getEvents();
    assert.ok("events" in result, "missing events key");
    assert.ok("total" in result, "missing total key");
    assert.ok("page" in result, "missing page key");
    assert.ok("limit" in result, "missing limit key");
  });

  it("passes contract filter into query when provided", async () => {
    _nextRow = { count: "0" };
    await db.getEvents({ contract: "CABC" });
    const sqls = _calls.map((c) => c.sql);
    assert.ok(
      sqls.some((s) => s.includes("contract_id")),
      "expected contract_id filter in query"
    );
  });

  it("defaults to page 1, limit 25", async () => {
    _nextRow = { count: "0" };
    const result = await db.getEvents();
    assert.equal(result.page, 1);
    assert.equal(result.limit, 25);
  });
});

describe("db.getContractMeta()", () => {
  beforeEach(() => resetMock());

  it("returns null when contract not registered", async () => {
    const result = await db.getContractMeta("CXXX");
    assert.equal(result, null);
  });

  it("returns the contract row when found", async () => {
    _nextRow = { id: "CXXX", name: "StellarSwap", functions: [] };
    const result = await db.getContractMeta("CXXX");
    assert.equal(result.name, "StellarSwap");
  });
});

describe("db.upsertContractMeta()", () => {
  beforeEach(() => resetMock());

  it("executes an INSERT ... ON CONFLICT DO UPDATE query", async () => {
    await db.upsertContractMeta({
      id: "CABC",
      name: "TestContract",
      description: "A test contract",
      functions: [],
      registered_by: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    });
    const { sql } = lastCall();
    assert.ok(sql.toUpperCase().includes("INSERT"), "expected INSERT");
    assert.ok(sql.toUpperCase().includes("ON CONFLICT"), "expected ON CONFLICT");
  });
});

describe("db.getCursor() / db.setCursor()", () => {
  beforeEach(() => resetMock());

  it("getCursor returns null when no cursor row exists", async () => {
    const result = await db.getCursor();
    assert.equal(result, null);
  });

  it("getCursor returns parsed ledger number when row exists", async () => {
    _nextRow = { value: "5000000" };
    const result = await db.getCursor();
    assert.equal(result, 5000000);
  });

  it("setCursor executes an INSERT ... ON CONFLICT query", async () => {
    await db.setCursor(4999999);
    const { sql, params } = lastCall();
    assert.ok(sql.toUpperCase().includes("INSERT"), "expected INSERT");
    assert.ok(sql.toUpperCase().includes("ON CONFLICT"), "expected ON CONFLICT");
    assert.ok(params.includes("4999999"), "expected ledger value in params");
  });
});

describe("db.getWalletEvents()", () => {
  beforeEach(() => resetMock());

  it("returns pagination shape", async () => {
    _nextRow = { count: "0" };
    const result = await db.getWalletEvents("GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN");
    assert.ok("events" in result);
    assert.ok("total" in result);
    assert.ok("page" in result);
    assert.ok("limit" in result);
  });

  it("passes address into the query", async () => {
    _nextRow = { count: "0" };
    const addr = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
    await db.getWalletEvents(addr);
    const sqls = _calls.map((c) => c.sql);
    assert.ok(
      sqls.some((s) => s.includes("event_addresses")),
      "expected event_addresses in query"
    );
  });
});

describe("db.get24hVolume()", () => {
  beforeEach(() => resetMock());

  it("returns volume_raw, volume_scaled, and decimals", async () => {
    _nextRow = { volume_raw: "100000000" };
    const result = await db.get24hVolume("CABC");
    assert.ok("volume_raw" in result);
    assert.ok("volume_scaled" in result);
    assert.ok("decimals" in result);
  });

  it("defaults decimals to 7", async () => {
    _nextRow = { volume_raw: "0" };
    const result = await db.get24hVolume("CABC");
    assert.equal(result.decimals, 7);
  });

  it("correctly scales an integer amount with 7 decimals", async () => {
    _nextRow = { volume_raw: "10000000" }; // 1.0000000 with 7 decimals
    const result = await db.get24hVolume("CABC", 7);
    assert.equal(result.volume_scaled, "1.0000000");
  });
});
