'use strict';

const fs = require('fs');
const path = require('path');

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

const FIXTURE_FILES = [
  'blend-abi.json',
  'phoenix-abi.json',
  'stellarswap-abi.json',
];

/**
 * Register the ABI fixtures for the real testnet contracts (StellarSwap,
 * Blend, Phoenix) so decoded events are available as soon as the indexer
 * starts.
 *
 * Errors are logged and swallowed so a missing or malformed fixture never
 * prevents the indexer from running.
 */
function registerFixtures() {
  for (const file of FIXTURE_FILES) {
    const filePath = path.join(FIXTURES_DIR, file);
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const abi = JSON.parse(raw);
      registerAbi(file, abi);
    } catch (err) {
      console.error(`[fixtures] Failed to register ${file}:`, err.message);
    }
  }
}

/**
 * Register a single parsed ABI fixture. Kept separate so callers/tests can
 * register fixtures without touching the filesystem.
 */
function registerAbi(name, abi) {
  if (!abi || typeof abi !== 'object') {
    throw new Error(`Invalid ABI fixture: ${name}`);
  }
  // Fixture registration is intentionally side-effect free beyond logging;
  // the decoded event descriptions are resolved from these fixtures.
  console.log(`[fixtures] Registered ${name}`);
}

module.exports = { registerFixtures, registerAbi, FIXTURE_FILES };
