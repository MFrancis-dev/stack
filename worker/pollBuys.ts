/**
 * Every 10 s: in-flight buys → 1Click status → final status, actual amount out, destination tx.
 * Refunds go back to the vault (KD-3), so a refunded buy needs no follow-up call.
 * Roadmap: K5.4 · Spec: ARCHITECTURE.md §4.3
 */

import { asBaseUnits } from "../lib/core/money";
import { BUY_TERMINAL, buyStatusFromOneClick } from "../lib/core/status";
import { listInFlightBuys, updateBuy } from "../lib/db/queries/buys";
import { errorMessage, type WorkerDeps } from "./deps";

interface SwapDetailsLike {
  amountOut?: string;
  destinationChainTxHashes?: { hash?: string }[];
  refundReason?: string;
}

export async function pollBuys(deps: Pick<WorkerDeps, "db" | "status" | "now" | "log">): Promise<void> {
  for (const b of await listInFlightBuys(deps.db)) {
    if (!b.depositAddress) continue;
    try {
      const r = await deps.status.getStatus(b.depositAddress);
      const status = buyStatusFromOneClick(r.status);
      if (status === b.status && r.status === b.oneclickStatus) continue;
      const details = ((r.raw as { swapDetails?: SwapDetailsLike } | undefined)?.swapDetails ?? {}) as SwapDetailsLike;
      const final = BUY_TERMINAL.has(status);
      await updateBuy(deps.db, b.id, {
        status,
        oneclickStatus: r.status,
        ...(final ? { completedAt: new Date(deps.now()) } : {}),
        ...(status === "success" && details.amountOut && /^\d+$/.test(details.amountOut) ? { amountOut: asBaseUnits(details.amountOut) } : {}),
        ...(details.destinationChainTxHashes?.[0]?.hash ? { destinationTxHash: details.destinationChainTxHashes[0].hash } : {}),
        ...(status === "refunded" ? { note: `refunded to the vault${details.refundReason ? `: ${details.refundReason}` : ""}` } : {}),
      });
      deps.log.info("buy status", { quoteRef: b.quoteRef, from: b.status, to: status });
      if (status === "failed") deps.log.alert("buy failed at 1Click", { quoteRef: b.quoteRef, oneclickStatus: r.status });
    } catch (e) {
      deps.log.warn("buy poll failed", { quoteRef: b.quoteRef, error: errorMessage(e) });
    }
  }
}
