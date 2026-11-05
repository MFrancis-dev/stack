/**
 * Cost of a quote in basis points: (1 − outUsd/inUsd) × 10_000, from the quote's own USD values.
 * Covers slippage, solver spread and payout network fees (ARCHITECTURE.md §4.2).
 * Roadmap: K2.2
 */

import { parseScaled } from "./money";
import type { QuoteSummary } from "./types";

const SCALE = 12;

/** Rounded up (conservative). null when the quote has no usable USD values — treat as unknown, never as free. */
export function costBps(quote: Pick<QuoteSummary, "amountInUsd" | "amountOutUsd">): number | null {
  if (!quote.amountInUsd || !quote.amountOutUsd) return null;
  let inUsd: bigint;
  let outUsd: bigint;
  try {
    inUsd = parseScaled(quote.amountInUsd, SCALE);
    outUsd = parseScaled(quote.amountOutUsd, SCALE);
  } catch {
    return null;
  }
  if (inUsd <= 0n) return null;
  if (outUsd >= inUsd) return 0;
  const lost = (inUsd - outUsd) * 10_000n;
  return Number((lost + inUsd - 1n) / inUsd);
}

/** Plain-language skip reason, e.g. "Fees were 4.35%, above your 3.00% limit". */
export function costSkipNote(costBps: number | null, maxCostBps: number): string {
  const pct = (bps: number) => `${(bps / 100).toFixed(2)}%`;
  return costBps === null
    ? "The price quote didn't include a cost, so it wasn't safe to buy"
    : `Fees were ${pct(costBps)}, above your ${pct(maxCostBps)} limit`;
}

export type CostVerdict = { ok: true; costBps: number } | { ok: false; costBps: number | null; reason: "unknown_cost" | "over_limit" };

export function checkCost(quote: Pick<QuoteSummary, "amountInUsd" | "amountOutUsd">, maxCostBps: number): CostVerdict {
  const bps = costBps(quote);
  if (bps === null) return { ok: false, costBps: null, reason: "unknown_cost" };
  if (bps > maxCostBps) return { ok: false, costBps: bps, reason: "over_limit" };
  return { ok: true, costBps: bps };
}
