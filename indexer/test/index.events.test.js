import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { StrKey, xdr } from "@stellar/stellar-sdk";
import { db } from "../src/db.js";
import { decode, evictContractMeta } from "../src/decoder.js";

const EXPLORER_CONTRACT_ID = StrKey.encodeContract(Buffer.alloc(32, 99));
const TARGET_CONTRACT_ID = StrKey.encodeContract(Buffer.alloc(32, 42));
process.env.SOROBAN_EXPLORER_CONTRACT_ID = EXPLORER_CONTRACT_ID;

const { indexLedger } = await import("../src/index.js");

describe("indexLedger ABI update event handling", () => {
  it("evicts cached contract metadata during the update event's poll cycle", async () => {
    const originalGetContractMeta = db.getContractMeta;
    let metadataName = "Old ABI";
    let metadataReads = 0;
    db.getContractMeta = async (contractId) => {
      assert.equal(contractId, TARGET_CONTRACT_ID);
      metadataReads++;
      return { id: contractId, name: metadataName, functions: [] };
    };
    evictContractMeta(TARGET_CONTRACT_ID);

    try {
      const targetEvent = {
        contractId: TARGET_CONTRACT_ID,
        topic: [xdr.ScVal.scvSymbol("custom_event")],
        value: xdr.ScVal.scvVoid(),
        ledger: 100,
        txHash: "target-event",
      };
      const beforeUpdate = await decode(targetEvent);
      assert.ok(beforeUpdate.description.includes("Old ABI"));
      assert.equal(metadataReads, 1);

      metadataName = "New ABI";
      const updateEvent = {
        contractId: EXPLORER_CONTRACT_ID,
        topic: [
          xdr.ScVal.scvSymbol("update"),
          xdr.ScVal.scvBytes(StrKey.decodeContract(TARGET_CONTRACT_ID)),
        ],
        value: xdr.ScVal.scvString(metadataName),
        ledger: 101,
        txHash: "update-event",
      };
      await indexLedger(101, {
        getEvents: async ({ startLedger }) => {
          assert.equal(startLedger, 101);
          return { events: [updateEvent], latestLedger: 101 };
        },
      });

      const afterUpdate = await decode(targetEvent);
      assert.ok(afterUpdate.description.includes("New ABI"));
      assert.equal(metadataReads, 2, "metadata should be fetched again after one poll cycle");
    } finally {
      db.getContractMeta = originalGetContractMeta;
      evictContractMeta(TARGET_CONTRACT_ID);
    }
  });
});