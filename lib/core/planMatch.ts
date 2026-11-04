/**
 * The last off-chain guard before `execute_buy`: a buy quote must match the vault's on-chain plan.
 * The contract bounds amount and timing; this check protects the recipient and asset (ARCHITECTURE §3.6).
 * Roadmap: K2.3
 */

import { USDC_ON_NEAR } from "./assets";
import type { QuoteSummary, VaultState } from "./types";

export type PlanMatch = { ok: true } | { ok: false; reason: string };

export function quoteMatchesPlan(quote: QuoteSummary, vault: VaultState, vaultAccountId: string): PlanMatch {
  if (vault.paused) return { ok: false, reason: "vault is paused" };
  if (!vault.targetAsset || !vault.destinationAddress) return { ok: false, reason: "vault has no plan" };
  if (quote.dry) return { ok: false, reason: "dry quote cannot be executed" };
  if (!quote.depositAddress) return { ok: false, reason: "quote has no deposit address" };
  if (quote.originAsset !== USDC_ON_NEAR) return { ok: false, reason: "origin asset is not USDC on NEAR" };
  if (quote.destinationAsset !== vault.targetAsset) return { ok: false, reason: "destination asset differs from plan" };
  if (quote.recipient !== vault.destinationAddress) return { ok: false, reason: "recipient differs from plan" };
  if (quote.refundTo !== vaultAccountId) return { ok: false, reason: "refunds must go back to the vault" };
  const amount = BigInt(quote.amountIn);
  if (amount <= 0n) return { ok: false, reason: "amount must be positive" };
  if (amount > BigInt(vault.amountPerRun)) return { ok: false, reason: "amount above amount_per_run" };
  return { ok: true };
}
