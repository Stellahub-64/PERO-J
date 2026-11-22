/**
 * Tests for POST /api/contracts payload validation (#785)
 *
 * Covers the validateContractPayload helper directly (unit tests) and the
 * full HTTP round-trip via a real in-process Express server (integration
 * tests) to satisfy all acceptance criteria.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createApp, validateContractPayload } from "../src/api.js";
import { db } from "../src/db.js";

// ── unit tests for the pure helper ───────────────────────────────────────────

describe("validateContractPayload()", () => {
  it("returns null for a valid minimal payload", () => {
    assert.equal(validateContractPayload({ id: "CAAA", name: "Test" }), null);
  });

  it("returns null when functions is a valid array", () => {
    assert.equal(
      validateContractPayload({ id: "CAAA", name: "Test", functions: [] }),
      null
    );
    assert.equal(
      validateContractPayload({ id: "CAAA", name: "Test", functions: [{ name: "swap" }] }),
      null
    );
  });

  it("returns 'id is required' when id is missing", () => {
    assert.equal(validateContractPayload({ name: "Test" }), "id is required");
  });

  it("returns 'id is required' when id is an empty string", () => {
    assert.equal(validateContractPayload({ id: "", name: "Test" }), "id is required");
  });

  it("returns 'id is required' when id is whitespace only", () => {
    assert.equal(validateContractPayload({ id: "   ", name: "Test" }), "id is required");
  });

  it("returns 'id is required' when id is not a string", () => {
    assert.equal(validateContractPayload({ id: 123, name: "Test" }), "id is required");
  });

  it("returns 'name is required' when name is missing", () => {
    assert.equal(validateContractPayload({ id: "CAAA" }), "name is required");
  });

  it("returns 'name is required' when name is an empty string", () => {
    assert.equal(validateContractPayload({ id: "CAAA", name: "" }), "name is required");
  });

  it("returns 'name is required' when name is whitespace only", () => {
    assert.equal(validateContractPayload({ id: "CAAA", name: "  " }), "name is required");
  });

  it("returns 'name is required' when name is not a string", () => {
    assert.equal(validateContractPayload({ id: "CAAA", name: 42 }), "name is required");
  });

  it("returns 'functions must be an array' when functions is a non-array value", () => {
    assert.equal(
      validateContractPayload({ id: "CAAA", name: "Test", functions: "swap" }),
      "functions must be an array"
    );
    assert.equal(
      validateContractPayload({ id: "CAAA", name: "Test", functions: { name: "swap" } }),
      "functions must be an array"
    );
    assert.equal(
      validateContractPayload({ id: "CAAA", name: "Test", functions: 1 }),
      "functions must be an array"
    );
  });

  it("returns 'id is required' when body is null", () => {
    assert.equal(validateContractPayload(null), "id is required");
  });

  it("returns 'id is required' when body is an array", () => {
    assert.equal(validateContractPayload([]), "id is required");
  });
});

// ── integration tests: full HTTP round-trip ───────────────────────────────────

describe("POST /api/contracts — payload validation (#785)", () => {
  let server;
  let baseUrl;
  let originalUpsert;
  let originalGetContractMeta;

  beforeEach(async () => {
    originalUpsert = db.upsertContractMeta;
    originalGetContractMeta = db.getContractMeta;
    const app = createApp();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterEach(async () => {
    db.upsertContractMeta = originalUpsert;
    db.getContractMeta = originalGetContractMeta;
    await new Promise((resolve) => server.close(resolve));
  });

  // ── acceptance criterion: missing id → HTTP 400 ──────────────────────────

  it("returns HTTP 400 { error: 'id is required' } when id is missing", async () => {
    const res = await fetch(`${baseUrl}/api/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "StellarSwap" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, "id is required");
  });

  it("returns HTTP 400 when id is an empty string", async () => {
    const res = await fetch(`${baseUrl}/api/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "", name: "StellarSwap" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, "id is required");
  });

  // ── acceptance criterion: missing name → HTTP 400 ────────────────────────

  it("returns HTTP 400 { error: 'name is required' } when name is missing", async () => {
    const res = await fetch(`${baseUrl}/api/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "CAAA" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, "name is required");
  });

  it("returns HTTP 400 when name is an empty string", async () => {
    const res = await fetch(`${baseUrl}/api/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "CAAA", name: "" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, "name is required");
  });

  // ── acceptance criterion: non-array functions → HTTP 400 ─────────────────

  it("returns HTTP 400 { error: 'functions must be an array' } when functions is a string", async () => {
    const res = await fetch(`${baseUrl}/api/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "CAAA", name: "StellarSwap", functions: "swap" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, "functions must be an array");
  });

  it("returns HTTP 400 when functions is an object", async () => {
    const res = await fetch(`${baseUrl}/api/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "CAAA", name: "StellarSwap", functions: { name: "swap" } }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, "functions must be an array");
  });

  // ── acceptance criterion: valid payload → HTTP 201 { ok: true } ──────────

  it("returns HTTP 201 { ok: true } for a valid minimal payload", async () => {
    db.getContractMeta = async () => null;
    db.upsertContractMeta = async () => {};

    const res = await fetch(`${baseUrl}/api/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "CAAA", name: "StellarSwap" }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.deepEqual(body, { ok: true });
  });

  it("returns HTTP 201 { ok: true } when functions is a valid array", async () => {
    db.getContractMeta = async () => null;
    db.upsertContractMeta = async () => {};

    const res = await fetch(`${baseUrl}/api/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "CAAA",
        name: "StellarSwap",
        functions: [{ name: "swap", description: "Swap tokens" }],
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.deepEqual(body, { ok: true });
  });

  it("does not call db.upsertContractMeta when validation fails", async () => {
    let upsertCalled = false;
    db.upsertContractMeta = async () => {
      upsertCalled = true;
    };

    await fetch(`${baseUrl}/api/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "StellarSwap" }), // missing id
    });

    assert.equal(upsertCalled, false, "upsert must not be called when validation fails");
  });
});
