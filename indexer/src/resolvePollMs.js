export const MIN_POLL_MS = 1000;

/**
 * Resolve the poll interval, clamped to a minimum of MIN_POLL_MS.
 * Logs a warning when the requested value is below the minimum.
 */
export function resolvePollMs(raw = process.env.POLL_MS, warn = console.warn) {
  const requested = Number(raw || 5000);
  const value = Math.max(MIN_POLL_MS, requested);
  if (requested < MIN_POLL_MS) {
    warn(`POLL_MS=${requested} is below the minimum of ${MIN_POLL_MS}ms — using ${MIN_POLL_MS}ms`);
  }
  return value;
}
