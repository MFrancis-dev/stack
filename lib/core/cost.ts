/**
 * cost_bps = (1 − outUsd/inUsd) × 10_000 from a quote's own USD values.
 * Roadmap: K2.2 · Spec: ARCHITECTURE.md §4.2
 * Status: scaffold — not implemented yet.
 */

import type { QuoteSummary } from "./types";

export function costBps(_quote: QuoteSummary): number {
  throw new Error("Not implemented (K2.2)");
}
