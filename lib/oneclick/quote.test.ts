import { ApiError, OneClickService, type QuoteResponse } from "@defuse-protocol/one-click-sdk-typescript";
import { afterEach, describe, expect, it, vi } from "vitest";
import btc100 from "./__fixtures__/dry-quote-usdc-btc-100.json";
import { USDC_ON_NEAR } from "../core/assets";
import { asBaseUnits } from "../core/money";
import type { VaultState } from "../core/types";
import { OneClickError } from "./client";
import { buyDeadline, buyQuoteRequest, fundingDeadline, fundingQuoteRequest, requestQuote, toQuoteSummary } from "./quote";

// Roadmap: K3.1, K3.2 · fixture = real dry quote from 2026-11-04
const fixture = btc100 as unknown as QuoteResponse;
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

afterEach(() => vi.restoreAllMocks());

describe("quote requests", () => {
  it("builds a funding quote: any asset → USDC into the vault, refund to the user's origin address", () => {
    const r = fundingQuoteRequest(
      { originAsset: "nep141:sol.omft.near", amountIn: asBaseUnits("1000000000"), refundTo: "So1Address", vaultAccountId: VAULT_ID, deadline: "d" },
      true,
    );
    expect(r).toMatchObject({ dry: true, swapType: "EXACT_INPUT", destinationAsset: USDC_ON_NEAR, recipient: VAULT_ID, refundTo: "So1Address", recipientType: "DESTINATION_CHAIN" });
  });

  it("builds a buy quote from the on-chain plan with refunds to the vault", () => {
    const r = buyQuoteRequest({ vault, vaultAccountId: VAULT_ID, amountIn: asBaseUnits("100000000"), deadline: "d" }, false);
    expect(r).toMatchObject({
      dry: false,
      originAsset: USDC_ON_NEAR,
      destinationAsset: vault.targetAsset,
      recipient: vault.destinationAddress,
      refundTo: VAULT_ID,
      slippageTolerance: 300,
    });
  });

  it("refuses a buy quote without a plan", () => {
    expect(() => buyQuoteRequest({ vault: { ...vault, targetAsset: null }, vaultAccountId: VAULT_ID, amountIn: asBaseUnits("1"), deadline: "d" }, true)).toThrow(OneClickError);
  });

  it("gives Bitcoin deposits a longer deadline", () => {
    const now = Date.parse("2026-11-04T00:00:00Z");
    expect(fundingDeadline("btc", now)).toBe("2026-11-04T02:00:00.000Z");
    expect(fundingDeadline("sol", now)).toBe("2026-11-04T00:30:00.000Z");
    expect(buyDeadline(now)).toBe("2026-11-04T00:10:00.000Z");
  });
});

describe("toQuoteSummary", () => {
  it("maps a real dry quote", () => {
    const s = toQuoteSummary(fixture);
    expect(s).toMatchObject({
      dry: true,
      originAsset: USDC_ON_NEAR,
      depositAddress: null,
      amountIn: "100000000",
      destinationAsset: "nep141:btc.omft.near",
      timeEstimateS: 465,
    });
    expect(s.amountInUsd).toBeTruthy();
    expect(s.signature.startsWith("ed25519:")).toBe(true);
  });
});

describe("requestQuote", () => {
  it("returns dry previews without requiring a verified signature", async () => {
    vi.spyOn(OneClickService, "getQuote").mockResolvedValue(fixture as never);
    const s = await requestQuote({ ...fixture.quoteRequest, dry: true }, () => false);
    expect(s.dry).toBe(true);
  });

  it("refuses a real quote whose signature does not verify", async () => {
    const real = { ...fixture, quoteRequest: { ...fixture.quoteRequest, dry: false }, quote: { ...fixture.quote, depositAddress: "abc" } };
    vi.spyOn(OneClickService, "getQuote").mockResolvedValue(real as never);
    await expect(requestQuote(real.quoteRequest, () => false)).rejects.toThrow(/signature did not verify/);
  });

  it("accepts a real quote whose signature verifies", async () => {
    const real = { ...fixture, quoteRequest: { ...fixture.quoteRequest, dry: false }, quote: { ...fixture.quote, depositAddress: "abc" } };
    vi.spyOn(OneClickService, "getQuote").mockResolvedValue(real as never);
    expect((await requestQuote(real.quoteRequest, () => true)).depositAddress).toBe("abc");
  });

  it("turns 1Click's misleading errors into readable ones", async () => {
    const err = new ApiError(
      { method: "POST", url: "/v0/quote" },
      { url: "/v0/quote", ok: false, status: 400, statusText: "Bad Request", body: { message: "Internal server error", correlationId: "c1" } },
      "Bad Request",
    );
    vi.spyOn(OneClickService, "getQuote").mockRejectedValue(err);
    await expect(requestQuote({ ...fixture.quoteRequest })).rejects.toThrow(/refund account exists/);
  });
});
