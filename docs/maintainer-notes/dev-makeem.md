# Maintainer notes (Dev-makeem)

## #800 EventTable stable keys
Already implemented: `frontend/src/components/EventTable.tsx` wraps each event pair in `<React.Fragment key={ev.seq}>`.

## #801 GET /api/contracts
Already implemented: `indexer/src/api.js` defines `GET /api/contracts` (q/page/limit, default limit 25) via `db.getContracts`, with tests in `indexer/test/api.contracts.test.js`.

## #803 RPC client recreation
Already implemented: the polling loop in `indexer/src/index.js` tracks `consecutiveErrors`, and at `RPC_ERROR_THRESHOLD` (3) logs "N consecutive RPC errors — recreating RPC client", reassigns `rpc` and resets the counter (also reset on success).
