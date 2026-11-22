const { formatUnits } = require('ethers/lib/utils');

/**
 * Build a human-readable description for a decoded event.
 *
 * @param {object} event Decoded event with `name` and `args`.
 * @param {object} [contract] Optional contract metadata (e.g. `{ name }`).
 * @returns {string} Human-readable description.
 */
function buildDescription(event, contract) {
  const name = event && event.name;
  const args = (event && event.args) || {};
  const contractName = (contract && contract.name) || 'Contract';

  switch (name) {
    case 'transfer':
      return `Address ${shorten(args.from)} transferred ${args.value} to ${shorten(args.to)}`;

    case 'approve':
      return `Address ${shorten(args.owner)} approved ${shorten(args.spender)} to spend on ${contractName}`;

    default:
      return `${name}(${Object.values(args).join(', ')})`;
  }
}

/**
 * Shorten an address for display purposes.
 *
 * @param {string} address Full address.
 * @returns {string} Shortened address.
 */
function shorten(address) {
  if (!address || typeof address !== 'string') {
    return String(address);
  }
  if (address.length <= 12) {
    return address;
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

module.exports = { buildDescription };
