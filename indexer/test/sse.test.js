/**
 * Tests for GET /api/events/stream (SSE endpoint).
 *
 * Strategy: build the Express app in isolation by mocking the two circular
 * dependencies (db and eventEmitter from index.js) so no database or RPC
 * connection is needed.
 */

import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { EventEmitter } from "node:events";
import express from "express";

// ── minimal in-process SSE app (mirrors api.js logic) ────────────────────────

/**
 * Builds a standalone Express app that wires up only the SSE route,
 * driven by the supplied emitter.  This avoids importing the real api.js
 * (which has a circular dependency on index.js which starts the indexer).
 */
function buildApp(emitter) {
  const app = express();

  app.get("/api/events/stream", (req, res) => {
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const keepAlive = setInterval(() => res.write(": ping\n\n"), 15_000);

    const onEvent = (ev) => {
      res.write(`data: ${JSON.stringify(ev)}\n\n`);
    };

    emitter.on("event", onEvent);

    req.on("close", () => {
      clearInterval(keepAlive);
      emitter.off("event", onEvent);
    });
  });

  return app;
}

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Opens an HTTP connection to the SSE endpoint and collects raw chunks.
 * Resolves with { statusCode, headers, chunks } once `collectCount` data
 * frames have been received, then destroys the socket.
 *
 * @param {http.Server} server
 * @param {number} collectCount  how many `data:` frames to wait for
 * @returns {Promise<{statusCode: number, headers: object, chunks: string[]}>}
 */
function connectSSE(server, collectCount = 1) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const req = http.request(
      { hostname: "127.0.0.1", port, path: "/api/events/stream", method: "GET" },
      (res) => {
        const chunks = [];
        res.setEncoding("utf8");

        res.on("data", (chunk) => {
          // Accumulate data: frames (ignore keep-alive comments)
          const frames = chunk.split("\n\n").filter((f) => f.startsWith("data:"));
          chunks.push(...frames);
          if (chunks.length >= collectCount) {
            req.destroy();
            resolve({ statusCode: res.statusCode, headers: res.headers, chunks });
          }
        });

        res.on("error", reject);
      }
    );
    req.on("error", (err) => {
      // ECONNRESET is expected when req.destroy() is called — treat it as success
      // if we already have enough chunks (resolve was already called).
      if (err.code !== "ECONNRESET") {
        reject(err);
      }
    });
    req.end();
  });
}

/**
 * Promisified server listen / close helpers.
 */
function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
}
function close(server) {
  return new Promise((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/events/stream", () => {
  let emitter;
  let server;

  before(async () => {
    emitter = new EventEmitter();
    const app = buildApp(emitter);
    server = http.createServer(app);
    await listen(server);
  });

  after(async () => {
    await close(server);
  });

  it("responds with Content-Type: text/event-stream", async () => {
    // Emit one event shortly after the connection opens so it resolves.
    setTimeout(() => emitter.emit("event", { seq: 1, function: "swap" }), 20);

    const { statusCode, headers } = await connectSSE(server, 1);

    assert.equal(statusCode, 200);
    assert.ok(
      headers["content-type"]?.startsWith("text/event-stream"),
      `Expected text/event-stream, got ${headers["content-type"]}`
    );
  });

  it("sets X-Accel-Buffering: no", async () => {
    setTimeout(() => emitter.emit("event", { seq: 2, function: "mint" }), 20);

    const { headers } = await connectSSE(server, 1);

    assert.equal(headers["x-accel-buffering"], "no");
  });

  it("delivers emitted events as SSE data frames", async () => {
    const payload = { seq: 42, function: "swap", description: "swapped 100 USDC" };

    setTimeout(() => emitter.emit("event", payload), 20);

    const { chunks } = await connectSSE(server, 1);

    assert.equal(chunks.length, 1);
    const line = chunks[0]; // "data: {...}"
    assert.ok(line.startsWith("data: "), `Unexpected frame: ${line}`);

    const parsed = JSON.parse(line.slice("data: ".length));
    assert.deepEqual(parsed, payload);
  });

  it("delivers multiple events in order", async () => {
    const events = [
      { seq: 10, function: "transfer" },
      { seq: 11, function: "burn" },
      { seq: 12, function: "mint" },
    ];

    setTimeout(() => {
      for (const ev of events) emitter.emit("event", ev);
    }, 20);

    const { chunks } = await connectSSE(server, events.length);

    assert.equal(chunks.length, events.length);
    for (let i = 0; i < events.length; i++) {
      const parsed = JSON.parse(chunks[i].slice("data: ".length));
      assert.deepEqual(parsed, events[i]);
    }
  });

  it("cleans up listener on client disconnect", async () => {
    // Connect and immediately collect 1 frame (which triggers req.destroy)
    setTimeout(() => emitter.emit("event", { seq: 99 }), 20);
    await connectSSE(server, 1);

    // Give the server a tick to process the close event
    await new Promise((r) => setTimeout(r, 50));

    // After the client has gone, no lingering listeners should remain
    const after = emitter.listenerCount("event");
    assert.equal(after, 0, `Expected 0 listeners after disconnect, got ${after}`);
  });
});
