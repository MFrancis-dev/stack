/**
 * Health alerts. Low keeper gas would silently stop every scheduled buy, so it is checked on a timer.
 * Roadmap: K5.5 · Spec: ARCHITECTURE.md §4.4
 */

import type { WorkerDeps } from "./deps";

/** 1 NEAR in yocto. Each execute_buy also attaches ~0.013 NEAR for deposit-address storage. */
export const KEEPER_MIN_BALANCE = 10n ** 24n;

export async function checkKeeperBalance(deps: Pick<WorkerDeps, "near" | "keeperAccountId" | "log">, min = KEEPER_MIN_BALANCE): Promise<bigint | null> {
  if (!deps.near || !deps.keeperAccountId) return null;
  const { amount } = await deps.near.viewAccount({ accountId: deps.keeperAccountId });
  const balance = BigInt(amount);
  if (balance < min) deps.log.alert("keeper balance low — top it up or buys will stop", { keeper: deps.keeperAccountId, balanceYocto: balance.toString() });
  return balance;
}
