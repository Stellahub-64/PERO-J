const express = require('express');
const router = express.Router();
const db = require('../db');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// GET /api/contracts/:id/events?fn=&page=
// Paginated event history for a single contract, optionally filtered by function name.
router.get('/:id/events', async (req, res) => {
  const { id } = req.params;
  const { fn } = req.query;

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT)
  );
  const offset = (page - 1) * limit;

  try {
    const contract = await db.getContractById(id);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const { events, total } = await db.getEventsByContract({
      contractId: id,
      fn: fn || null,
      limit,
      offset,
    });

    return res.json({ events, total, page, limit });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch contract events' });
  }
});

module.exports = router;
