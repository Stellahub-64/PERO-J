# Security Policy

This document describes the security-critical operational procedures for the
PERO-J explorer contract (`contracts/explorer`). It covers the admin transfer
procedure and its required auth envelope, emergency recovery if the admin key is
lost, and management of the indexer allowlist.

## Admin model

The contract stores a single `Admin` address in **persistent** storage under
`DataKey::Admin`. The admin is the only address that may:

- transfer admin rights (`transfer_admin`),
- add or remove indexer allowlist entries (`add_indexer` / `remove_indexer`),
- register and update contract metadata.

Because the admin entry lives in persistent storage it can be archived but never
silently disappears, so an expired instance entry can never make the contract
look uninitialised or re-initialisable.

## Admin transfer procedure

`transfer_admin` moves admin rights from the current admin to a new address. It
requires the **current admin's** authorization; the new admin does not need to
sign.

### Required auth envelope

`transfer_admin` calls `current_admin.require_auth()` on the address currently
stored under `DataKey::Admin`. The invocation must therefore carry a valid
authorization entry for that exact address. For a Soroban invocation this means:

- the transaction's auth entry must be signed by the **current admin** address,
- the auth entry must target this contract and the `transfer_admin` function,
- the signature must be valid for the current ledger (not expired).

If the auth envelope is missing, targets a different address, or is signed by
anyone other than the current admin, the call fails with `Error::Unauthorized`.

### Steps

1. Confirm the new admin address out-of-band (e.g. verify the public key with
the receiving operator).
2. Build the `transfer_admin(new_admin)` invocation and attach an auth envelope
   signed by the **current** admin.
3. Submit the transaction. On success, `DataKey::Admin` is overwritten with
   `new_admin` and the previous admin immediately loses all admin privileges.
4. Verify the transfer by reading the admin address back from storage.

> The transfer is atomic: there is no window in which both addresses hold admin
> rights, and no window in which neither does.

## Emergency recovery (admin key lost)

If the admin key is lost or compromised, the contract cannot be re-initialised —
`init` is guarded by the persistent `Admin` marker and will fail with
`Error::AlreadyExists`. Recovery therefore depends on the situation:

- **Key lost, no backup:** admin rights cannot be recovered through the
  contract. The only path is to deploy a new instance of the contract and
  re-register the contract metadata. Treat the old instance as read-only.
- **Key compromised:** if the attacker has not yet transferred admin, use the
  still-valid key to immediately `transfer_admin` to a freshly generated, secure
  address. Do this before the attacker does.
- **Key lost but a successor was pre-authorised:** if a planned successor address
  was recorded out-of-band, follow the standard transfer procedure using the
  successor's authorization only if that address already holds admin rights;
  otherwise the transfer cannot be authorised.

### Preventive measures

- Store the admin key in a hardware wallet or a managed signer, never in plain
  text or in CI.
- Keep an offline, access-controlled record of the intended successor admin so a
  transfer can be executed quickly if the primary key is compromised.
- Monitor admin-related events so an unexpected `transfer_admin` is detected
  immediately.

## Indexer allowlist management

The allowlist is a `Vec<Address>` stored under `DataKey::IndexerAllowlist`. It
lists trusted indexer addresses permitted to submit events via `submit_event`.
The admin is always permitted to submit regardless of the allowlist.

### Adding an indexer

1. Verify the indexer's public key out-of-band.
2. Call `add_indexer(indexer)` with an auth envelope signed by the **admin**.
3. The address is appended to the allowlist. The call fails with
   `Error::LimitExceeded` if the allowlist already holds `MAX_INDEXERS` (20)
   entries, and with `Error::AlreadyExists` if the address is already listed.

### Removing an indexer

1. Call `remove_indexer(indexer)` with an auth envelope signed by the **admin**.
2. The address is removed from the allowlist and can no longer submit events.
   The call fails with `Error::NotFound` if the address is not listed.

### Operational guidance

- Keep the allowlist as small as possible; every listed address can write to
  on-chain event storage.
- Remove an indexer immediately if its key is suspected to be compromised.
- Rotate indexer keys by adding the replacement before removing the old entry so
  event submission is not interrupted.

## Reporting a vulnerability

Do not open a public issue for security problems. Report them privately to the
maintainers so a fix can be prepared before disclosure.
