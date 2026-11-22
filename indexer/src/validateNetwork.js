export async function validateNetwork(rpc) {
  const expected = process.env.NETWORK_PASSPHRASE;
  if (!expected) {
    return;
  }

  try {
    const network = await rpc.getNetwork();
    if (network.passphrase !== expected) {
      console.error(
        `Network mismatch: expected passphrase "${expected}" but RPC reported "${network.passphrase}"`
      );
      process.exit(1);
    }
  } catch (err) {
    console.error("Failed to validate network passphrase:", err.message);
    process.exit(1);
  }
}
