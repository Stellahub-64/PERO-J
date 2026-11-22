import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

const SPECIAL_CHARS = /[^\p{L}\p{N}\s]/u;

router.get('/api/events', async (req: Request, res: Response) => {
  const { q, contract, fn } = req.query as {
    q?: string;
    contract?: string;
    fn?: string;
  };

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (contract) {
    params.push(contract);
    conditions.push(`contract_id = $${params.length}`);
  }

  if (fn) {
    params.push(fn);
    conditions.push(`function_name = $${params.length}`);
  }

  if (q && q.trim().length > 0) {
    const term = q.trim();
    if (SPECIAL_CHARS.test(term)) {
      params.push(`%${term}%`);
      conditions.push(`description ILIKE $${params.length}`);
    } else {
      params.push(term);
      conditions.push(
        `description_tsv @@ plainto_tsquery('english', $${params.length})`
      );
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT id, contract_id, function_name, description, ledger, created_at
         FROM events
         ${where}
        ORDER BY ledger DESC
        LIMIT 100`,
      params
    );
    res.json({ events: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

export default router;
