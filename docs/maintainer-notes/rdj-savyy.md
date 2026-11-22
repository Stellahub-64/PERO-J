# Maintainer notes (rdj-savyy)

## #804 DELETE /api/contracts/:id
Already implemented: `app.delete("/api/contracts/:id")` in `indexer/src/api.js`, guarded by `requireAdminKey` (401 without a valid Bearer key), returns 204/404, backed by `db.deleteContractMeta` in `indexer/src/db.js`.

## #805 Error handler logging
Already implemented: exported `errorHandler` in `indexer/src/api.js` logs `console.error("API Error:", { method, path, stack })`; covered by the "errorHandler middleware" tests in `indexer/test/api.test.js`.

## #806 Version footer
Already implemented: `frontend/src/components/Footer.tsx` reads `VITE_APP_VERSION` / `VITE_COMMIT_SHA` with placeholders (`dev` / `local`); variables are documented in `.env.example`. Note: no CI workflow currently builds the frontend, so there is no build step to inject them into yet.

## #807 e2e env vars
Already implemented: `INDEXER_URL` in `tests/e2e/e2e.test.js` and `FRONTEND_URL` in `tests/e2e/playwright.config.ts`, defaulting to localhost; documented in `tests/e2e/README.md`.
