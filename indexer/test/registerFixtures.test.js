/**
 * Tests for src/registerFixtures.js
 *
 * registerFixtures reads ABI fixture JSON files from a directory and registers
 * each one via db.upsertContractMeta(). We monkey-patch db.upsertContractMeta
 * to record the calls so we never touch a real database.
 */

import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Import AFTER registering helper paths; db is patched inside each test.
import { db } from "../src/db.js";
import { registerFixtures } from "../src/registerFixtures.js";

// Point at the repo's real fixtures directory so tests exercise real data.
const REPO_FIXTURES_DIR = fileURLToPath(new URL("../fixtures", import.meta.url));

function makeFixture(id, name, fnName) {
  return {
    id,
    name,
    description: `${name} test fixture`,
    functions: [{ name: fnName, params: [] }],
  };
}

function writeFixture(file, meta) {
  return writeFile(file, JSON.stringify(meta, null, 2));
}

let tempDir;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), "pero-fixtures-"));
});

after(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

describe("registerFixtures()", () => {
  it("registers every *-abi.json fixture in the directory", async () => {
    const recorded = [];
    db.upsertContractMeta = async (meta) => {
      recorded.push(meta);
    };

    await writeFixture(path.join(tempDir, "stellarswap-abi.json"), makeFixture("C1", "StellarSwap", "swap"));
    await writeFixture(path.join(tempDir, "blend-abi.json"), makeFixture("C2", "Blend", "supply"));
    await writeFixture(path.join(tempDir, "phoenix-abi.json"), makeFixture("C3", "Phoenix", "swap"));

    const registered = await registerFixtures({ dir: tempDir, log: false });

    assert.deepEqual(registered.sort(), ["C1", "C2", "C3"]);
    assert.equal(recorded.length, 3);
    const names = recorded.map((m) => m.name).sort();
    assert.deepEqual(names, ["Blend", "Phoenix", "StellarSwap"]);
    // Each fixture is tagged so auto-registration is distinguishable.
    for (const meta of recorded) {
      assert.equal(meta.registered_by, "fixture");
    }
  });

  it("registers the repo's real fixtures (StellarSwap, Blend, Phoenix)", async () => {
    const recorded = [];
    db.upsertContractMeta = async (meta) => {
      recorded.push(meta);
    };

    const registered = await registerFixtures({ dir: REPO_FIXTURES_DIR, log: false });

    const names = recorded.map((m) => m.name).sort();
    assert.deepEqual(names, ["Blend", "Phoenix", "StellarSwap"]);
    assert.equal(registered.length, 3);
  });

  it("returns an empty list when the directory has no fixture files", async () => {
    const recorded = [];
    db.upsertContractMeta = async (meta) => {
      recorded.push(meta);
    };
    await writeFile(path.join(tempDir, "notes.txt"), "not a fixture");
    const registered = await registerFixtures({ dir: tempDir, log: false });
    assert.deepEqual(registered, []);
    assert.equal(recorded.length, 0);
  });
});
