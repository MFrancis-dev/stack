import { describe, expect, it } from "vitest";
import { isValidAddress, isValidBtcAddress, isValidEvmAddress, isValidNearAccount } from "./address";

// Roadmap: K2.5 · vectors from BIP-173, BIP-350 and EIP-55
describe("address", () => {
  it("accepts valid BTC addresses", () => {
    expect(isValidBtcAddress("BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4")).toBe(true);
    expect(isValidBtcAddress("bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3")).toBe(true);
    expect(isValidBtcAddress("bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0")).toBe(true);
    expect(isValidBtcAddress("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")).toBe(true);
    expect(isValidBtcAddress("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2")).toBe(true);
    expect(isValidBtcAddress("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy")).toBe(true);
  });

  it("rejects BTC typos and wrong encodings", () => {
    expect(isValidBtcAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5")).toBe(false); // bad checksum
    expect(isValidBtcAddress("bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqh2y7hd")).toBe(false); // v1 with bech32
    expect(isValidBtcAddress("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN3")).toBe(false);
    expect(isValidBtcAddress("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx")).toBe(false); // other network prefix
    expect(isValidBtcAddress("bc1QW508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")).toBe(false); // mixed case
  });

  it("checks EIP-55 only when the address is mixed-case", () => {
    expect(isValidEvmAddress("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed")).toBe(true);
    expect(isValidEvmAddress("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed")).toBe(true);
    expect(isValidEvmAddress("0x5aAeb6053f3E94C9b9A09f33669435E7Ef1BeAed")).toBe(false);
    expect(isValidEvmAddress("0x5aaeb6053f3e94c9b9a09f33669435e7ef1bea")).toBe(false);
  });

  it("validates NEAR accounts", () => {
    expect(isValidNearAccount("alice.near")).toBe(true);
    expect(isValidNearAccount("a1-b_2.stack.near")).toBe(true);
    expect(isValidNearAccount("0".repeat(63) + "a")).toBe(true);
    expect(isValidNearAccount("Alice.near")).toBe(false);
    expect(isValidNearAccount("alice..near")).toBe(false);
    expect(isValidNearAccount("a")).toBe(false);
  });

  it("dispatches by chain", () => {
    expect(isValidAddress("btc", "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2")).toBe(true);
    expect(isValidAddress("eth", "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2")).toBe(false);
  });
});
