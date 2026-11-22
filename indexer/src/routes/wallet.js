const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Validates Stellar Ed25519 public keys (G...) and contract IDs (C...).
// Strkey: 1 version byte + 32 payload bytes + 2 CRC16 bytes = 56 chars, base32.
const STRKEY_BASE32 = /^[A-Z2-7]+$/;

function isValidStellarAddress(address) {
  if (typeof address !== 'string' || address.length !== 56) {
    return false;
  }

  const version = address[0];
  if (version !== 'G' && version !== 'C') {
    return false;
  }

  return STRKEY_BASE32.test(address);
}

// GET /api/wallet/:address
router.get('/:address', async (req, res) => {
  const { address } = req.params;

  if (!isValidStellarAddress(address)) {
    return res.status(400).json({ error: 'Invalid Stellar address' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM wallets WHERE address = $1',
      [address]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching wallet:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
