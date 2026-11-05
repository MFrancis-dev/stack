import { describe, expect, it } from "vitest";
import { asBaseUnits } from "../core/money";
import { pauseTx, planTx, recoverTokenTx, withdrawTx, wnearRegisterTx } from "./ownerTx";

// Roadmap: K6.3, K6.4, K6.7 — must match contracts/vault (method names, args, 1-yocto rule)
const V = "vabc.factory.stack.near";

describe("owner transactions", () => {
  it("batches set_plan + resume with 1 yocto each, args in contract shape", () => {
    const tx = planTx(V, { targetAsset: "nep141:btc.omft.near", destinationAddress: "bc1q", amountPerRun: asBaseUnits("100000000"), intervalS: 604800, maxCostBps: 300 });
    expect(tx.receiverId).toBe(V);
    expect(tx.actions.map((a) => [a.params.methodName, a.params.deposit])).toEqual([
      ["set_plan", "1"],
      ["resume", "1"],
    ]);
    expect(tx.actions[0]!.params.args).toEqual({ target_asset: "nep141:btc.omft.near", destination_address: "bc1q", amount_per_run: "100000000", interval_s: 604800, max_cost_bps: 300 });
    expect(tx.actions[0]!.params.gas).toBe("30000000000000");
  });

  it("can save a plan without resuming", () => {
    expect(planTx(V, { targetAsset: "a", destinationAddress: "b", amountPerRun: asBaseUnits("1"), intervalS: 60, maxCostBps: 1 }, { resume: false }).actions).toHaveLength(1);
  });

  it("pauses with no deposit (always the easiest call)", () => {
    expect(pauseTx(V).actions[0]!.params).toMatchObject({ methodName: "pause", deposit: "0" });
  });

  it("registers a NEAR account on wrap.near with exactly the required storage deposit", () => {
    const tx = wnearRegisterTx("alice.near");
    expect(tx.receiverId).toBe("wrap.near");
    expect(tx.actions[0]!.params).toMatchObject({ methodName: "storage_deposit", args: { account_id: "alice.near", registration_only: true }, deposit: "1250000000000000000000" });
  });

  it("withdraws and recovers with 1 yocto", () => {
    expect(withdrawTx(V, asBaseUnits("5")).actions[0]!.params).toMatchObject({ methodName: "withdraw", args: { amount: "5" }, deposit: "1" });
    expect(recoverTokenTx(V, "t.near", asBaseUnits("7")).actions[0]!.params).toMatchObject({ methodName: "recover_token", args: { token: "t.near", amount: "7" }, deposit: "1" });
  });
});
