import { describe, expect, it } from "vitest";
import { checkCost, costBps, costSkipNote } from "./cost";

// Roadmap: K2.2 · numbers from real dry quotes on 2026-11-04 (ARCHITECTURE §12)
describe("cost", () => {
  it("computes bps from USD values, rounding up", () => {
    // $100 USDC → BTC
    expect(costBps({ amountInUsd: "99.962900000000", amountOutUsd: "98.358361500000" })).toBe(161);
    // $10 USDC → BTC is mostly fees
    expect(costBps({ amountInUsd: "9.996", amountOutUsd: "8.454" })).toBe(1543);
  });

  it("treats missing or broken USD values as unknown, not zero", () => {
    expect(costBps({ amountInUsd: null, amountOutUsd: "1" })).toBeNull();
    expect(costBps({ amountInUsd: "0", amountOutUsd: "0" })).toBeNull();
    expect(costBps({ amountInUsd: "abc", amountOutUsd: "1" })).toBeNull();
  });

  it("never reports negative cost", () => {
    expect(costBps({ amountInUsd: "10", amountOutUsd: "10.5" })).toBe(0);
  });

  it("explains skips in plain language", () => {
    expect(costSkipNote(435, 300)).toBe("Fees were 4.35%, above your 3.00% limit");
    expect(costSkipNote(null, 300)).toMatch(/didn't include a cost/);
  });

  it("checks against the plan limit", () => {
    expect(checkCost({ amountInUsd: "100", amountOutUsd: "99" }, 300)).toEqual({ ok: true, costBps: 100 });
    expect(checkCost({ amountInUsd: "10", amountOutUsd: "8.454" }, 300)).toEqual({ ok: false, costBps: 1546, reason: "over_limit" });
    expect(checkCost({ amountInUsd: null, amountOutUsd: null }, 300)).toEqual({ ok: false, costBps: null, reason: "unknown_cost" });
  });
});
