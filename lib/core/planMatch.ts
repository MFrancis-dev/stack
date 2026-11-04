/**
 * Rejects a buy quote whose recipient/asset/amount don't match the on-chain plan.
 * Roadmap: K2.3 · Spec: ARCHITECTURE.md §3.6
 * Status: scaffold — not implemented yet.
 */

import type { QuoteSummary, VaultState } from "./types";

export function quoteMatchesPlan(_quote: QuoteSummary, _vault: VaultState): { ok: true } | { ok: false; reason: string } {
  throw new Error("Not implemented (K2.3)");
}
