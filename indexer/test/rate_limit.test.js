import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import pg from "pg";

// Mock pg Pool before importing db / api
pg.Pool.prototype.connect = async () => ({
  query: async () => ({ rows: [], rowCount: 0 }),
  release: () => {},
});
pg.Pool.prototype.query = async () => ({ rows: [], rowCount: 0 });
pg.Pool.prototype.end = async () => {};

const { createApp } = await import("../src/api.js");

describe("Rate limiting probe exemption", () => {
  let server;
  let baseUrl;

  before((_, done) => {
    const app = createApp();
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  after((_, done) => {
    server.close(done);
  });

  it("allows 101 sequential /health requests without hitting rate limit", async () => {
    for (let i = 0; i < 101; i++) {
      const res = await fetch(`${baseUrl}/health`);
      assert.equal(res.status, 200, `Request ${i + 1} to /health should return 200`);
    }
  });

  it("allows 101 sequential /ready requests without hitting rate limit", async () => {
    for (let i = 0; i < 101; i++) {
      const res = await fetch(`${baseUrl}/ready`);
      assert.equal(res.status, 200, `Request ${i + 1} to /ready should return 200`);
    }
  });

  it("applies rate limiter to /api/* routes after max requests", async () => {
    let lastStatus = 200;
    for (let i = 0; i < 105; i++) {
      const res = await fetch(`${baseUrl}/api/functions`);
      lastStatus = res.status;
      if (res.status === 429) {
        break;
      }
    }
    assert.equal(lastStatus, 429, "Expected /api/functions to be rate limited with 429");
  });
});
