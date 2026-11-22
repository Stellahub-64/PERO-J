# ⬡ PERO-J

> **Human-readable PERO-J contract events on Stellar.**
> Instead of raw XDR bytes, users see: *"Address GABC… swapped 100 USDC → 98.7 XLM on StellarSwap at ledger #4521983."*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built on Stellar](https://img.shields.io/badge/Built%20on-Stellar-blueviolet)](https://stellar.org)

---

## The Problem

PERO-J have excellent support for classic assets but poor support for Soroban smart contracts. When a user calls `swap` on a DEX, explorers show raw XDR bytes — unreadable to anyone. This "black box" experience dampens DeFi, NFT, and web3 growth on Stellar.

## The Solution

PERO-J decodes contract calls on the fly using an ABI-like metadata registry, turning opaque XDR into plain English.

| Before | After |
|--------|-------|
| `AAAAA9hZ...[Raw XDR]...==` | Address `GABC…` swapped 100 USDC → 98.7 XLM on StellarSwap at ledger #4521983 |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  PERO-J RPC / Horizon                                  │
│  (getEvents, getTransaction)                            │
└────────────────────┬────────────────────────────────────┘
                     │ poll every 5 s
┌────────────────────▼────────────────────────────────────┐
│  Indexer  (Node.js)                                     │
│  • Fetches raw events via PERO-JRpc.getEvents()        │
│  • Decodes XDR → human text using ABI registry          │
│  • Stores decoded events in PostgreSQL                  │
│  • Exposes REST API on :3001                            │
└────────────────────┬────────────────────────────────────┘
                     │ REST /api/*
┌────────────────────▼────────────────────────────────────┐
│  React Frontend  (Vite + TanStack Query)                │
│  • Home: paginated event feed + function filter         │
│  • /contract/:id — ABI metadata + event history        │
│  • /wallet/:address — wallet transaction history        │
│  • /event/:seq — full decoded event detail              │
└─────────────────────────────────────────────────────────┘
                     ▲
┌────────────────────┴────────────────────────────────────┐
│  PERO-J Contract  (Rust)                               │
│  • ContractRegistry — stores ABI-like metadata          │
│  • EventDecoder — persists decoded events on-chain      │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Rust + `wasm32-unknown-unknown` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)
- Node.js ≥ 20
- PostgreSQL

### 1. Clone & configure
```bash
git clone https://github.com/PERO-J
cd PERO-J
cp .env.example .env
# Edit .env with your RPC URL and DATABASE_URL. See [.env.example](.env.example)
# for all supported indexer, database, contract, and SEP-41 settings.
```

### 2. Build & deploy the contract
```bash
make build      # compile to WASM
make test       # run unit tests
make deploy     # deploy to testnet, prints CONTRACT_ID
```
Copy the printed contract ID into `.env` as `EXPLORER_CONTRACT_ID`.

### 3. Start the indexer + API

The indexer validates `NETWORK_PASSPHRASE` on startup by querying the RPC endpoint. If the configured passphrase does not match the RPC-reported network, the indexer logs an error and exits with code 1. This prevents mainnet/testnet mix-ups.

```bash
make indexer-install
make indexer
```

### 4. Start the frontend
```bash
make frontend-install
make frontend
# Open http://localhost:5173
```

Or run both together:
```bash
make install
make dev
```

---

## Docker Compose (local development)

Skip the manual PostgreSQL setup and `.env` wiring by running the whole stack
(`postgres`, `indexer`, and `frontend`) with Docker Compose:

```bash
make dev-docker
```

This is equivalent to `docker compose up --build` and starts:

| Service | Port | Notes |
|---------|------|-------|
| `postgres` | `5432` | Data persisted in the `postgres-data` volume |
| `indexer` | `3001` | REST API; waits for Postgres to be healthy |
| `frontend` | `5173` | Vite dev server, points at the indexer |

`DATABASE_URL` is injected into the `indexer` service via the compose
environment (defaulting to `postgres://peroj:peroj@postgres:5432/peroj`).
Override it — along with `RPC_URL`, `NETWORK_PASSPHRASE`, `EXPLORER_CONTRACT_ID`,
and `API_ADMIN_KEY` — by exporting the variables or placing them in a `.env`
file next to `docker-compose.yml` before running `make dev-docker`.

Stop the stack with `docker compose down` (add `-v` to also drop the database
volume).

---

## Contract API

| Function | Description |
|----------|-------------|
| `init(admin)` | Initialise contract with admin address |
| `transfer_admin(current_admin, new_admin)` | Transfer admin rights; both parties must sign |
| `add_indexer(admin, indexer)` | Allowlist a hot wallet as a trusted event submitter (max 20) |
| `remove_indexer(admin, indexer)` | Revoke a previously allowlisted indexer |
| `get_indexers()` | List allowlisted indexer addresses |
| `is_indexer(address)` | Whether an address may submit events (admin or allowlisted) |
| `register_contract(caller, contract_id, meta)` | Register ABI metadata for a contract |
| `update_contract(caller, contract_id, meta)` | Update metadata (admin or registrant); emits `update` |
| `get_contract(contract_id)` | Fetch contract metadata |
| `submit_event(...)` | Persist a decoded event (admin or allowlisted indexer) |
| `get_event(seq)` | Fetch event by sequence number |
| `get_events(from, limit)` | Paginated event list; `limit` capped at 200 |
| `event_count()` | Total stored events |

Events emitted: `register`, `update`, `decoded`, `adm_xfr`, `idx_add`, `idx_rm`.
The `update` topic lets the indexer invalidate its ABI cache without polling storage.

---

## REST API

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Liveness + lag probe — returns `lag_seconds`, `uptime_seconds`, `last_ledger`. HTTP 200 when healthy, 503 when `lag_seconds > LAG_ALERT_THRESHOLD_S` (default 30). |
| `GET /api/events?contract=&fn=&page=` | Paginated event list: `{ events, total, page, limit }` |
| `GET /api/events/:seq` | Single event |
| `GET /api/events/:seq/raw` | Raw un-decoded event topics and data: `{ seq, raw_topics, raw_data, tx_hash }` |
| `GET /api/contracts/:id` | Contract ABI metadata |
| `GET /api/contracts/:id/events?fn=&page=` | Paginated event list for contract: `{ events, total, page, limit }` |
| `POST /api/contracts` | Register contract metadata |
| `DELETE /api/contracts/:id` | Remove contract ABI metadata (requires `Authorization: Bearer <API_ADMIN_KEY>`) |
| `GET /api/wallet/:address` | Wallet event history |
| `GET /api/tokens/:id/volume?decimals=` | 24-hour rolling transfer volume for a SEP-41 token. Optional `decimals` query param (integer 0–38) overrides the on-chain metadata lookup. |

### Event sequence namespaces

The `events` table tracks two distinct sequence numbers:

| Column | Type | Description |
|--------|------|-------------|
| `seq` | `BIGSERIAL` (PK) | Auto-increment database sequence. The canonical identifier used by the REST API and frontend (e.g. `GET /api/events/:seq`). Always present. |
| `onchain_seq` | `BIGINT` (nullable) | The `EventSeq` value returned by the on-chain `ExplorerContract` after a successful submission. `NULL` when the event was not submitted or the submission failed. |

These two namespaces are **independent** and will diverge over time — not every database row has a corresponding on-chain submission, and on-chain sequence numbers are scoped to the contract, not the database. Always use `seq` to reference events in API calls and frontend URLs.

### Volume endpoint

`GET /api/tokens/:id/volume` returns the 24-hour rolling transfer volume for a SEP-41 token.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` (path) | string | yes | Contract ID of the SEP-41 token |
| `decimals` (query) | integer 0–38 | no | Override decimal precision. When omitted, decimals are resolved from on-chain metadata / simulation (defaults to 7 if unavailable). |

Example response:

```json
{
  "contract_id": "CCWAMYJME4H5CKG7OLXGC2T4M6FL52XCZ3OQOAV6LL3GLA4RO4WH3ASP",
  "window": "24h",
  "volume": "1048576.0000000",
  "decimals": 7
}
```



### Uptime Monitoring

Configure an external monitor (UptimeRobot, Better Uptime, or similar) to call
`GET /health` every **60 seconds** and alert when the response is HTTP 503 **or**
`lag_seconds > LAG_ALERT_THRESHOLD_S` (default `30`).  This satisfies ROADMAP Tranche 2 deliverable 2.7 (< 10 s
index lag under normal load, alert threshold 30 s).

Example healthy response:
```json
{
  "status": "ok",
  "uptime_seconds": 3600,
  "lag_seconds": 4,
  "last_ledger": 5214892,
  "last_indexed_at": "2026-07-25T21:00:00.000Z"
}
```

Example degraded response (HTTP 503):
```json
{
  "status": "degraded",
  "uptime_seconds": 7200,
  "lag_seconds": 142,
  "last_ledger": 5214750,
  "last_indexed_at": "2026-07-25T20:57:38.000Z"
}
```

Override the alert threshold via the `LAG_ALERT_THRESHOLD_S` environment variable
(default `30`). Non-numeric values fall back to the default of `30`.

---

## SEP-41 Token Support

The decoder recognises SEP-41 token events (`transfer`, `mint`, `burn`) and formats amounts with the correct symbol, alongside classic Stellar assets fetched from Horizon.

---

## Validated Need & Traction

- **Confirmed gap:** StellarExpert and Stellar.expert (the two primary Stellar explorers) show
  raw XDR bytes for all Soroban contract events as of May 2026 — no human-readable 

---

## Detailed Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Stellar Network                                             │
│  ┌─────────────────────┐   ┌──────────────────────────────┐ │
│  │  PERO-J RPC        │   │  Horizon API                 │ │
│  │  getEvents()        │   │  Classic asset metadata      │ │
│  │  getTransaction()   │   │  (asset codes, issuers)      │ │
│  └──────────┬──────────┘   └──────────────┬───────────────┘ │
└─────────────┼────────────────────────────┼─────────────────┘
              │ poll every 5 s             │ on-demand
┌─────────────▼────────────────────────────▼─────────────────┐
│  Indexer (Node.js)                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  decoder.js                                          │  │
│  │  scValToNative(topic/data) → match ABI registry      │  │
│  │  → "Address GA… swapped 100 USDC → 98.7 XLM"        │  │
│  └──────────────────────┬───────────────────────────────┘  │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │  db.js  (PostgreSQL)                                 │  │
│  │  events table  ·  contracts table                    │  │
│  │  indexes on contract_id, function, ledger            │  │
│  └──────────────────────┬───────────────────────────────┘  │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │  api.js  (Express REST)                              │  │
│  │  GET /api/events  ·  GET /api/contracts/:id          │  │
│  │  GET /api/wallet/:address  ·  POST /api/contracts    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │ REST /api/*
┌─────────────────────────────▼───────────────────────────────┐
│  React Frontend (Vite + TanStack Query)                     │
│  /              — paginated feed, function filter           │
│  /contract/:id  — ABI metadata + event history             │
│  /wallet/:addr  — all events for a Stellar address         │
│  /event/:seq    — full decoded event detail                 │
└─────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────┴───────────────────────────────┐
│  PERO-J Contract (Rust)  — on-chain source of truth        │
│  ContractRegistry  register_contract / get_contract         │
│  EventDecoder      submit_event / get_events / event_count  │
└─────────────────────────────────────────────────────────────┘
```

**Data flow for a decoded event:**
1. PERO-J contract emits an event (e.g., `swap` on StellarSwap)
2. Indexer fetches it via `SorobanRpc.getEvents()`
3. `decoder.js` calls `scValToNative()` on topics/data, looks up registered ABI
4. Produces human-readable string → stored in PostgreSQL + submitted to on-chain contract
5. Frontend queries REST API and displays the decoded event

---

## SCF Submission Documents

| Document | Description |
|----------|-------------|
| [CHANGELOG.md](CHANGELOG.md) | Full release history — what changed, what broke, what was added |
| [ROADMAP.md](ROADMAP.md) | 3-tranche milestone plan (MVP → Testnet → Mainnet) |
| [BUDGET.md](BUDGET.md) | Engineering hours and cost breakdown per tranche |
| [TEAM.md](TEAM.md) | Team bios and qualification evidence |
| [MANIFEST.md](MANIFEST.md) | Full project manifest |
| [stellar.toml](stellar.toml) | SEP-1 compliant network info |

---

## Database Backup

Automated backups protect all decoded event history and registered ABI metadata stored in PostgreSQL.

### Local Backup Script

`scripts/backup.sh` uses `pg_dump` to produce a plain-text SQL dump of the `soroban_explorer` database.

```bash
./scripts/backup.sh
```

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PGHOST` | `localhost` | PostgreSQL host |
| `PGPORT` | `5432` | PostgreSQL port |
| `PGUSER` | `user` | PostgreSQL user |
| `PGDATABASE` | `soroban_explorer` | Database name |
| `PGPASSWORD` | (from env) | PostgreSQL password |
| `BACKUP_DIR` | `./backups` | Directory for dump files |
| `LOG_FILE` | `./logs/backup.log` | Backup log path |

### Automated Cron Job

Schedule daily backups at 02:00 UTC:

```cron
0 2 * * * /workspaces/PERO-J/scripts/backup.sh >> /var/log/backup.log 2>&1
```

Or deploy with a systemd timer, Docker cron, or your platform's scheduled task scheduler.

### Restore Procedure

To restore a backup into PostgreSQL:

```bash
# Stop the indexer to avoid data inconsistency
# Then pipe the dump into psql:
psql -h <host> -U <user> -d <database> -f backups/soroban_explorer_<timestamp>.sql
```

Or restore to a new database for verification:

```bash
createdb -h <host> -U <user> soroban_explorer_restore
psql -h <host> -U <user> -d soroban_explorer_restore -f backups/soroban_explorer_<timestamp>.sql
```

### Cloud Deployments

For cloud-hosted PostgreSQL, enable automated backups via the managed service:

| Platform | Setting |
|----------|---------|
| **AWS RDS** | Enable automated backups in the RDS instance configuration; set backup retention period (recommended: 7+ days). Use snapshots for point-in-time recovery. |
| **Google Cloud SQL** | Enable automated backups in the instance settings; set backup start time and retention period. Use scheduled exports to Cloud Storage for additional safety. |
| **Supabase** | Dashboard > Project Settings > Database > Backups. Enable daily automatic backups. |
| **Neon** | Dashboard > Settings > Branches & Backups. Configure branch protection and auto-backup retention. |

For any cloud provider, also export a `pg_dump` weekly to object storage (S3, GCS) as an offsite copy.

---

## Contributing

PRs welcome. Please open an issue first for large changes.

---

## Note to maintainers

- Issue #792: `EventPage` already validates the `seq` param (`isValidSeq`) and skips the API request for invalid values; no code change needed.
- Issue #793: `CopyButton` already accepts an `ariaLabel` prop applied as `aria-label`, and all usages pass labels; no code change needed.
- Issue #794: `Skeleton` already supports `variant="table"` and `"card"` and is used in `Home`, `ContractPage` and `WalletPage`; no code change needed.
- Issue #795: `Home.tsx` already debounces the search query (300ms, cleared on unmount) via `debouncedSearchQuery`; no code change needed.

---

## License

[MIT](LICENSE)

## Handsoff notes

<!-- handsoff-issue-850 -->
- #850: Implement `transfer_admin` requiring both parties to sign

<!-- handsoff-issue-745 -->
- #745: `init()` must be permanently irreversible after first call
