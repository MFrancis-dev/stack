import { OneClickService } from "@defuse-protocol/one-click-sdk-typescript";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ONECLICK_STATUSES } from "../core/status";
import { getStatus, submitDepositTx } from "./status";
import { clearTokenCache, getTokens } from "./tokens";

// Roadmap: K3.1, K3.2
afterEach(() => vi.restoreAllMocks());

const statusFixture = (status: string) => ({ correlationId: "c", status, updatedAt: "2026-11-04T00:00:00Z", quoteResponse: {}, swapDetails: {} });

describe("status", () => {
  it.each(ONECLICK_STATUSES)("passes through %s", async (s) => {
    vi.spyOn(OneClickService, "getExecutionStatus").mockResolvedValue(statusFixture(s) as never);
    expect((await getStatus("addr")).status).toBe(s);
  });

  it("rejects a status we don't know instead of guessing", async () => {
    vi.spyOn(OneClickService, "getExecutionStatus").mockResolvedValue(statusFixture("SOMETHING_NEW") as never);
    await expect(getStatus("addr")).rejects.toThrow(/Unknown 1Click status/);
  });

  it("submits deposit tx hashes", async () => {
    const spy = vi.spyOn(OneClickService, "submitDepositTx").mockResolvedValue({} as never);
    await submitDepositTx("addr", "hash");
    expect(spy).toHaveBeenCalledWith({ depositAddress: "addr", txHash: "hash" });
  });
});

describe("tokens", () => {
  it("caches the list for 10 minutes and serves stale data if 1Click is down", async () => {
    clearTokenCache();
    const spy = vi
      .spyOn(OneClickService, "getTokens")
      .mockResolvedValue([{ assetId: "nep141:btc.omft.near", symbol: "BTC", blockchain: "btc", decimals: 8, price: 80588, priceUpdatedAt: "" }] as never);
    const t0 = 1_000_000;
    expect((await getTokens(t0))[0]?.decimals).toBe(8);
    await getTokens(t0 + 5 * 60_000);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRejectedValue(new Error("down"));
    expect((await getTokens(t0 + 11 * 60_000))[0]?.symbol).toBe("BTC");
  });
});
