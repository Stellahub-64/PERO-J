import pg from "pg";
import { eventEmitter } from "./events.js";

/** @typedef {import('./types.js').DecodedEvent} DecodedEvent */
/** @typedef {import('./types.js').ContractMeta} ContractMeta */
/** @typedef {import('./types.js').VolumeResult} VolumeResult */

const DEFAULT_POOL_SIZE = 20;
const PING_TIMEOUT_MS = 5000;

/**
 * Parse and validate DATABASE_POOL_SIZE environment variable.
 * Must be an integer between 1 and 100.
 *
 * @param {string} [envVal=process.env.DATABASE_POOL_SIZE]
 * @returns {number}
 */
export function getPoolSize(envVal = process.env.DATABASE_POOL_SIZE) {
  if (envVal === undefined || envVal === null || String(envVal).trim() === "") {
    return DEFAULT_POOL_SIZE;
  }
  const str = String(envVal).trim();
  const parsed = Number(str);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    console.warn(
      `Invalid DATABASE_POOL_SIZE "${envVal}". Expected integer between 1 and 100. Falling back to default (${DEFAULT_POOL_SIZE}).`
    );
    return DEFAULT_POOL_SIZE;
  }
  return parsed;
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: getPoolSize(),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
const MIGRATION_LOCK_ID = 57_056;
const MAX_PAGE = 200;

function escapeLikePattern(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/[[%_]/g, "\\$&");
}

const migrations = [
  {
    id: 1,
    name: "create_events_and_contracts",
    sql: `
      CREATE TABLE IF NOT EXISTS events (
        seq         BIGSERIAL PRIMARY KEY,
        contract_id TEXT NOT NULL,
        function    TEXT NOT NULL,
        ledger      BIGINT NOT NULL,
        tx_hash     TEXT,
        description TEXT NOT NULL,
        raw_topics  JSONB,
        raw_data    TEXT,
        sac_asset   TEXT,
        onchain_seq BIGINT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE events ADD COLUMN IF NOT EXISTS event_addresses TEXT[];
      CREATE INDEX IF NOT EXISTS idx_events_contract ON events(contract_id);
      CREATE INDEX IF NOT EXISTS idx_events_function ON events(function);
      CREATE INDEX IF NOT EXISTS idx_events_ledger   ON events(ledger);
      CREATE INDEX IF NOT EXISTS idx_events_addresses ON events USING GIN(event_addresses);

      CREATE TABLE IF NOT EXISTS indexer_state (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS contracts (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT,
        functions   JSONB,
        registered_by TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },
  {
    id: 2,
    name: "add_events_optional_columns",
    sql: `
      ALTER TABLE events ADD COLUMN IF NOT EXISTS sac_asset TEXT;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS onchain_seq BIGINT;
    `,
  },
  {
    id: 3,
    name: "create_events_indexes",
    sql: `
      CREATE INDEX IF NOT EXISTS idx_events_contract ON events(contract_id);
      CREATE INDEX IF NOT EXISTS idx_events_function ON events(function);
      CREATE INDEX IF NOT EXISTS idx_events_ledger   ON events(ledger);
    `,
  },
  {
    id: 4,
    name: "backfill_null_event_addresses",
    sql: `
      UPDATE events SET event_addresses = ARRAY[]::TEXT[] WHERE event_addresses IS NULL;
    `,
  },
  {
    id: 5,
    name: "add_description_tsvector_gin_index",
    sql: `
      ALTER TABLE events
        ADD COLUMN IF NOT EXISTS description_tsv TSVECTOR
          GENERATED ALWAYS AS (to_tsvector('english', description)) STORED;
      CREATE INDEX IF NOT EXISTS idx_events_description_tsv
        ON events USING GIN(description_tsv);
    `,
  },
  {
    id: 6,
    name: "ensure_events_sac_asset_column",
    sql: `
      ALTER TABLE events ADD COLUMN IF NOT EXISTS sac_asset TEXT;
    `,
  },
];

process.on("unhandledRejection", async (err) => {
  console.error("Unhandled Rejection detected, closing database pool:", err);
  try {
    await pool.end();
  } catch (e) {
    console.error("Error closing database pool:", e);
  }
  process.exit(1);
});

export const db = {
  /** Run advisory-locked schema migrations before startup.
   *
   * IMPORTANT: This method acquires a dedicated client from the pool.
   * Do NOT call any other db.* method from inside a migration, because those
   * methods use pool.query directly. Drawing from the pool while a client is
   * already checked out risks deadlock under concurrent load.
   *
   * @returns {Promise<void>}
   */
  async init() {
    const client = await pool.connect();
    try {
      await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
      await client.query("BEGIN");
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id         INTEGER PRIMARY KEY,
          name       TEXT NOT NULL,
          applied_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      for (const migration of migrations) {
        const { rowCount } = await client.query("SELECT 1 FROM schema_migrations WHERE id = $1", [
          migration.id,
        ]);
        if (rowCount === 0) {
          await client.query(migration.sql);
          await client.query("INSERT INTO schema_migrations (id, name) VALUES ($1, $2)", [
            migration.id,
            migration.name,
          ]);
        }
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      // The unlock is wrapped in its own try/catch so that a failure here
      // (e.g. the connection was dropped during ROLLBACK) is logged but does
      // not mask the original error or block future indexer startups waiting
      // on the advisory lock being released by the server on disconnect.
      try {
        await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]);
      } catch (unlockErr) {
        console.error("Failed to release migration advisory lock:", unlockErr);
      }
      client.release();
    }
  },

  /**
   * Check if database is reachable.
   * Uses pool.query — safe to call outside of init().
   * @returns {Promise<boolean>}
   */
  async ping() {
    try {
      await pool.query({ text: "SELECT 1", query_timeout: PING_TIMEOUT_MS });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Gracefully close the database connection pool.
   * @returns {Promise<void>}
   */
  async close() {
    await pool.end();
  },

  /**
   * Persist a decoded event to the database.
   * Uses ON CONFLICT DO NOTHING so duplicate events (e.g. from an indexer
   * restart) are silently skipped.
   * Uses pool.query — safe to call outside of init().
   *
   * @param {DecodedEvent} ev
   * @returns {Promise<void>}
   */
  async upsertEvent(ev) {
    await pool.query(
      `INSERT INTO events (contract_id, function, ledger, tx_hash, description, raw_topics, raw_data, sac_asset, event_addresses, onchain_seq)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT DO NOTHING`,
      [
        ev.contract_id,
        ev.function,
        ev.ledger,
        ev.tx_hash,
        ev.description,
        JSON.stringify(ev.raw_topics),
        ev.raw_data,
        ev.sac_asset ?? null,
        ev.event_addresses ?? [],
        ev.onchain_seq ?? null,
      ]
    );
    eventEmitter.emit("event", ev);
  },

  /**
   * Return a paginated list of events, optionally filtered by contract and/or function.
   * Uses pool.query — safe to call outside of init().
   *
   * @param {object}  [opts]
   * @param {string}  [opts.contract]  - Filter by contract_id (exact match).
   * @param {string}  [opts.fn]        - Filter by function name (exact match).
   * @param {string}  [opts.q]         - Full-text search in description field.
   * @param {number}  [opts.page=1]    - 1-based page number.
   * @param {number}  [opts.limit=25]  - Rows per page.
   * @returns {Promise<{ events: DecodedEvent[], total: number, page: number, limit: number }>}
   */
  async getEvents({ contract, fn, q, page = 1, limit = 25 } = {}) {
    const pageNum = Number(page) || 1;
    const limitNum = Math.min(MAX_PAGE, Number(limit) || 25);
    const conditions = [];
    const params = [];
    if (contract) {
      params.push(contract);
      conditions.push(`contract_id = $${params.length}`);
    }
    if (fn) {
      params.push(fn);
      conditions.push(`function = $${params.length}`);
    }
    if (q) {
      // Use the GIN-indexed tsvector column for word-only queries (letters,
      // digits, underscores, and spaces) so PostgreSQL can use the index scan.
      // Fall back to ILIKE for queries that contain special characters (e.g.
      // punctuation, operators, glob chars) which plainto_tsquery would strip
      // or misinterpret.
      const isWordSafe = /^[\w\s]+$/.test(q);
      if (isWordSafe) {
        params.push(q);
        conditions.push(`description_tsv @@ plainto_tsquery('english', $${params.length})`);
      } else {
        const escapedQ = escapeLikePattern(q);
        params.push(`%${escapedQ}%`);
        conditions.push(`description ILIKE $${params.length} ESCAPE '\\'`);
      }
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const countParams = [...params];
    const countRes = await pool.query(`SELECT COUNT(*) FROM events ${where}`, countParams);
    const total = parseInt(countRes.rows[0].count, 10);

    const offset = (pageNum - 1) * limitNum;
    params.push(limitNum, offset);
    const { rows } = await pool.query(
      `SELECT * FROM events ${where}
       ORDER BY ledger DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return { events: rows, total, page: pageNum, limit: limitNum };
  },

  /**
   * Fetch a single event by its auto-increment sequence number.
   * Uses pool.query — safe to call outside of init().
   *
   * @param {number} seq
   * @returns {Promise<DecodedEvent|null>} The event row, or null if not found.
   */
  async getEvent(seq) {
    const { rows } = await pool.query("SELECT * FROM events WHERE seq = $1", [seq]);
    return rows[0] ?? null;
  },

  async getEventByTxHash(txHash) {
    const { rows } = await pool.query(
      "SELECT * FROM events WHERE tx_hash = $1 ORDER BY ledger DESC LIMIT 1",
      [txHash]
    );
    return rows[0] ?? null;
  },

  /**
   * Return paginated events where the given address appears in the description
   * or raw_topics (case-insensitive substring match).
   * Uses pool.query — safe to call outside of init().
   *
   * @param {string} address - Stellar address (Strkey, G… or C…)
   * @param {object} [opts]
   * @param {number} [opts.page=1]  - 1-based page number.
   * @param {number} [opts.limit=25] - Rows per page.
   * @returns {Promise<{ events: DecodedEvent[], total: number, page: number, limit: number }>}
   */
  async getWalletEvents(address, { page = 1, limit = 25 } = {}) {
    const parsedPage = Number(page);
    const parsedLimit = Number(limit);
    const pageNum = Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1;
    const limitNum = Number.isFinite(parsedLimit)
      ? Math.min(MAX_PAGE, Math.max(1, Math.floor(parsedLimit)))
      : 25;
    const offset = (pageNum - 1) * limitNum;

    const countRes = await pool.query(
      "SELECT COUNT(*) FROM events WHERE event_addresses @> ARRAY[$1] AND COALESCE(event_addresses, ARRAY[]::TEXT[]) @> ARRAY[$1]",
      [address]
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const { rows } = await pool.query(
      "SELECT * FROM events WHERE event_addresses @> ARRAY[$1] AND COALESCE(event_addresses, ARRAY[]::TEXT[]) @> ARRAY[$1] ORDER BY ledger DESC LIMIT $2 OFFSET $3",
      [address, limitNum, offset]
    );

    return { events: rows, total, page: pageNum, limit: limitNum };
  },

  /**
   * Fetch ABI-like metadata for a registered contract.
   * Uses pool.query — safe to call outside of init().
   *
   * @param {string} id - Strkey-encoded contract address (C…)
   * @returns {Promise<ContractMeta|null>} The contract row, or null if not registered.
   */
  async getContractMeta(id) {
    const { rows } = await pool.query("SELECT * FROM contracts WHERE id = $1", [id]);
    return rows[0] ?? null;
  },

  /**
   * Return a paginated list of registered contracts, optionally filtered by a
   * free-text query across name and description.
   *
   * @param {object}  [opts]
   * @param {string}  [opts.q]       - Case-insensitive substring search on name/description.
   * @param {number}  [opts.page=1]  - 1-based page number.
   * @param {number}  [opts.limit=25] - Rows per page.
   * @returns {Promise<{ contracts: ContractMeta[], total: number, page: number, limit: number }>}
   */
  async getContracts({ q, page = 1, limit = 25 } = {}) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 25;
    const conditions = [];
    const params = [];
    if (q) {
      const escapedQ = escapeLikePattern(q);
      params.push(`%${escapedQ}%`);
      conditions.push(
        `(name ILIKE $${params.length} ESCAPE '\\' OR description ILIKE $${params.length} ESCAPE '\\')`
      );
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await pool.query(`SELECT COUNT(*) FROM contracts ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const offset = (pageNum - 1) * limitNum;
    // Push LIMIT and OFFSET into the params array so their $N positions are
    // always params.length (after push) regardless of how many filter params
    // precede them. This avoids the fragile +1/+2 arithmetic that breaks when
    // additional WHERE conditions are added.
    const selectParams = [...params];
    selectParams.push(limitNum);
    const limitIdx = selectParams.length; // e.g. 1 when no q, 2 when q present
    selectParams.push(offset);
    const offsetIdx = selectParams.length; // limitIdx + 1
    const { rows } = await pool.query(
      `SELECT * FROM contracts ${where}
       ORDER BY name ASC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      selectParams
    );
    return { contracts: rows, total, page: pageNum, limit: limitNum };
  },

  /**
   * Aggregate transfer volume for a contract over the last 24 hours.
   * Amounts are stored as raw strings in raw_data; we cast via NUMERIC to
   * avoid floating-point errors and return a BigInt-safe string.
   * Uses pool.query — safe to call outside of init().
   * @param {string} contractId
   * @param {number} decimals  token decimal places (default 7)
   * @returns {Promise<VolumeResult>}
   */
  async get24hVolume(contractId, decimals = 7) {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM((raw_data::jsonb->>'amount')::NUMERIC), 0)::TEXT AS volume_raw
       FROM events
       WHERE contract_id = $1
         AND function    = 'transfer'
         AND raw_data IS NOT NULL
         -- Match the first non-whitespace char so only object-shaped JSON
         -- (tolerating leading whitespace) reaches the ::jsonb cast below;
         -- arrays and other non-object JSON are excluded, not miscast.
         AND raw_data ~ '^\\s*\\{'
         AND created_at >= NOW() - INTERVAL '24 hours'`,
      [contractId]
    );
    const raw = rows[0].volume_raw ?? "0";
    // Scale using integer arithmetic via BigInt to avoid float rounding
    const rawBig = BigInt(raw.split(".")[0]); // NUMERIC may have no decimals
    const divisor = 10n ** BigInt(decimals);
    const whole = rawBig / divisor;
    const fraction = rawBig % divisor;
    const volume_scaled = `${whole}.${fraction.toString().padStart(decimals, "0")}`;
    return { volume_raw: raw, volume_scaled, decimals };
  },

  /**
   * Insert or update ABI metadata for a contract.
   * On conflict (same id) updates name, description, functions, and registered_by.
   * created_at is preserved.
   * Uses pool.query — safe to call outside of init().
   *
   * @param {ContractMeta} meta
   * @returns {Promise<void>}
   */
  async upsertContractMeta(meta) {
    await pool.query(
      `INSERT INTO contracts (id, name, description, functions, registered_by)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET name=$2, description=$3, functions=$4, registered_by=$5`,
      [meta.id, meta.name, meta.description, JSON.stringify(meta.functions), meta.registered_by]
    );
  },

  /**
   * Delete ABI metadata for a contract by id.
   *
   * @param {string} id - Strkey-encoded contract address (C…)
   * @returns {Promise<number>} The number of rows deleted (0 if not found).
   */
  async deleteContractMeta(id) {
    const { rowCount } = await pool.query("DELETE FROM contracts WHERE id = $1", [id]);
    return rowCount;
  },

  /**
   * Fetch distinct function names from the events table.
   * Uses pool.query — safe to call outside of init().
   * @returns {Promise<string[]>}
   */
  async getDistinctFunctions() {
    const { rows } = await pool.query("SELECT DISTINCT function FROM events ORDER BY function");
    return rows.map((r) => r.function);
  },

  /**
   * Return the top N contracts by event count, joined with the contracts
   * table to include the contract name.
   * Uses pool.query — safe to call outside of init().
   *
   * @param {number} [limit=10] - Max rows to return (capped at 50).
   * @returns {Promise<Array<{ contract_id: string, name: string, event_count: number }>>}
   */
  async getLeaderboard(limit = 10) {
    const capped = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const { rows } = await pool.query(
      `SELECT e.contract_id, COALESCE(c.name, e.contract_id) AS name, COUNT(*) AS event_count
       FROM events e
       LEFT JOIN contracts c ON c.id = e.contract_id
       GROUP BY e.contract_id, COALESCE(c.name, e.contract_id)
       ORDER BY event_count DESC
       LIMIT $1`,
      [capped]
    );
    return rows;
  },

  /**
   * Fetch aggregate statistics across events, contracts, and unique addresses.
   *
   * @returns {Promise<{ total_events: number, total_contracts: number, unique_addresses: number }>}
   */
  async getStats() {
    const [eventsRes, contractsRes, addressesRes] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM events"),
      pool.query("SELECT COUNT(*) FROM contracts"),
      pool.query(
        "SELECT COUNT(DISTINCT addr) FROM (SELECT unnest(event_addresses) AS addr FROM events) sub"
      ),
    ]);
    return {
      total_events: parseInt(eventsRes.rows?.[0]?.count ?? "0", 10) || 0,
      total_contracts: parseInt(contractsRes.rows?.[0]?.count ?? "0", 10) || 0,
      unique_addresses: parseInt(addressesRes.rows?.[0]?.count ?? "0", 10) || 0,
    };
  },

  /**
   * Read the persisted indexer cursor from the indexer_state table.
   * Uses pool.query — safe to call outside of init().
   * @returns {Promise<number|null>} The last successfully indexed ledger, or null.
   */
  async getCursor() {
    const { rows } = await pool.query("SELECT value FROM indexer_state WHERE key = 'last_ledger'");
    if (!rows.length) {
      return null;
    }
    const cursor = parseInt(rows[0].value, 10);
    if (Number.isNaN(cursor)) {
      console.warn(
        `Invalid cursor value found in indexer_state: ${rows[0].value} — resetting to null`
      );
      return null;
    }
    return cursor;
  },

  /**
   * Persist the indexer cursor so the process can resume from this ledger
   * after a restart.
   * Uses pool.query — safe to call outside of init().
   * @param {number} ledger
   * @returns {Promise<void>}
   */
  async setCursor(ledger) {
    await pool.query(
      `INSERT INTO indexer_state (key, value)
       VALUES ('last_ledger', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [String(ledger)]
    );
  },
};

