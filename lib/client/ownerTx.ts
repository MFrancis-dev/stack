/**
 * Owner transactions to the vault, built for the wallet (near-connect FunctionCall actions).
 * Sensitive methods attach exactly 1 yoctoNEAR (full-access key); pause attaches nothing (I4).
 * Roadmap: K6.3, K6.4, K6.7 · Spec: ARCHITECTURE.md §3.3
 */

import type { BaseUnits } from "../core/types";

export interface FunctionCallAction {
  type: "FunctionCall";
  params: { methodName: string; args: object; gas: string; deposit: string };
}

export interface OwnerTx {
  receiverId: string;
  actions: FunctionCallAction[];
}

const TGAS = 1_000_000_000_000n;
const ONE_YOCTO = "1";

const call = (methodName: string, args: object, tgas: number, deposit = ONE_YOCTO): FunctionCallAction => ({
  type: "FunctionCall",
  params: { methodName, args, gas: (BigInt(tgas) * TGAS).toString(), deposit },
});

export interface PlanArgs {
  targetAsset: string;
  destinationAddress: string;
  amountPerRun: BaseUnits;
  intervalS: number;
  maxCostBps: number;
}

/** set_plan + resume in one transaction, so the user approves once. */
export function planTx(vaultId: string, p: PlanArgs, { resume = true } = {}): OwnerTx {
  const actions = [
    call(
      "set_plan",
      {
        target_asset: p.targetAsset,
        destination_address: p.destinationAddress,
        amount_per_run: p.amountPerRun,
        interval_s: p.intervalS,
        max_cost_bps: p.maxCostBps,
      },
      30,
    ),
  ];
  if (resume) actions.push(call("resume", {}, 10));
  return { receiverId: vaultId, actions };
}

export const pauseTx = (vaultId: string): OwnerTx => ({ receiverId: vaultId, actions: [call("pause", {}, 10, "0")] });
export const resumeTx = (vaultId: string): OwnerTx => ({ receiverId: vaultId, actions: [call("resume", {}, 10)] });

export const withdrawTx = (vaultId: string, amount: BaseUnits): OwnerTx => ({
  receiverId: vaultId,
  actions: [call("withdraw", { amount }, 60)],
});

export const recoverTokenTx = (vaultId: string, token: string, amount: BaseUnits): OwnerTx => ({
  receiverId: vaultId,
  actions: [call("recover_token", { token, amount }, 60)],
});
