// Cache TTL for successfully resolved (registered) ABIs.
const ABI_CACHE_TTL_MS = 60_000;

// Short cache TTL for negative (not-registered) ABI lookups so that
// contracts registered during the window are re-discovered quickly.
const NOT_REGISTERED_TTL_MS = 2000;

// Default lag alert threshold (seconds) used by the health check.
const DEFAULT_LAG_ALERT_THRESHOLD_S = 30;

// Allow deployments to override the lag alert threshold via the
// LAG_ALERT_THRESHOLD_S env var. Non-numeric values fall back to the default.
function resolveLagAlertThresholdS() {
  const raw = process.env.LAG_ALERT_THRESHOLD_S;
  if (raw === undefined || raw === null || raw === '') {
    return DEFAULT_LAG_ALERT_THRESHOLD_S;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LAG_ALERT_THRESHOLD_S;
  }
  return parsed;
}

const LAG_ALERT_THRESHOLD_S = resolveLagAlertThresholdS();

module.exports = {
  ABI_CACHE_TTL_MS,
  NOT_REGISTERED_TTL_MS,
  DEFAULT_LAG_ALERT_THRESHOLD_S,
  LAG_ALERT_THRESHOLD_S,
};
