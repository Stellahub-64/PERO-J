# E2E Tests — Full Pipeline Verification

This directory contains end-to-end tests that verify the entire PERO-J data flow:

```
Soroban contract → Indexer (RPC poll + decode) → REST API → Frontend (React)
```

## Prerequisites

- Docker & Docker Compose v2+
- Node.js >= 20
- Rust toolchain with `wasm32-unknown-unknown` target
- `soroban-cli` (installed automatically if missing)

## Quick Start (single command)

```bash
make e2e
```

This runs the full sequence:

1. `e2e-setup` — Install npm deps + Playwright browser
2. `e2e-build` — Build Docker images (indexer, frontend)
3. `e2e-up` — Start soroban sandbox, postgres, indexer, frontend
4. `e2e-deploy` — Build contract WASM, deploy to sandbox, init, seed event
5. `e2e-test` — Run Playwright assertions against the live stack
6. `e2e-down` — Clean up containers and volumes

## Step-by-step

```bash
# 1. Install test dependencies
make e2e-setup

# 2. Build Docker images
make e2e-build

# 3. Start the full stack
make e2e-up

# 4. Build WASM, deploy contract to sandbox, register ABI, submit event
make e2e-deploy

# 5. Run the Playwright tests
make e2e-test

# 6. Tear down
make e2e-down
```

## What the test does

### Setup phase (`helpers/deploy.js`)

1. **Builds** the Soroban contract WASM via `cargo build --release`
2. **Checks** that the `soroban` CLI is available (installs it via cargo if not)
3. **Creates** a funded Stellar account via the sandbox's friendbot
4. **Deploys** the ExplorerContract to the local sandbox using `soroban contract deploy`
5. **Initializes** the contract with the admin account
6. **Registers** the ExplorerContract's own ABI metadata via the REST API
7. **Submits** a decoded swap event via the contract's `submit_event` function
8. **Waits** for the indexer to poll the sandbox RPC and pick up the event
9. **Verifies** the event appears in the API response

### Test phase (`e2e.test.js`)

| Test | What it verifies |
|------|-----------------|
| API returns indexed events | `GET /api/events` returns a non-empty array with valid fields |
| Single-event endpoint | `GET /api/events/:seq` returns the correct event |
| Frontend home page | Page renders event table with seq links (`#N`) |
| Event description in UI | The decoded description text is visible in the table |
| Event detail page | Navigate to `/event/:seq` and see the full description |
| Contract metadata page | Navigate to `/contract/:id` and see the registered name |
| Pagination controls | Prev/Next buttons exist; Prev is disabled on page 1 |

## Environment Variables

| Variable         | Default                                              | Description                         |
|------------------|------------------------------------------------------|-------------------------------------|
| `INDEXER_URL`    | `http://localhost:3001`                              | Base URL for the indexer API        |
| `FRONTEND_URL`   | `http://localhost:5173`                              | Base URL for the frontend           |

These variables allow the E2E tests and Playwright configuration to work both locally and inside Docker Compose. Inside the Compose network, services use container hostnames (e.g., `http://indexer:3001`, `http://frontend:5173`); locally they default to `localhost`.

## CI Integration

The E2E suite runs as a separate job in `.github/workflows/ci.yml`:

- Triggered on PRs and pushes to `main`
- Uses `ubuntu-latest` with Docker, Rust, and Node.js
- Installs the `soroban-cli` via `cargo install`
- Starts the full stack via `docker compose`
- Deploys the contract and seeds test data
- Runs Playwright tests with `--reporter=github`
- Collects Docker logs on failure for debugging
- Tears down containers in the `finally` block

closes #109
