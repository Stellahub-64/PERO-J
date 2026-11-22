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

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

// ── in-memory SQL mock ────────────────────────────────────────────────────────

const _calls = []; // { sql, params }[]
const _appliedMigrations = new Set();
let _nextRow = null; // override row returned by the next query
let _queryError = null; // if set, next query throws this error

function resetMock() {
  _calls.length = 0;
  _appliedMigrations.clear();
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
    if (sql.includes("SELECT 1 FROM schema_migrations WHERE id = $1")) {
      return { rows: [], rowCount: _appliedMigrations.has(params[0]) ? 1 : 0 };
    }
    if (sql.includes("INSERT INTO schema_migrations")) {
      _appliedMigrations.add(params[0]);
    }
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
  _calls.push({
    sql: typeof sql === "object" ? sql.text : sql,
    params,
    query_timeout: typeof sql === "object" ? sql.query_timeout : undefined,
  });
  if (_nextRow !== null) {
    const row = _nextRow;
    _nextRow = null;
    return { rows: [row], rowCount: 1 };
  }
  return { rows: [], rowCount: 0 };
};
pg.Pool.prototype.end = async () => {};

// Import AFTER patching
import { db, getPoolSize } from "../src/db.js";

// ── tests ─────────────────────────────────────────────────────────────────────

describe("db.init() migrations", () => {
  beforeEach(() => resetMock());

  it("runs migrations on a fresh database", async () => {
    await db.init();
    const migrationSql = _calls.find((call) =>
      call.sql.includes("ALTER TABLE events ADD COLUMN IF NOT EXISTS sac_asset TEXT")
    );
    assert.ok(migrationSql, "expected a migration to add sac_asset idempotently");
  });

  it("adds sac_asset when earlier migrations are already recorded", async () => {
    for (const id of [1, 2, 3, 4, 5]) _appliedMigrations.add(id);

    await db.init();

    const migration = _calls.find((call) =>
      call.sql.includes("ALTER TABLE events ADD COLUMN IF NOT EXISTS sac_asset TEXT")
    );
    assert.ok(migration, "expected the repair migration to run");
    assert.ok(
      _calls.some(
        (call) => call.sql.includes("INSERT INTO schema_migrations") && call.params[0] === 6
      ),
      "expected migration 6 to be recorded"
    );
  });
});

describe("db.ping()", () => {
  beforeEach(() => resetMock());

  it("returns true when query succeeds", async () => {
    const result = await db.ping();
    assert.equal(result, true);
    assert.equal(lastCall().sql, "SELECT 1");
    assert.equal(lastCall().query_timeout, 5000);
  });

  it("returns false when query throws", async () => {
    _queryError = new Error("connection refused");
    const result = await db.ping();
    assert.equal(result, false);
  });

  it("returns false when the query times out", async () => {
    _queryError = new Error("Query read timeout");
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
    assert.ok(sql.toUpperCase().includes("ON CONFLICT"), "expected ON CONFLICT clause");
  });

  it("passes contract_id as first parameter", async () => {
    await db.upsertEvent(sampleEvent);
    const { params } = lastCall();
    assert.equal(params[0], sampleEvent.contract_id);
  });

  it("persists onchain_seq when provided", async () => {
    const eventWithSeq = { ...sampleEvent, onchain_seq: 42 };
    await db.upsertEvent(eventWithSeq);
    const { params } = lastCall();
    assert.equal(params[params.length - 1], 42, "expected onchain_seq as last parameter");
  });

  it("passes null for onchain_seq when not provided", async () => {
    await db.upsertEvent(sampleEvent);
    const { params } = lastCall();
    assert.equal(params[params.length - 1], null, "expected null onchain_seq when not provided");
  });

  it("includes onchain_seq column in INSERT statement", async () => {
    await db.upsertEvent(sampleEvent);
    const { sql } = lastCall();
    assert.ok(sql.includes("onchain_seq"), "expected onchain_seq column in INSERT");
  });

  it("persists sac_asset when provided", async () => {
    await db.upsertEvent({ ...sampleEvent, sac_asset: "USDC" });
    const { sql, params } = lastCall();
    assert.ok(sql.includes("sac_asset"), "expected sac_asset column in INSERT");
    assert.equal(params[7], "USDC");
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

  it("escapes wildcard characters in q for ILIKE searches", async () => {
    _nextRow = { count: "0" };
    await db.getEvents({ q: "100% swap_" });
    const firstSql = _calls[0]?.sql ?? "";
    const firstParams = _calls[0]?.params ?? [];

    assert.ok(firstSql.toUpperCase().includes("ILIKE"), "expected ILIKE in search query");
    assert.ok(firstSql.toUpperCase().includes("ESCAPE"), "expected ESCAPE clause");
    assert.deepEqual(firstParams, ["%100\\% swap\\_%"]);
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

describe("db.deleteContractMeta()", () => {
  beforeEach(() => resetMock());

  it("executes a DELETE query with the contract id", async () => {
    await db.deleteContractMeta("CABC");
    const { sql, params } = lastCall();
    assert.ok(sql.toUpperCase().includes("DELETE"), "expected DELETE");
    assert.equal(params[0], "CABC");
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

  it("getCursor returns null and warns when value is corrupted", async () => {
    const originalWarn = console.warn;
    const warnings = [];
    console.warn = (msg) => warnings.push(msg);
    try {
      _nextRow = { value: "abc" };
      const result = await db.getCursor();
      assert.equal(result, null);
      assert.equal(warnings.length, 1, "expected a warning to be logged");
      assert.ok(warnings[0].includes("Invalid cursor"), "warning should mention invalid cursor");
    } finally {
      console.warn = originalWarn;
    }
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
    const result = await db.getWalletEvents(
      "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN"
    );
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

  it("uses COALESCE to handle NULL event_addresses safely", async () => {
    _nextRow = { count: "0" };
    const addr = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
    await db.getWalletEvents(addr);
    const sqls = _calls.map((c) => c.sql);
    assert.ok(
      sqls.some((s) => s.includes("COALESCE(event_addresses, ARRAY[]::TEXT[])")),
      "expected COALESCE guard in query"
    );
  });
});

describe("db.getLeaderboard()", () => {
  beforeEach(() => resetMock());

  it("returns top contracts with name and event_count", async () => {
    _nextRow = { contract_id: "C1", name: "Swap", event_count: 5 };
    const result = await db.getLeaderboard();
    assert.ok(Array.isArray(result));
    assert.equal(result[0].contract_id, "C1");
    assert.equal(result[0].name, "Swap");
    assert.equal(result[0].event_count, 5);
  });

  it("caps limit at 50", async () => {
    await db.getLeaderboard(100);
    const { sql, params } = lastCall();
    assert.ok(sql.includes("LIMIT"));
    assert.equal(params[params.length - 1], 50);
  });

  it("keeps unregistered contracts by falling back to the contract id as the name", async () => {
    await db.getLeaderboard(10);
    const { sql } = lastCall();
    assert.match(sql, /LEFT JOIN/i, "expected a left join so events without contract metadata are kept");
    assert.match(
      sql,
      /COALESCE\(c\.name, e\.contract_id\)/i,
      "expected a fallback name when the contract metadata is missing"
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

  it("matches JSON objects even with leading whitespace, and excludes non-objects", async () => {
    _nextRow = { volume_raw: "0" };
    await db.get24hVolume("CABC");
    const { sql } = lastCall();
    assert.ok(!sql.includes("LIKE '{%'"), "should not use the fragile LIKE '{%' heuristic");
    assert.ok(sql.includes("raw_data ~ '^\\s*\\{'"), "expected regex object-shape check");
    assert.match(" {\"amount\":\"1\"}", /^\s*\{/);
    assert.doesNotMatch("[1,2,3]", /^\s*\{/);
  });
});

describe("db.getStats()", () => {
  beforeEach(() => resetMock());

  it("returns { total_events, total_contracts, unique_addresses } with 0 for empty db", async () => {
    const stats = await db.getStats();
    assert.deepEqual(stats, {
      total_events: 0,
      total_contracts: 0,
      unique_addresses: 0,
    });
    assert.equal(_calls.length, 3, "expected 3 count queries");
  });

  it("executes COUNT queries for events, contracts, and distinct addresses", async () => {
    await db.getStats();
    const sqls = _calls.map((c) => c.sql);
    assert.ok(sqls.some((s) => s.includes("FROM events")), "expected count from events");
    assert.ok(sqls.some((s) => s.includes("FROM contracts")), "expected count from contracts");
    assert.ok(
      sqls.some((s) => s.includes("event_addresses")),
      "expected distinct count from event_addresses"
    );
  });
});

describe("db.getContracts()", () => {
  beforeEach(() => resetMock());

  it("returns { contracts, total, page, limit } pagination shape", async () => {
    _nextRow = { count: "0" };
    const result = await db.getContracts();
    assert.ok("contracts" in result, "missing contracts key");
    assert.ok("total" in result, "missing total key");
    assert.ok("page" in result, "missing page key");
    assert.ok("limit" in result, "missing limit key");
  });

  it("defaults to page 1, limit 25", async () => {
    _nextRow = { count: "0" };
    const result = await db.getContracts();
    assert.equal(result.page, 1);
    assert.equal(result.limit, 25);
  });

  it("queries the contracts table with ORDER BY name ASC", async () => {
    _nextRow = { count: "0" };
    await db.getContracts();
    const sqls = _calls.map((c) => c.sql);
    assert.ok(
      sqls.some((s) => s.includes("FROM contracts")),
      "expected query against contracts table"
    );
    assert.ok(
      sqls.some((s) => s.toUpperCase().includes("ORDER BY NAME ASC")),
      "expected ORDER BY name ASC"
    );
  });

  it("includes ILIKE filter when q is provided", async () => {
    _nextRow = { count: "0" };
    await db.getContracts({ q: "stellar" });
    const sqls = _calls.map((c) => c.sql);
    assert.ok(
      sqls.some((s) => s.toUpperCase().includes("ILIKE")),
      "expected ILIKE filter in query when q is provided"
    );
    const params = _calls.flatMap((c) => c.params ?? []);
    assert.ok(
      params.some((p) => typeof p === "string" && p.includes("stellar")),
      "expected q value in query params"
    );
  });

  it("returns the contract rows when found", async () => {
    _nextRow = { count: "1" };
    const result = await db.getContracts({ page: 1 });
    assert.ok(Array.isArray(result.contracts));
  });

  it("respects custom page and limit", async () => {
    _nextRow = { count: "0" };
    const result = await db.getContracts({ page: 3, limit: 10 });
    assert.equal(result.page, 3);
    assert.equal(result.limit, 10);
    // offset should be (3-1)*10 = 20 — verify it's passed to query
    const params = _calls.flatMap((c) => c.params ?? []);
    assert.ok(params.includes(20), "expected offset=20 in query params");
  });

  // Regression test for #787: when q is present the LIMIT/OFFSET $N indices
  // must still be correct — i.e. the q param occupies $1, LIMIT must be $2,
  // and OFFSET must be $3.  Previously the +1/+2 arithmetic was computed
  // against the wrong params array which could produce the wrong page.
  it("uses correct LIMIT/OFFSET $N indices when q and page are both provided (#787)", async () => {
    _nextRow = { count: "3" };
    // page=2, limit=1 → offset = (2-1)*1 = 1
    const result = await db.getContracts({ q: "swap", page: 2, limit: 1 });
    assert.equal(result.page, 2);
    assert.equal(result.limit, 1);

    // Find the SELECT (non-COUNT) query — it should contain LIMIT and OFFSET
    const selectCall = _calls.find(
      (c) => c.sql && c.sql.toUpperCase().includes("ORDER BY NAME ASC")
    );
    assert.ok(selectCall, "expected a SELECT query with ORDER BY name ASC");

    const selectParams = selectCall.params;
    // $1 = q wildcard, $2 = limit (1), $3 = offset (1)
    assert.ok(
      typeof selectParams[0] === "string" && selectParams[0].includes("swap"),
      "expected q wildcard as first SELECT param ($1)"
    );
    assert.equal(selectParams[1], 1, "expected LIMIT=1 as second SELECT param ($2)");
    assert.equal(selectParams[2], 1, "expected OFFSET=1 as third SELECT param ($3)");
  });
});

describe("db.getEvents() full-text search (#321)", () => {
  beforeEach(() => resetMock());

  it("uses plainto_tsquery when q contains only word characters", async () => {
    _nextRow = { count: "0" };
    await db.getEvents({ q: "swap usdc" });
    const sqls = _calls.map((c) => c.sql);
    assert.ok(
      sqls.some((s) => s.includes("plainto_tsquery")),
      "expected plainto_tsquery for safe word-only query"
    );
    assert.ok(
      sqls.some((s) => s.includes("description_tsv")),
      "expected description_tsv column reference"
    );
  });

  it("falls back to ILIKE when q contains special characters", async () => {
    _nextRow = { count: "0" };
    await db.getEvents({ q: "swap & usdc" });
    const sqls = _calls.map((c) => c.sql);
    assert.ok(
      sqls.some((s) => s.toUpperCase().includes("ILIKE")),
      "expected ILIKE fallback for queries with special characters"
    );
    assert.ok(
      !sqls.some((s) => s.includes("plainto_tsquery")),
      "should not use plainto_tsquery for queries with special characters"
    );
  });

  it("passes the q value correctly into tsvector query params", async () => {
    _nextRow = { count: "0" };
    await db.getEvents({ q: "transfer" });
    const params = _calls.flatMap((c) => c.params ?? []);
    assert.ok(
      params.includes("transfer"),
      "expected raw q value (no %%) passed for tsquery"
    );
  });

  it("passes the q value with % wildcards for ILIKE fallback", async () => {
    _nextRow = { count: "0" };
    await db.getEvents({ q: "100 USDC+XLM" });
    const params = _calls.flatMap((c) => c.params ?? []);
    assert.ok(
      params.some((p) => typeof p === "string" && p.startsWith("%") && p.endsWith("%")),
      "expected %%q%% wildcard pattern for ILIKE fallback"
    );
  });
});

describe("DATABASE_POOL_SIZE / getPoolSize()", () => {
  let originalWarn;
  let originalEnv;
  let warnings;

  beforeEach(() => {
    originalWarn = console.warn;
    warnings = [];
    console.warn = (msg) => warnings.push(msg);
    originalEnv = process.env.DATABASE_POOL_SIZE;
  });

  afterEach(() => {
    console.warn = originalWarn;
    if (originalEnv === undefined) {
      delete process.env.DATABASE_POOL_SIZE;
    } else {
      process.env.DATABASE_POOL_SIZE = originalEnv;
    }
  });

  describe("missing values (defaults to 20 without warning)", () => {
    it("defaults to 20 when env variable is not set (undefined)", () => {
      delete process.env.DATABASE_POOL_SIZE;
      assert.equal(getPoolSize(), 20);
      assert.equal(getPoolSize(undefined), 20);
      assert.equal(warnings.length, 0);
    });

    it("defaults to 20 when passed null", () => {
      assert.equal(getPoolSize(null), 20);
      assert.equal(warnings.length, 0);
    });

    it("defaults to 20 when passed empty string", () => {
      assert.equal(getPoolSize(""), 20);
      assert.equal(warnings.length, 0);
    });

    it("defaults to 20 when passed whitespace-only string", () => {
      assert.equal(getPoolSize("   "), 20);
      assert.equal(warnings.length, 0);
    });
  });

  describe("valid values (within 1–100)", () => {
    it("overrides the default when DATABASE_POOL_SIZE env var is set", () => {
      process.env.DATABASE_POOL_SIZE = "42";
      assert.equal(getPoolSize(), 42);
      assert.equal(warnings.length, 0);
    });

    it("parses valid integer pool sizes", () => {
      assert.equal(getPoolSize("5"), 5);
      assert.equal(getPoolSize("20"), 20);
      assert.equal(getPoolSize("50"), 50);
      assert.equal(warnings.length, 0);
    });

    it("accepts lower boundary of 1", () => {
      assert.equal(getPoolSize("1"), 1);
      assert.equal(warnings.length, 0);
    });

    it("accepts upper boundary of 100", () => {
      assert.equal(getPoolSize("100"), 100);
      assert.equal(warnings.length, 0);
    });

    it("handles strings with leading/trailing whitespace", () => {
      assert.equal(getPoolSize("  15  "), 15);
      assert.equal(warnings.length, 0);
    });

    it("handles numeric input directly", () => {
      assert.equal(getPoolSize(10), 10);
      assert.equal(warnings.length, 0);
    });
  });

  describe("invalid values (outside 1–100 or non-integer)", () => {
    it("falls back to 20 with warning when value is 0 (< 1)", () => {
      assert.equal(getPoolSize("0"), 20);
      assert.equal(warnings.length, 1);
      assert.ok(warnings[0].includes('Invalid DATABASE_POOL_SIZE "0"'));
      assert.ok(warnings[0].includes("Expected integer between 1 and 100"));
      assert.ok(warnings[0].includes("Falling back to default (20)"));
    });

    it("falls back to 20 with warning when value is negative (< 1)", () => {
      assert.equal(getPoolSize("-5"), 20);
      assert.equal(warnings.length, 1);
      assert.ok(warnings[0].includes('Invalid DATABASE_POOL_SIZE "-5"'));
    });

    it("falls back to 20 with warning when value is greater than 100", () => {
      assert.equal(getPoolSize("101"), 20);
      assert.equal(warnings.length, 1);
      assert.ok(warnings[0].includes('Invalid DATABASE_POOL_SIZE "101"'));
    });

    it("falls back to 20 with warning when value is a non-integer float", () => {
      assert.equal(getPoolSize("5.5"), 20);
      assert.equal(warnings.length, 1);
      assert.ok(warnings[0].includes('Invalid DATABASE_POOL_SIZE "5.5"'));
    });

    it("falls back to 20 with warning when value is non-numeric string", () => {
      assert.equal(getPoolSize("invalid"), 20);
      assert.equal(warnings.length, 1);
      assert.ok(warnings[0].includes('Invalid DATABASE_POOL_SIZE "invalid"'));
    });

    it("falls back to 20 with warning when value is NaN or Infinity", () => {
      assert.equal(getPoolSize("NaN"), 20);
      assert.equal(getPoolSize("Infinity"), 20);
      assert.equal(warnings.length, 2);
    });

    it("falls back to 20 with warning when env var has invalid value outside range", () => {
      process.env.DATABASE_POOL_SIZE = "999";
      assert.equal(getPoolSize(), 20);
      assert.equal(warnings.length, 1);
      assert.ok(warnings[0].includes('Invalid DATABASE_POOL_SIZE "999"'));
    });
  });
});


