/**
 * Address validation with real checksums, so a typo can't send savings to the wrong place (K-E10).
 * BTC: bech32 (v0) / bech32m (v1+) and base58check (P2PKH, P2SH). EVM: EIP-55 when mixed-case.
 * NEAR: named and implicit accounts. Roadmap: K2.5
 */

import { sha256 } from "@noble/hashes/sha2.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { bech32, bech32m, createBase58check } from "@scure/base";

export type AddressChain = "btc" | "eth" | "near";

const base58check = createBase58check(sha256);

export function isValidBtcAddress(address: string): boolean {
  const a = address.trim();
  if (/^bc1/i.test(a)) {
    if (a !== a.toLowerCase() && a !== a.toUpperCase()) return false;
    const lower = a.toLowerCase();
    for (const coder of [bech32, bech32m]) {
      try {
        const { prefix, words } = coder.decode(lower as `${string}1${string}`);
        if (prefix !== "bc" || words.length === 0) continue;
        const version = words[0]!;
        const program = coder.fromWords(words.slice(1));
        // BIP-350: v0 uses bech32, v1+ uses bech32m.
        if (version === 0 && coder === bech32 && (program.length === 20 || program.length === 32)) return true;
        if (version >= 1 && version <= 16 && coder === bech32m && program.length >= 2 && program.length <= 40) return true;
      } catch {
        /* try the other encoding */
      }
    }
    return false;
  }
  if (/^[13]/.test(a)) {
    try {
      const payload = base58check.decode(a);
      return payload.length === 21 && (payload[0] === 0x00 || payload[0] === 0x05);
    } catch {
      return false;
    }
  }
  return false;
}

export function isValidEvmAddress(address: string): boolean {
  const a = address.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(a)) return false;
  const hex = a.slice(2);
  if (hex === hex.toLowerCase() || hex === hex.toUpperCase()) return true;
  const hash = keccak_256(new TextEncoder().encode(hex.toLowerCase()));
  for (let i = 0; i < 40; i++) {
    const nibble = (hash[i >> 1]! >> (i % 2 === 0 ? 4 : 0)) & 0xf;
    const ch = hex[i]!;
    if (/[a-f]/.test(ch) && nibble >= 8) return false;
    if (/[A-F]/.test(ch) && nibble < 8) return false;
  }
  return true;
}

const NEAR_NAMED = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export function isValidNearAccount(account: string): boolean {
  const a = account.trim();
  if (a.length < 2 || a.length > 64) return false;
  if (/^[0-9a-f]{64}$/.test(a)) return true; // implicit
  if (/^0x[0-9a-f]{40}$/.test(a)) return true; // eth-implicit
  return NEAR_NAMED.test(a);
}

export function isValidAddress(chain: AddressChain, address: string): boolean {
  switch (chain) {
    case "btc":
      return isValidBtcAddress(address);
    case "eth":
      return isValidEvmAddress(address);
    case "near":
      return isValidNearAccount(address);
  }
}
