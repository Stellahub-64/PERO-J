'use strict';

const DEFAULT_LAG_ALERT_THRESHOLD_S = 30;

/**
 * Resolve the lag alert threshold (in seconds) from the environment.
 * Falls back to the default of 30 when the value is missing or non-numeric.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {number}
 */
function getLagAlertThresholdS(env = process.env) {
  const raw = env && env.LAG_ALERT_THRESHOLD_S;
  if (raw === undefined || raw === null || raw === '') {
    return DEFAULT_LAG_ALERT_THRESHOLD_S;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LAG_ALERT_THRESHOLD_S;
  }
  return parsed;
}

/**
 * Build a health report for the indexer, flagging lag when the observed
 * lag exceeds the configured alert threshold.
 *
 * @param {{ lagSeconds?: number }} [state]
 * @param {NodeJS.ProcessEnv} [env]
 */
function getHealth(state = {}, env = process.env) {
  const lagSeconds = typeof state.lagSeconds === 'number' ? state.lagSeconds : 0;
  const thresholdS = getLagAlertThresholdS(env);
  const lagAlert = lagSeconds > thresholdS;

  return {
    status: lagAlert ? 'degraded' : 'ok',
    lagSeconds,
    lagAlertThresholdS: thresholdS,
    lagAlert,
  };
}

module.exports = {
  DEFAULT_LAG_ALERT_THRESHOLD_S,
  getLagAlertThresholdS,
  getHealth,
};
