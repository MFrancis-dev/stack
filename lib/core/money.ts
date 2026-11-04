/**
 * Base-unit conversion and formatting. bigint only — never floats.
 * Roadmap: K2.1 · Spec: AGENTS.md §6
 * Status: scaffold — not implemented yet.
 */

import type { BaseUnits } from "./types";

export function toBaseUnits(_display: string, _decimals: number): BaseUnits {
  throw new Error("Not implemented (K2.1)");
}

export function formatAmount(_amount: BaseUnits, _decimals: number): string {
  throw new Error("Not implemented (K2.1)");
}
