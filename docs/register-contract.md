# Registering a Contract

This guide explains how to register a smart contract with the ABI registry so that
its events and functions can be indexed and queried through the REST API.

## Overview

Registration associates a deployed contract address with its ABI definition. Once
registered, the indexer decodes events emitted by the contract and exposes them
through the REST API.

Registration is a two-step process:

1. Submit the contract address together with its ABI.
2. The registry validates the ABI against the [ABI schema](./abi-schema.md) and
   stores it, keyed by contract address.

## Prerequisites

- A deployed contract address.
- The contract ABI as a JSON array of entries (see [abi-schema.md](./abi-schema.md)).
- Access to the registry REST API (see [rest-api.md](./rest-api.md)).

## Registering via the REST API

Send a `POST` request to `/contracts` with the contract address and ABI:

```http
POST /contracts
Content-Type: application/json

{
  "address": "0x1234567890abcdef1234567890abcdef12345678",
  "abi": [
    {
      "type": "event",
      "name": "Transfer",
      "inputs": [
        { "name": "from", "kind": "address", "indexed": true },
        { "name": "to", "kind": "address", "indexed": true },
        { "name": "value", "kind": "uint256", "indexed": false }
      ]
    }
  ]
}
```

A successful registration returns `201 Created`:

```json
{
  "address": "0x1234567890abcdef1234567890abcdef12345678",
  "registeredAt": "2024-01-01T00:00:00Z"
}
```

If the ABI fails validation, the API returns `400 Bad Request` with a description
of the offending entry.

## Registering via the CLI

If you use the bundled CLI, registration can be performed with:

```bash
register-contract \
  --address 0x1234567890abcdef1234567890abcdef12345678 \
  --abi ./abi/MyContract.json
```

The CLI reads the ABI file, validates it, and submits it to the registry using the
same endpoint described above.

## Updating a Registration

Re-submitting the same address replaces the stored ABI. This is useful when a
contract is upgraded and emits new events. The registry invalidates any cached
decoded data for that address on update.

## Validation Rules

- `address` must be a non-empty hex string.
- `abi` must be a JSON array of entries.
- Each entry must conform to the [ABI schema](./abi-schema.md).
- Event and function names must be unique within the ABI.

## Next Steps

- [ABI schema reference](./abi-schema.md)
- [REST API reference](./rest-api.md)
