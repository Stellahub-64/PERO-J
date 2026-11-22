-include .env
export EXPLORER_CONTRACT_ID

.PHONY: build test deploy redeploy indexer frontend clean seed-testnet load-test changelog db dev-docker

# ── Contract ──────────────────────────────────────────────────────────────────
build:
	cargo build --release --target wasm32-unknown-unknown \
	  -p soroban-explorer-contract
	wasm-opt -Oz target/wasm32-unknown-unknown/release/soroban_explorer_contract.wasm \
	  -o target/wasm32-unknown-unknown/release/soroban_explorer_contract.optimized.wasm

test:
	cargo test -p soroban-explorer-contract

optimize:
	stellar contract optimize \
	  --wasm target/wasm32-unknown-unknown/release/soroban_explorer_contract.wasm

deploy: build optimize
	@if [ -z "$$EXPLORER_CONTRACT_ID" ]; then \
		stellar contract deploy \
		  --wasm target/wasm32-unknown-unknown/release/soroban_explorer_contract.optimized.wasm \
		  --source default \
		  --network testnet; \
	else \
		echo "Warning: EXPLORER_CONTRACT_ID is already set. Use 'make redeploy' to force a new instance."; \
		exit 1; \
	fi

redeploy: build optimize
	stellar contract deploy \
	  --wasm target/wasm32-unknown-unknown/release/soroban_explorer_contract.optimized.wasm \
	  --source default \
	  --network testnet

# ── Indexer ───────────────────────────────────────────────────────────────────
indexer-install:
	cd indexer && npm install

indexer:
	cd indexer && NODE_ENV=production npm start

# ── Migrations (issue #858) ───────────────────────────────────────────────────
# Run db.init() in isolation — applies schema migrations without starting the
# polling loop or the API server. Exits 0 on success, non-zero on failure.
migrate:
	cd indexer && NODE_ENV=production npm run migrate

# ── Frontend ──────────────────────────────────────────────────────────────────
frontend-install:
	cd frontend && npm install

frontend:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

# ── All ───────────────────────────────────────────────────────────────────────
install: indexer-install frontend-install

db:
	docker compose up -d db

dev:
	$(MAKE) -j2 indexer frontend

# ── Docker Compose (issue #839) ───────────────────────────────────────────────
# Start the full local stack (postgres + indexer + frontend) via Docker Compose.
dev-docker:
	docker compose up --build

clean:
	cargo clean
	rm -rf frontend/dist

# ── Testnet seed (issue #120) ─────────────────────────────────────────────────
# Register StellarSwap and Blend ABI fixtures via the running REST API.
# Requires: API running on $(API_BASE_URL) (default http://localhost:3001)
#           curl available on PATH
API_BASE_URL ?= http://localhost:3001

seed-testnet:
	@echo "Registering StellarSwap ABI..."
	curl -sf -X POST $(API_BASE_URL)/api/contracts \
	  -H "Content-Type: application/json" \
	  -d @indexer/fixtures/stellarswap-abi.json
	@echo ""
	@echo "Registering Blend ABI..."
	curl -sf -X POST $(API_BASE_URL)/api/contracts \
	  -H "Content-Type: application/json" \
	  -d @indexer/fixtures/blend-abi.json
	@echo ""
	@echo "Testnet ABIs registered."

# ── Load test (issue #121) ────────────────────────────────────────────────────
# Run the k6 load test against $(API_BASE_URL).
# Requires: k6 — https://grafana.com/docs/k6/latest/set-up/install-k6/
load-test:
	k6 run \
	  --env API_BASE_URL=$(API_BASE_URL) \
	  tests/load/api_load_test.js

# ── E2E tests (issue #109) ────────────────────────────────────────────────────
# End-to-end test verifying the full pipeline: contract → indexer → API → frontend
# Prerequisites: Docker, Rust (for WASM build), soroban CLI
#
# Targets:
#   e2e-setup     — Install Playwright + soroban CLI deps
#   e2e-build     — Build the Docker images for the stack
#   e2e-up        — Start the full E2E stack (sandbox + postgres + indexer + frontend)
#   e2e-down      — Stop and remove the E2E stack
#   e2e-deploy    — Build WASM, deploy contract, seed test data
#   e2e-test      — Run the Playwright E2E tests
#   e2e           — Full E2E run: build → up → deploy → test → down
#   e2e-ci        — CI variant: same as e2e but with --wait and no --detach

E2E_DIR  := tests/e2e
COMPOSE  := docker compose -f $(E2E_DIR)/docker-compose.e2e.yml

e2e-setup:
	cd $(E2E_DIR) && npm install
	cd $(E2E_DIR) && npx playwright install chromium

e2e-build:
	$(COMPOSE) build

e2e-up:
	$(COMPOSE) up -d --wait

e2e-down:
	$(COMPOSE) down -v

e2e-deploy: build
	cd $(E2E_DIR) && node helpers/deploy.js

e2e-test:
	cd $(E2E_DIR) && npx playwright test

e2e: e2e-setup e2e-build e2e-up e2e-deploy e2e-test
	$(MAKE) e2e-down

e2e-ci:
	$(MAKE) e2e-setup
	$(COMPOSE) up -d --wait
	$(MAKE) e2e-deploy
	cd $(E2E_DIR) && npx playwright test --reporter=github
	$(MAKE) e2e-down

# ── Changelog ─────────────────────────────────────────────────────────────────
# Regenerate CHANGELOG.md from conventional commits using git-cliff.
# Install: cargo install git-cliff  OR  brew install git-cliff
changelog:
	git-cliff --config cliff.toml --unreleased --output CHANGELOG.md
	@echo "CHANGELOG.md updated."

changelog-preview:
	git-cliff --config cliff.toml --unreleased

help:
	@printf "Available targets:\n"
	@printf "  make build              Build the contract WASM\n"
	@printf "  make test               Run contract tests\n"
	@printf "  make migrate            Apply DB migrations without starting the indexer\n"
	@printf "  make dev                Start the indexer and frontend\n"
	@printf "  make dev-docker         Start the full stack via Docker Compose\n"
	@printf "  make e2e                Run the full end-to-end suite\n"
	@printf "  make changelog          Update CHANGELOG.md with unreleased changes\n"
	@printf "  make changelog-preview  Preview unreleased changes without modifying files\n"
