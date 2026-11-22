# Maintainer notes (Valreb001)

## #808 dump file size validation

Already implemented in `scripts/backup.sh` (checks `stat -c%s` is greater than 512 after `pg_dump`, logs an error, removes the file and exits 1) and documented in `docs/backup.md` under "Minimum Dump Size". No code change needed; this issue can be closed.

## #809 NETWORK_PASSPHRASE startup validation

Already implemented: `validateNetwork(rpc)` in `indexer/src/validateNetwork.js` is called from `indexer/src/index.js` at startup, exits 1 on mismatch, is covered by `indexer/test/index.test.js` and described in `README.md`. No code change needed; this issue can be closed.

## #810 sourceAccountNotFound retry in sep41Metadata

Already implemented in `simulateCall` in `indexer/src/sep41Metadata.js`: on a source-account-not-found simulation error with sequence "0" it retries with "1", and `OPERATIONAL_ACCOUNT` is used when set. The function has JSDoc and the behavior is tested in `indexer/test/sep41Metadata.test.js`. No code change needed; this issue can be closed.

## #811 getWalletEvents pagination

Already implemented: `getWalletEvents` in `indexer/src/db.js` runs a separate `COUNT(*)` query and returns `{ events, total, page, limit }`; `frontend/src/pages/WalletPage` disables Next via `page * limit >= total`. No code change needed; this issue can be closed.
