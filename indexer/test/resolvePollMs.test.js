import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolvePollMs } from "../src/resolvePollMs.js";

describe("resolvePollMs", () => {
  it("clamps values below 1000 and warns", () => {
    const warnings = [];
    assert.equal(resolvePollMs("50", (m) => warnings.push(m)), 1000);
    assert.equal(resolvePollMs("0", (m) => warnings.push(m)), 5000);
    assert.equal(warnings.length, 1);
  });
  it("keeps valid values without warning", () => {
    const warnings = [];
    assert.equal(resolvePollMs("2500", (m) => warnings.push(m)), 2500);
    assert.equal(resolvePollMs(undefined, (m) => warnings.push(m)), 5000);
    assert.equal(warnings.length, 0);
  });
});
