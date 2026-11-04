/**
 * /v0/status polling and /v0/deposit/submit. Roadmap: K3.1 · Spec: ARCHITECTURE.md §4.3
 */

import { OneClickService } from "@defuse-protocol/one-click-sdk-typescript";
import { ONECLICK_STATUSES, type OneClickStatus } from "../core/status";
import { OneClickError, toOneClickError } from "./client";

export interface StatusResult {
  status: OneClickStatus;
  updatedAt: string | null;
  raw: unknown;
}

export async function getStatus(depositAddress: string): Promise<StatusResult> {
  let res: Awaited<ReturnType<typeof OneClickService.getExecutionStatus>>;
  try {
    res = await OneClickService.getExecutionStatus(depositAddress);
  } catch (e) {
    throw toOneClickError(e);
  }
  const status = String(res.status);
  if (!(ONECLICK_STATUSES as readonly string[]).includes(status)) {
    throw new OneClickError(`Unknown 1Click status "${status}"`, null, res.correlationId ?? null);
  }
  return { status: status as OneClickStatus, updatedAt: res.updatedAt ?? null, raw: res };
}

/** Optional speed-up: tells 1Click about the deposit transaction. */
export async function submitDepositTx(depositAddress: string, txHash: string): Promise<void> {
  try {
    await OneClickService.submitDepositTx({ depositAddress, txHash });
  } catch (e) {
    throw toOneClickError(e);
  }
}
