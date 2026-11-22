/**
 * Auto-registration of ABI fixture metadata at indexer startup.
 *
 * The repo ships a set of ABI fixtures (ONE per third-party DEX/lending
 * protocol used to demonstrate decoded events on testnet — currently
 * StellarSwap, Blend, and Phoenix). This module loads every fixture file and
 * registers it via db.upsertContractMeta() so that the decoder can produce
 * rich, human-readable descriptions for those contracts without manual setup.
 *
 * Registration is idempotent (upsertContractMeta uses ON CONFLICT DO UPDATE).
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";

/** Directory containing the ABI fixture JSON files. */
const FIXTURES_DIR = fileURLToPath(new URL("../fixtures", import.meta.url));

/** Fixture files are named "<name>-abi.json". */
const FIXTURE_SUFFIX = "-abi.json";

/**
 * Register every ABI fixture in a directory.
 *
 * @param {object}   [opts]
 * @param {string}   [opts.dir]        - Fixtures directory (defaults to the repo's fixtures dir).
 * @param {boolean}  [opts.log=true]   - Log each registered contract.
 * @returns {Promise<string[]>} The list of registered contract IDs.
 */
export async function registerFixtures({ dir = FIXTURES_DIR, log = true } = {}) {
  const files = (await readdir(dir)).filter((f) => f.endsWith(FIXTURE_SUFFIX)).sort();

  const registered = [];
  for (const file of files) {
    const raw = await readFile(path.join(dir, file), "utf8");
    const meta = JSON.parse(raw);
    await db.upsertContractMeta({ ...meta, registered_by: "fixture" });
    registered.push(meta.id);
    if (log) {
      console.log(`[fixtures] registered ${meta.name} (${meta.id}) from ${file}`);
    }
  }
  return registered;
}
