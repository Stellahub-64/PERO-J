const express = require('express');
const db = require('./db');

const app = express();
app.use(express.json());

const STATS_CACHE_TTL_MS = 60 * 1000;
let statsCache = null;
let statsCacheExpiresAt = 0;

app.get('/api/stats', async (req, res) => {
  try {
    const now = Date.now();
    if (statsCache && now < statsCacheExpiresAt) {
      return res.json(statsCache);
    }

    const stats = await db.getStats();
    statsCache = stats;
    statsCacheExpiresAt = now + STATS_CACHE_TTL_MS;
    return res.json(stats);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load stats' });
  }
});

module.exports = app;
