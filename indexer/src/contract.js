import { execSync } from "child_process";

/** @typedef {import('./types.js').DecodedEvent} DecodedEvent */

const CONTRACT_ID = process.env.SOROBAN_EXPLORER_CONTRACT_ID;
const CONTRACT_ADMIN_SECRET = process.env.SOROBAN_EXPLORER_ADMIN_SECRET;
const RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";

/**
 * Submit a decoded event to the on-chain ExplorerContract.
 * This calls submit_event which emits a "decoded" event that the indexer picks up.
 * On success, returns the onchain sequence number assigned by the contract.
 * On failure, logs a warning but does not throw — the indexer loop continues.
 *
 * @param {DecodedEvent} ev - The decoded event to submit
 * @returns {Promise<number|null>} The onchain sequence number, or null if submission failed
 */
export async function submitEvent(ev) {
  if (!CONTRACT_ID || !CONTRACT_ADMIN_SECRET) {
    return null;
  }

  try {
    const result = execSync(
      `soroban contract invoke \
        --id ${CONTRACT_ID} \
        --source ${CONTRACT_ADMIN_SECRET} \
        --rpc-url "${RPC_URL}" \
        --network-passphrase "${NETWORK_PASSPHRASE}" \
        -- \
        submit_event \
        --contract_id ${ev.contract_id} \
        --function ${ev.function} \
        --ledger ${ev.ledger} \
        --description "${escapeShellArg(ev.description)}" \
        --raw_topics '${JSON.stringify(ev.raw_topics)}' \
        --raw_data '${ev.raw_data}'`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();

    // Parse the sequence number from the result
    // The soroban CLI returns the result value directly
    const seq = parseInt(result, 10);
    return Number.isNaN(seq) ? null : seq;
  } catch (err) {
    console.warn(
      `Failed to submit event to on-chain contract for ${ev.contract_id}.${ev.function}: ${err.message}`
    );
    return null;
  }
}

/**
 * Escape a string for safe use in shell commands.
 * @param {string} str
 * @returns {string}
 */
function escapeShellArg(str) {
  return str.replace(/'/g, "'\\''");
}
