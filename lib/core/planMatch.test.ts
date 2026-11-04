import { describe, expect, it } from "vitest";
import { USDC_ON_NEAR } from "./assets";
import { asBaseUnits } from "./money";
import { quoteMatchesPlan } from "./planMatch";
import type { QuoteSummary, VaultState } from "./types";

// Roadmap: K2.3
const VAULT_ID = "v0123456789abcdef.factory.stack.near";

const vault: VaultState = {
  owner: "alice.near",
  keeper: "keeper.stack.near",
  usdc: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
  targetAsset: "nep141:btc.omft.near",
  destinationAddress: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
  amountPerRun: asBaseUnits("100000000"),
  intervalS: 86_400,
  maxCostBps: 300,
  paused: false,
  lastRunAtS: 0,
  nextRunAtS: 86_400,
};

const quote: QuoteSummary = {
  dry: false,
  originAsset: USDC_ON_NEAR,
  refundTo: VAULT_ID,
  depositAddress: "0000000000000000000000000000000000000000000000000000000000000abc",
  amountIn: asBaseUnits("100000000"),
  amountOut: asBaseUnits("121000"),
  minAmountOut: asBaseUnits("119000"),
  timeEstimateS: 465,
  amountInUsd: "99.96",
  amountOutUsd: "98.35",
  recipient: vault.destinationAddress!,
  destinationAsset: vault.targetAsset!,
  deadline: "2026-11-04T19:00:00.000Z",
  signature: "ed25519:sig",
  raw: {},
};

describe("planMatch", () => {
  it("accepts a matching quote", () => {
    expect(quoteMatchesPlan(quote, vault, VAULT_ID)).toEqual({ ok: true });
  });

  it.each([
    ["wrong recipient", { recipient: "bc1qattacker" }, "recipient differs from plan"],
    ["wrong asset", { destinationAsset: "nep141:eth.omft.near" }, "destination asset differs from plan"],
    ["amount above amount_per_run", { amountIn: asBaseUnits("100000001") }, "amount above amount_per_run"],
    ["refund not to the vault", { refundTo: "attacker.near" }, "refunds must go back to the vault"],
    ["wrong origin", { originAsset: "nep141:usdt.tether-token.near" }, "origin asset is not USDC on NEAR"],
    ["dry quote", { dry: true }, "dry quote cannot be executed"],
    ["no deposit address", { depositAddress: null }, "quote has no deposit address"],
  ])("rejects %s", (_name, patch, reason) => {
    expect(quoteMatchesPlan({ ...quote, ...(patch as Partial<QuoteSummary>) }, vault, VAULT_ID)).toEqual({ ok: false, reason });
  });

  it("rejects when the vault is paused or has no plan", () => {
    expect(quoteMatchesPlan(quote, { ...vault, paused: true }, VAULT_ID)).toEqual({ ok: false, reason: "vault is paused" });
    expect(quoteMatchesPlan(quote, { ...vault, targetAsset: null }, VAULT_ID)).toEqual({ ok: false, reason: "vault has no plan" });
  });
});
