import { describe, expect, it } from "vitest";
import { ONECLICK_STATUSES, buyStatusFromOneClick, fundingStatusFromOneClick } from "./status";

// Roadmap: K2.4 · enum verified against SDK 0.1.26 (ARCHITECTURE §12)
describe("status", () => {
  it("covers exactly the 7 1Click statuses", () => {
    expect([...ONECLICK_STATUSES].sort()).toEqual(
      ["FAILED", "INCOMPLETE_DEPOSIT", "KNOWN_DEPOSIT_TX", "PENDING_DEPOSIT", "PROCESSING", "REFUNDED", "SUCCESS"],
    );
  });

  it("maps every 1Click status for funding", () => {
    expect(ONECLICK_STATUSES.map(fundingStatusFromOneClick)).toEqual([
      "awaiting_deposit",
      "detected",
      "processing",
      "credited",
      "underpaid",
      "refunded",
      "failed",
    ]);
  });

  it("maps every 1Click status for buys", () => {
    expect(ONECLICK_STATUSES.map(buyStatusFromOneClick)).toEqual(["sent", "sent", "processing", "success", "failed", "refunded", "failed"]);
  });
});
