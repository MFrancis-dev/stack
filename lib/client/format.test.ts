import { describe, expect, it } from "vitest";
import { destinationTxUrl, formatTarget, formatUsdc, intervalLabel, untilLabel } from "./format";

// Roadmap: K6.x
describe("format", () => {
  it("formats USDC and target amounts", () => {
    expect(formatUsdc("100000000")).toBe("100");
    expect(formatUsdc("123456789")).toBe("123.45");
    expect(formatUsdc("996700000")).toBe("996.70");
    expect(formatTarget("121000", "nep141:btc.omft.near")).toBe("0.00121 BTC");
    expect(formatTarget(null, "nep141:btc.omft.near")).toBe("—");
  });

  it("describes intervals and countdowns", () => {
    expect(intervalLabel(604_800)).toBe("every week");
    expect(intervalLabel(3 * 86_400)).toBe("every 3 days");
    expect(intervalLabel(7_200)).toBe("every 2 hours");
    expect(untilLabel(1_000, 2_000)).toBe("due now");
    expect(untilLabel(30 * 60_000, 0)).toBe("in 30 min");
    expect(untilLabel(3 * 86_400_000, 0)).toBe("in 3 days");
  });

  it("links destination transactions to the right explorer", () => {
    expect(destinationTxUrl("nep141:btc.omft.near", "abc")).toBe("https://mempool.space/tx/abc");
    expect(destinationTxUrl("nep141:eth.omft.near", "0x1")).toBe("https://etherscan.io/tx/0x1");
    expect(destinationTxUrl("unknown", "x")).toBeNull();
  });
});
