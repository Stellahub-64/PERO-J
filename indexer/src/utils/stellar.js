const { StrKey } = require('@stellar/stellar-sdk');

/**
 * Validate a Stellar address.
 * Accepts both Ed25519 public keys (G...) and contract IDs (C...).
 *
 * @param {string} address
 * @returns {boolean}
 */
function isValidStellarAddress(address) {
  if (typeof address !== 'string' || address.length === 0) {
    return false;
  }

  try {
    return StrKey.isValidEd25519PublicKey(address) || StrKey.isValidContract(address);
  } catch (err) {
    return false;
  }
}

module.exports = {
  isValidStellarAddress,
};
