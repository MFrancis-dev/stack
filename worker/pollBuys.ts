/**
 * Every 10 s: in-flight buys → 1Click status → final status, actual amount out, destination tx.
 * Refunds go back to the vault (KD-3), so a refunded buy needs no follow-up call.
 * A buy whose deposit 1Click still hasn't seen well after its quote expired is marked `expired`;
 * otherwise it would count as in flight forever and block every later buy of the plan.
 * Roadmap: K5.4, K13.1 · Spec: ARCHITECTURE.md §4.3
 */

import { asBaseUnits } from "../lib/core/money";
import { BUY_TERMINAL, buyStatusFromOneClick } from "../lib/core/status";
import { listInFlightBuys, updateBuy } from "../lib/db/queries/buys";
import { errorMessage, type WorkerDeps } from "./deps";

/** Buy quotes expire after 10 minutes (lib/oneclick/quote.ts buyDeadline); the rest is margin for slow chains. */
export const BUY_EXPIRY_MS = 30 * 60_000;

const EXPIRED_NOTE = "The deposit never reached NEAR Intents before the quote expired, so nothing was bought. Any USDC sent is refunded to the vault.";

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
      const neverDeposited = r.status === "PENDING_DEPOSIT" && deps.now() - b.createdAt.getTime() > BUY_EXPIRY_MS;
      const status = neverDeposited ? "expired" : buyStatusFromOneClick(r.status);
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
        ...(neverDeposited ? { note: EXPIRED_NOTE } : {}),
      });
      deps.log.info("buy status", { quoteRef: b.quoteRef, from: b.status, to: status });
      if (status === "failed") deps.log.alert("buy failed at 1Click", { quoteRef: b.quoteRef, oneclickStatus: r.status });
    } catch (e) {
      deps.log.warn("buy poll failed", { quoteRef: b.quoteRef, error: errorMessage(e) });
    }
  }
}
