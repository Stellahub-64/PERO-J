# REST API Reference

This document describes the REST API exposed by the registry and indexer.

## Base URL

```
http://localhost:8080
```

All request and response bodies are JSON unless otherwise noted.

## Endpoints

### `POST /contracts`

Register a contract and its ABI.

**Request**

```json
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

**Response** `201 Created`

```json
{
  "address": "0x1234567890abcdef1234567890abcdef12345678",
  "registeredAt": "2024-01-01T00:00:00Z"
}
```

### `GET /contracts`

List all registered contracts.

**Response** `200 OK`

```json
[
  {
    "address": "0x1234567890abcdef1234567890abcdef12345678",
    "registeredAt": "2024-01-01T00:00:00Z"
  }
]
```

### `GET /contracts/{address}`

Fetch a single registered contract, including its ABI.

**Response** `200 OK`

```json
{
  "address": "0x1234567890abcdef1234567890abcdef12345678",
  "registeredAt": "2024-01-01T00:00:00Z",
  "abi": [
    {
      "type": "event",
      "name": "Transfer",
      "inputs": [
        { "name": "from", "kind": "address", "indexed": true }
      ]
    }
  ]
}
```

### `DELETE /contracts/{address}`

Remove a contract registration.

**Response** `204 No Content`

### `GET /events`

Query decoded events. Supports optional `address` and `name` filters.

**Request**

```http
GET /events?address=0x1234567890abcdef1234567890abcdef12345678&name=Transfer
```

**Response** `200 OK`

```json
[
  {
    "address": "0x1234567890abcdef1234567890abcdef12345678",
    "name": "Transfer",
    "blockNumber": 123456,
    "args": {
      "from": "0xaaaa...",
      "to": "0xbbbb...",
      "value": "1000000000000000000"
    }
  }
]
```

### `GET /health`

Liveness probe.

**Response** `200 OK`

```json
{ "status": "ok" }
```

## Error Responses

Errors use a consistent shape:

```json
{
  "error": "invalid_abi",
  "message": "Parameter kind 'uint257' is not supported"
}
```

| Status | Meaning                                  |
| ------ | ---------------------------------------- |
| 400    | Invalid request or ABI validation error. |
| 404    | Contract not found.                      |
| 500    | Internal server error.                   |

## See Also

- [Registering a contract](./register-contract.md)
- [ABI schema reference](./abi-schema.md)
