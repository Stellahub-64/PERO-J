import { StrKey } from "@stellar/stellar-sdk";

/**
 * Convert any ScVal XDR object to a native JavaScript value.
 * Uses BigInt for i64/u64/i128/u128 to prevent precision loss.
 *
 * @param {xdr.ScVal} val
 * @returns {*} native JS primitive, object, or array
 */
export function scValToJs(val) {
  if (!val) {
    return null;
  }

  const type = val.switch().name;

  switch (type) {
    case "scvBool":
      return val.b();

    case "scvVoid":
      return null;

    case "scvError":
      return { error: val.error().toString() };

    case "scvU32":
      return val.u32();

    case "scvI32":
      return val.i32();

    case "scvU64":
      return BigInt(val.u64().toString());

    case "scvI64":
      return BigInt(val.i64().toString());

    case "scvTimepoint":
      return BigInt(val.timepoint().toString());

    case "scvDuration":
      return BigInt(val.duration().toString());

    case "scvU128": {
      const u = val.u128();
      const hiB = BigInt.asUintN(64, BigInt(u.hi().toString()));
      const loB = BigInt.asUintN(64, BigInt(u.lo().toString()));
      return BigInt.asUintN(128, (hiB << 64n) | loB);
    }

    case "scvI128": {
      const i = val.i128();
      const hiB = BigInt(i.hi().toString());
      const loB = BigInt.asUintN(64, BigInt(i.lo().toString()));
      return BigInt.asIntN(128, (hiB << 64n) | loB);
    }

    case "scvU256": {
      const u = val.u256();
      const hiHiB = BigInt.asUintN(64, BigInt(u.hiHi().toString()));
      const hiLoB = BigInt.asUintN(64, BigInt(u.hiLo().toString()));
      const loHiB = BigInt.asUintN(64, BigInt(u.loHi().toString()));
      const loLoB = BigInt.asUintN(64, BigInt(u.loLo().toString()));
      return BigInt.asUintN(256, (hiHiB << 192n) | (hiLoB << 128n) | (loHiB << 64n) | loLoB);
    }

    case "scvI256": {
      const i = val.i256();
      const hiHiB = BigInt(i.hiHi().toString());
      const hiLoB = BigInt.asUintN(64, BigInt(i.hiLo().toString()));
      const loHiB = BigInt.asUintN(64, BigInt(i.loHi().toString()));
      const loLoB = BigInt.asUintN(64, BigInt(i.loLo().toString()));
      return BigInt.asIntN(256, (hiHiB << 192n) | (hiLoB << 128n) | (loHiB << 64n) | loLoB);
    }

    case "scvBytes":
      return Buffer.from(val.bytes()).toString("hex");

    case "scvString":
      return val.str().toString();

    case "scvSymbol":
      return val.sym().toString();

    case "scvVec":
      return (val.vec() ?? []).map(scValToJs);

    case "scvMap": {
      const obj = {};
      for (const entry of val.map() ?? []) {
        const k = scValToJs(entry.key());
        obj[String(k)] = scValToJs(entry.val());
      }
      return obj;
    }

    case "scvAddress": {
      const addr = val.address();
      const addrType = addr.switch().name;
      if (addrType === "scAddressTypeAccount") {
        return StrKey.encodeEd25519PublicKey(addr.accountId().ed25519());
      }
      if (addrType === "scAddressTypeContract") {
        return StrKey.encodeContract(addr.contractId());
      }
      return addr.toString();
    }

    case "scvLedgerKeyContractInstance":
      return "";

    case "scvLedgerKeyNonce":
      return `<nonce:${BigInt(val.nonceKey().nonce().toString())}>`;

    case "scvContractInstance":
      return "";

    default:
      return String(val);
  }
}
