import { describe, expect, it } from "vitest";
import { fundQuoteInput, planInput } from "./schemas";

// Roadmap: K2.6
const plan = {
  target: "btc",
  destinationAddress: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
  destinationAddressConfirm: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
  amountPerRun: "100000000",
  intervalS: 86_400,
  maxCostBps: 300,
};

describe("schemas", () => {
  it("accepts a valid plan", () => {
    expect(planInput.safeParse(plan).success).toBe(true);
  });

  it("requires the address typed twice", () => {
    const r = planInput.safeParse({ ...plan, destinationAddressConfirm: "bc1qsomethingelse" });
    expect(r.success).toBe(false);
  });

  it("rejects an address with a bad checksum for the chosen chain", () => {
    const bad = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdr";
    expect(planInput.safeParse({ ...plan, destinationAddress: bad, destinationAddressConfirm: bad }).success).toBe(false);
  });

  it("rejects an ETH address for a BTC plan", () => {
    const eth = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
    expect(planInput.safeParse({ ...plan, destinationAddress: eth, destinationAddressConfirm: eth }).success).toBe(false);
  });

  it("enforces the on-chain limits", () => {
    expect(planInput.safeParse({ ...plan, intervalS: 59 }).success).toBe(false);
    expect(planInput.safeParse({ ...plan, maxCostBps: 5_001 }).success).toBe(false);
    expect(planInput.safeParse({ ...plan, amountPerRun: "0" }).success).toBe(false);
  });

  it("validates funding quote bodies", () => {
    expect(fundQuoteInput.safeParse({ originAsset: "nep141:sol.omft.near", amountIn: "1000", refundTo: "x", dry: true }).success).toBe(true);
    expect(fundQuoteInput.safeParse({ originAsset: "x", amountIn: "1.5", refundTo: "x", dry: true }).success).toBe(false);
  });
});
