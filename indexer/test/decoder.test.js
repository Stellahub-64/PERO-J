import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildDescription } from "../src/decoder.js";

const owner = `G${"A".repeat(55)}`;
const spender = `G${"B".repeat(55)}`;
const recipient = `G${"C".repeat(55)}`;

describe("buildDescription", () => {
  it("describes transfer_from with the owner and delegated spender", () => {
    assert.equal(
      buildDescription("transfer_from", [spender, owner, recipient, 100, "USDC"], null, "ContractName"),
      "Address GAAAAA…AAAA (via GBBBBB…BBBB) transferred 100 USDC to GCCCCC…CCCC on ContractName"
    );
  });

  it("describes burn_from with the owner and delegated spender", () => {
    assert.equal(
      buildDescription("burn_from", [spender, owner, 100, "USDC"], null, "ContractName"),
      "100 USDC burned from GAAAAA…AAAA (via GBBBBB…BBBB) on ContractName"
    );
  });
});