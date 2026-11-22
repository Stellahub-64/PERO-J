# ABI Schema

This document describes the ABI (Application Binary Interface) schema used to register and describe contracts in the registry. It covers the top-level structure, the `ParamKind` enumeration, and worked examples for every `ParamKind` value.

## Overview

An ABI is a JSON document that describes the callable surface of a contract: its functions, their parameters, return values, and the events it emits. The registry stores this document alongside the contract metadata so that indexers and clients can decode calls and events without out-of-band knowledge.

## Top-level structure

```jsonc
{
  "version": "1.0.0",          // ABI schema version (semver)
  "name": "MyContract",       // Human-readable contract name
  "functions": [ /* Function[] */ ],
  "events": [ /* Event[] */ ],
  "types": [ /* TypeDef[] */ ]  // Optional named type definitions
}
```

### `Function`

```jsonc
{
  "name": "transfer",
  "inputs": [ /* Param[] */ ],
  "outputs": [ /* Param[] */ ],
  "mutability": "nonpayable" // "pure" | "view" | "nonpayable" | "payable"
}
```

### `Event`

```jsonc
{
  "name": "Transfer",
  "inputs": [ /* Param[] */ ],
  "anonymous": false
}
```

### `Param`

Every parameter (function input/output or event input) is described by a `Param` object:

```jsonc
{
  "name": "to",
  "kind": "address",   // a ParamKind value (see below)
  "indexed": false,     // events only; true for indexed topics
  "components": [ /* Param[] */ ] // required for tuple/array-of-tuple kinds
}
```

### `TypeDef`

Named types let you reuse a struct definition across functions and events:

```jsonc
{
  "name": "Order",
  "kind": "tuple",
  "components": [
    { "name": "id", "kind": "uint256" },
    { "name": "maker", "kind": "address" }
  ]
}
```

## `ParamKind` values

`ParamKind` is the canonical set of primitive and composite kinds a parameter may take. The table below lists every value, its meaning, and a JSON example.

| `ParamKind` | Description | Example value |
| --- | --- | --- |
| `bool` | Boolean | `true` |
| `address` | 20-byte account/contract address | `"0x742d35Cc6634C0532925a3b844Bc454e4438f44e"` |
| `string` | UTF-8 string | `"hello"` |
| `bytes` | Dynamically sized byte array | `"0xdeadbeef"` |
| `bytes32` | Fixed 32-byte value | `"0x0000...0000"` |
| `uint8` | Unsigned 8-bit integer | `255` |
| `uint16` | Unsigned 16-bit integer | `65535` |
| `uint32` | Unsigned 32-bit integer | `4294967295` |
| `uint64` | Unsigned 64-bit integer | `18446744073709551615` |
| `uint128` | Unsigned 128-bit integer | `"340282366920938463463374607431768211455"` |
| `uint256` | Unsigned 256-bit integer | `"115792089237316195423570985008687907853269984665640564039457584007913129639935"` |
| `int8` | Signed 8-bit integer | `-128` |
| `int16` | Signed 16-bit integer | `-32768` |
| `int32` | Signed 32-bit integer | `-2147483648` |
| `int64` | Signed 64-bit integer | `"-9223372036854775808"` |
| `int128` | Signed 128-bit integer | `"-170141183460469231731687303715884105728"` |
| `int256` | Signed 256-bit integer | `"-57896044618658097711785492504343953926634992332820282019728792003956564819968"` |
| `array` | Homogeneous array; element kind in `components[0]` | `[1, 2, 3]` |
| `tuple` | Struct; fields in `components` | `{ "id": 1, "maker": "0x..." }` |

> **Note:** Integers wider than 64 bits are encoded as decimal strings to avoid precision loss in JSON consumers.

### Examples per `ParamKind`

#### `bool`

```jsonc
{ "name": "active", "kind": "bool" }
// value: true
```

#### `address`

```jsonc
{ "name": "owner", "kind": "address" }
// value: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
```

#### `string`

```jsonc
{ "name": "symbol", "kind": "string" }
// value: "TKN"
```

#### `bytes`

```jsonc
{ "name": "payload", "kind": "bytes" }
// value: "0xdeadbeef"
```

#### `bytes32`

```jsonc
{ "name": "digest", "kind": "bytes32" }
// value: "0x0000000000000000000000000000000000000000000000000000000000000000"
```

#### `uint8` / `uint16` / `uint32` / `uint64`

```jsonc
{ "name": "decimals", "kind": "uint8" }
// value: 18
```

#### `uint128` / `uint256`

```jsonc
{ "name": "totalSupply", "kind": "uint256" }
// value: "1000000000000000000000000"
```

#### `int8` / `int16` / `int32` / `int64`

```jsonc
{ "name": "delta", "kind": "int64" }
// value: "-42"
```

#### `int128` / `int256`

```jsonc
{ "name": "balance", "kind": "int256" }
// value: "-1000000000000000000"
```

#### `array`

Arrays are described by a single `components` entry that defines the element kind. Nested arrays are expressed by nesting `array` kinds.

```jsonc
{
  "name": "recipients",
  "kind": "array",
  "components": [
    { "name": "", "kind": "address" }
  ]
}
// value: ["0xabc...", "0xdef..."]
```

#### `tuple`

Tuples describe structs. Each field is a `Param` in `components`.

```jsonc
{
  "name": "order",
  "kind": "tuple",
  "components": [
    { "name": "id", "kind": "uint256" },
    { "name": "maker", "kind": "address" },
    { "name": "amount", "kind": "uint128" }
  ]
}
// value: { "id": "1", "maker": "0xabc...", "amount": "1000" }
```

## Full example

```jsonc
{
  "version": "1.0.0",
  "name": "Token",
  "functions": [
    {
      "name": "transfer",
      "inputs": [
        { "name": "to", "kind": "address" },
        { "name": "amount", "kind": "uint256" }
      ],
      "outputs": [ { "name": "ok", "kind": "bool" } ],
      "mutability": "nonpayable"
    }
  ],
  "events": [
    {
      "name": "Transfer",
      "inputs": [
        { "name": "from", "kind": "address", "indexed": true },
        { "name": "to", "kind": "address", "indexed": true },
        { "name": "amount", "kind": "uint256", "indexed": false }
      ],
      "anonymous": false
    }
  ],
  "types": []
}
```

## Validation rules

- `version` MUST be a valid semver string.
- `name` MUST be non-empty and unique within a registry namespace.
- Every `Param.kind` MUST be one of the `ParamKind` values listed above.
- `array` and `tuple` kinds MUST include a non-empty `components` array.
- `indexed` is only meaningful on event inputs; it is ignored elsewhere.
- Integer values wider than 64 bits MUST be encoded as decimal strings.

See [`register-contract.md`](./register-contract.md) for how to submit an ABI during registration and [`rest-api.md`](./rest-api.md) for the endpoints that accept it.
