/**
 * SAC (Stellar Asset Contract) bridge detection.
 *
 * The SAC contract ID is deterministically derived from a classic asset
 * using the Stellar SDK's Contract.fromAsset() helper.
 */
import { Asset, Contract, Networks } from "@stellar/stellar-sdk";

/**
 * Build a lookup map of SAC contract ID → classic asset code for a list of assets.
 * @param {Array<{code: string, issuer?: string}>} assets
 * @returns {Map<string, string>}  contractId → "USDC" | "XLM" etc.
 */
function buildSacMap(assets) {
  const networkPassphrase = process.env.NETWORK_PASSPHRASE || Networks.TESTNET;
  const map = new Map();
  for (const entry of assets) {
    let code;
    let issuer;
    try {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new TypeError("expected an asset object");
      }
      ({ code, issuer } = entry);
      const asset = code === "native" && !issuer ? Asset.native() : new Asset(code, issuer);
      const contractId = new Contract(asset.contractId(networkPassphrase)).contractId();
      map.set(contractId, issuer ? code : "XLM");
    } catch (err) {
      // Log malformed entries so operators can fix SAC_ASSETS config instead of
      // silently dropping them, which would cause detectSac() misses at runtime.
      console.error(`[sac] skipping malformed SAC entry { code: ${JSON.stringify(code)}, issuer: ${JSON.stringify(issuer)} }:`, err.message);
    }
  }
  console.log(`[sac] registered ${map.size} SAC asset(s)`);
  return map;
}

/**
 * Retrieve current list of assets to include in SAC map.
 * @returns {Array<{code: string, issuer?: string}>}
 */
function getKnownAssets() {
  let customAssets = [];
  if (process.env.SAC_ASSETS) {
    try {
      const parsed = JSON.parse(process.env.SAC_ASSETS);
      if (Array.isArray(parsed)) {
        customAssets = parsed;
      }
    } catch (err) {
      console.error('[sac] SAC_ASSETS is not valid JSON:', err.message);
    }
  }
  return [{ code: "native" }, ...customAssets];
}

let _sacMap = buildSacMap(getKnownAssets());

/**
 * Re-build the SAC lookup map from current environment variables.
 * @returns {Map<string, string>}
 */
export function reloadSacMap() {
  _sacMap = buildSacMap(getKnownAssets());
  return _sacMap;
}

/**
 * Detect whether a contract ID corresponds to a classic Stellar Asset Contract.
 * @param {string} contractId  Strkey-encoded contract address
 * @returns {{ isSac: boolean, assetCode: string|null }}
 */
export function detectSac(contractId) {
  const assetCode = _sacMap.get(contractId) ?? null;
  return { isSac: assetCode !== null, assetCode };
}

/**
 * Given a contract ID and a token symbol string from an event, return the
 * display label: prefers the classic asset code when the contract is a SAC.
 * @param {string} contractId
 * @param {string} [fallback]
 * @returns {string}
 */
export function sacLabel(contractId, fallback = contractId) {
  const { isSac, assetCode } = detectSac(contractId);
  return isSac ? assetCode : fallback;
}
