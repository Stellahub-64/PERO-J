import express from "express";
import rateLimit from "express-rate-limit";
import { db } from "./db.js";
import { fetchTokenMetadata } from "./sep41Metadata.js";
import { health } from "./index.js";

const PORT = process.env.PORT || 3001;

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export function startApi() {
  const app = express();
  app.use(express.json());

  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

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
          latestLedger: health.lastLedger,
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
        latestLedger: health.lastLedger,
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
      res.status(200).json({ status: "ok", db: "connected", latestLedger: health.lastLedger });
    })
  );

  // GET /api/functions — distinct function names across all events
  app.get(
    "/api/functions",
    asyncHandler(async (req, res) => {
      const result = await db.getDistinctFunctions();
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

  // POST /api/contracts — register ABI metadata
  app.post(
    "/api/contracts",
    asyncHandler(async (req, res) => {
      const existing = await db.getContractMeta(req.body.id);
      const registeredBy = req.body.registered_by ?? existing?.registered_by;

      if (existing?.registered_by && !registeredBy) {
        return res
          .status(400)
          .json({ error: "registered_by is required to update contract metadata" });
      }

      await db.upsertContractMeta({ ...req.body, registered_by: registeredBy });
      res.status(201).json({ ok: true });
    })
  );

  // GET /api/wallet/:address
  app.get(
    "/api/wallet/:address",
    asyncHandler(async (req, res) => {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 25;
      const result = await db.getWalletEvents(req.params.address, { page, limit });
      res.json(result);
    })
  );

  // GET /api/tokens/:id/volume — 24-hour rolling transfer volume
  // Query params:
  //   decimals (optional, integer) — override the token decimal precision instead of
  //   fetching it from on-chain metadata / simulation.  Useful when the simulation call
  //   would add latency or the caller already knows the precision.
  app.get(
    "/api/tokens/:id/volume",
    asyncHandler(async (req, res) => {
      const contractId = req.params.id;

      // Allow caller to bypass the metadata lookup with an explicit decimals override.
      let decimals;
      if (req.query.decimals !== undefined) {
        const parsed = parseInt(req.query.decimals, 10);
        if (isNaN(parsed) || parsed < 0 || parsed > 38) {
          return res.status(400).json({ error: "decimals must be an integer between 0 and 38" });
        }
        decimals = parsed;
      } else {
        // Fetch decimals from on-chain metadata (cached via contract registry or live sim)
        decimals = 7;
        try {
          const meta = await fetchTokenMetadata(contractId);
          decimals = meta.decimals;
        } catch {
          /* use default */
        }
      }

      const volume = await db.get24hVolume(contractId, decimals);
      res.json({ contract_id: contractId, window: "24h", ...volume });
    })
  );

  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Global Error Handler Middleware
  app.use((err, req, res, _next) => {
    console.error("API Error:", err);
    if (res.headersSent) {
      return;
    }
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  app.listen(PORT, () => console.log(`API listening on :${PORT}`));
}
