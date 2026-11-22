const express = require('express');

const CACHE_TTL_MS = 60 * 1000;

/**
 * Creates the stats router exposing aggregate counts.
 *
 * @param {object} db database client exposing getStats()
 * @returns {import('express').Router}
 */
function createStatsRouter(db) {
  const router = express.Router();

  let cache = null;
  let cacheExpiresAt = 0;

  router.get('/stats', async (req, res, next) => {
    try {
      const now = Date.now();
      if (!cache || now >= cacheExpiresAt) {
        cache = await db.getStats();
        cacheExpiresAt = now + CACHE_TTL_MS;
      }

      res.json(cache);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createStatsRouter;
module.exports.createStatsRouter = createStatsRouter;
module.exports.CACHE_TTL_MS = CACHE_TTL_MS;
