import express from "express";
import rateLimit from "express-rate-limit";
import { StrKey } from "@stellar/stellar-sdk";
import { db } from "./db.js";
import { fetchTokenMetadata } from "./sep41Metadata.js";
import { health } from "./index.js";
import { eventEmitter } from "./events.js";

const PORT = process.env.PORT || 3001;

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Admin-key authentication middleware for privileged operations.
 * Reads the expected key from the API_ADMIN_KEY environment variable
 * and validates it against an Authorization: Bearer <key> header.
 */
const requireAdminKey = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1] : null;
  const expected = process.env.API_ADMIN_KEY;
  if (!expected || !token || token !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

/**
 * Global Express error-handling middleware.
 * Logs the full stack trace together with the request method and path
 * so that unhandled errors are debuggable in production logs.
 *
 * @param {Error} err
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} _next
 */
export function errorHandler(err, req, res, _next) {
  console.error("API Error:", { method: req.method, path: req.path, stack: err.stack });
  if (res.headersSent) {
    return;
  }
  res.status(500).json({ error: err.message || "Internal Server Error" });
}

export function isValidStellarAddress(value) {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  return StrKey.isValidEd25519PublicKey(trimmed) || StrKey.isValidContract(trimmed);
}

/**
 * Validates the payload for registering/updating contract ABI metadata.
 *
 * @param {unknown} body
 * @returns {string|null} an error message when invalid, otherwise null
 */
export function validateContractPayload(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object";
  }

  const { id, name, functions } = body;

  if (typeof id !== "string" || id.trim() === "") {
    return "id must be a non-empty string";
  }

  if (typeof name !== "string" || name.trim() === "") {
    return "name must be a non-empty string";
  }

  if (!Array.isArray(functions)) {
    return "functions must be an array";
  }

  return null;
}

export function createApp() {
  const app = express();
  let distinctFunctionsCache = null;
  app.use(express.json());

  // GET /health — liveness + readiness probe for container orchestrators and uptime monitors
  app.get(
    "/health",
    asyncHandler(async (req, res) => {
      const LAG_ALERT_THRESHOLD_S = Number(process.env.LAG_ALERT_THRESHOLD_S || 30);
      const now = Date.now();
      const uptimeSeconds = Math.floor((now - health.startedAt) / 1000);

      const dbConnected = await db.ping();

      let lagSeconds = null;
      if (health.lastIndexedAt !== null) {
        lagSeconds = Math.floor((now - health.lastIndexedAt) / 1000);
      }

      if (!dbConnected) {
        return res.status(503).json({
          status: "error",
          db: "disconnected",
          uptime_seconds: uptimeSeconds,
          lag_seconds: lagSeconds,
          last_ledger: health.lastLedger,
          last_indexed_at: health.lastIndexedAt
            ? new Date(health.lastIndexedAt).toISOString()
            : null,
        });
      }

      const degraded = lagSeconds !== null && lagSeconds > LAG_ALERT_THRESHOLD_S;
      const status = degraded ? "degraded" : "ok";

      const body = {
        status,
        db: "connected",
        uptime_seconds: uptimeSeconds,
        lag_seconds: lagSeconds,
        last_ledger: health.lastLedger,
        last_indexed_at: health.lastIndexedAt ? new Date(health.lastIndexedAt).toISOString() : null,
      };

      res.status(degraded ? 503 : 200).json(body);
    })
  );

  // GET /ready — readiness check for Kubernetes probes
  app.get(
    "/ready",
    asyncHandler(async (req, res) => {
      const dbConnected = await db.ping();
      if (!dbConnected) {
        return res.status(503).json({ status: "error", db: "disconnected" });
      }
      res.status(200).json({ status: "ok", db: "connected", last_ledger: health.lastLedger });
    })
  );

  // Rate limiter applies to /api/* routes to protect endpoints against DoS while exempting /health and /ready probes
  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // GET /api/functions — distinct function names across all events
  app.get(
    "/api/functions",
    asyncHandler(async (req, res) => {
      const now = Date.now();
      const cacheIsFresh =
        distinctFunctionsCache !== null && distinctFunctionsCache.expiresAt > now;

      if (cacheIsFresh) {
        res.setHeader("Cache-Control", "public, max-age=60");
        return res.json(distinctFunctionsCache.value);
      }

      const result = await db.getDistinctFunctions();
      distinctFunctionsCache = {
        value: result,
        expiresAt: now + 60_000,
      };
      res.setHeader("Cache-Control", "public, max-age=60");
      return res.json(result);
    })
  );

  // GET /api/tokens/:id/metadata — SEP-41 token metadata from simulated calls
  app.get(
    "/api/tokens/:id/metadata",
    asyncHandler(async (req, res) => {
      let metadata;
      try {
        metadata = await fetchTokenMetadata(req.params.id);
      } catch {
        return res.status(404).json({ error: "Contract is not SEP-41 compliant" });
      }

      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.json({ contract_id: req.params.id, ...metadata });
    })
  );

  // GET /api/leaderboard?limit=10 — top contracts by event volume
  app.get(
    "/api/leaderboard",
    asyncHandler(async (req, res) => {
      const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
      const result = await db.getLeaderboard(limit);
      res.setHeader("Cache-Control", "public, max-age=60");
      res.json(result);
    })
  );

  // GET /api/events?contract=&fn=&page=&q=
  app.get(
    "/api/events",
    asyncHandler(async (req, res) => {
      const result = await db.getEvents({
        contract: req.query.contract,
        fn: req.query.fn,
        q: req.query.q,
        page: Number(req.query.page) || 1,
      });
      res.json(result);
    })
  );

  app.get(
    "/api/events/by-tx/:hash",
    asyncHandler(async (req, res) => {
      const event = await db.getEventByTxHash(req.params.hash);
      res.json(event);
  // GET /api/events/:seq/raw
  app.get(
    "/api/events/:seq/raw",
    asyncHandler(async (req, res) => {
      const seqStr = String(req.params.seq).trim();
      const seq = parseInt(seqStr, 10);
      if (isNaN(seq) || seq < 0 || !/^\d+$/.test(seqStr)) {
        return res.status(400).json({ error: "seq must be a non-negative integer" });
      }
      const ev = await db.getEvent(seq);
      if (!ev) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json({
        seq: ev.seq,
        raw_topics: ev.raw_topics,
        raw_data: ev.raw_data,
        tx_hash: ev.tx_hash,
      });
    })
  );

  // GET /api/events/stream — Server-Sent Events endpoint for live event feed
  app.get("/api/events/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const onEvent = (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    eventEmitter.on("event", onEvent);

    req.on("close", () => {
      eventEmitter.off("event", onEvent);
      res.end();
    });
  });

  // GET /api/events/:seq/raw — raw un-decoded topics and data for a single event.
  // Must be registered BEFORE /api/events/:seq so Express doesn't consume "raw"
  // as the :seq parameter.
  app.get(
    "/api/events/:seq/raw",
    asyncHandler(async (req, res) => {
      const seqStr = String(req.params.seq).trim();
      const seq = parseInt(seqStr, 10);
      if (isNaN(seq) || seq < 0 || !/^\d+$/.test(seqStr)) {
        return res.status(400).json({ error: "seq must be a non-negative integer" });
      }
      const ev = await db.getEvent(seq);
      if (!ev) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json({
        seq: ev.seq,
        raw_topics: ev.raw_topics,
        raw_data: ev.raw_data,
        tx_hash: ev.tx_hash,
      });
    })
  );

  // GET /api/events/:seq
  app.get(
    "/api/events/:seq",
    asyncHandler(async (req, res) => {
      const seqStr = String(req.params.seq).trim();
      const seq = parseInt(seqStr, 10);
      if (isNaN(seq) || seq < 0 || !/^\d+$/.test(seqStr)) {
        return res.status(400).json({ error: "seq must be a non-negative integer" });
      }
      const ev = await db.getEvent(seq);
      if (!ev) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json(ev);
    })
  );

  // GET /api/events/:seq/raw — return only the raw event payload fields.
  app.get(
    "/api/events/:seq/raw",
    asyncHandler(async (req, res) => {
      const seqStr = String(req.params.seq).trim();
      const seq = parseInt(seqStr, 10);
      if (isNaN(seq) || seq < 0 || !/^\d+$/.test(seqStr)) {
        return res.status(400).json({ error: "seq must be a non-negative integer" });
      }
      const ev = await db.getEvent(seq);
      if (!ev) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json({
        seq: ev.seq,
        raw_topics: ev.raw_topics,
        raw_data: ev.raw_data,
        tx_hash: ev.tx_hash,
      });
    })
  );

  // GET /api/contracts?q=&page=&limit= — paginated list of registered contracts,
  // optionally filtered by name/description via case-insensitive search.
  app.get(
    "/api/contracts",
    asyncHandler(async (req, res) => {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 25;
      const result = await db.getContracts({ q: req.query.q, page, limit });
      res.json(result);
    })
  );

  // GET /api/contracts/:id/events?fn=&page= — paginated event history for a
  // registered contract, optionally filtered by function name.
  app.get(
    "/api/contracts/:id/events",
    asyncHandler(async (req, res) => {
      const meta = await db.getContractMeta(req.params.id);
      if (!meta) {
        return res.status(404).json({ error: "Not found" });
      }
      const result = await db.getEvents({
        contract: req.params.id,
        fn: req.query.fn,
        page: Number(req.query.page) || 1,
      });
      res.json(result);
    })
  );

  // GET /api/contracts/:id
  app.get(
    "/api/contracts/:id",
    asyncHandler(async (req, res) => {
      const meta = await db.getContractMeta(req.params.id);
      if (!meta) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json(meta);
    })
  );

  // POST /api/contracts — register contract ABI metadata
  app.post(
    "/api/contracts",
    requireAdminKey,
    asyncHandler(async (req, res) => {
      const validationError = validateContractPayload(req.body);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const existing = await db.getContractMeta(req.body.id);
      const registeredBy = req.body.registered_by ?? existing?.registered_by;

      if (existing?.registered_by && !registeredBy) {
        return res
          .status(400)
          .json({ error: "registered_by is required to update contract metadata" });
      }

      await db.upsertContractMeta({ ...req.body, registered_by: registeredBy });
      res.status(201).json({ ok: true }

/* … truncated 3341 chars — edit only what you need near the top … */
