/**
 * Interfaces swapped between real and demo implementations.
 * Roadmap: K2.6 · Spec: ARCHITECTURE.md §8
 */

import type { OneClickStatus } from "./status";
import type { AssetId, BaseUnits, PlanInput, QuoteSummary, VaultState } from "./types";

export interface QuoteProvider {
  fundingQuote(
    input: { originAsset: AssetId; amountIn: BaseUnits; refundTo: string; vault: string },
    opts: { dry: boolean },
  ): Promise<QuoteSummary>;
  buyQuote(input: { vault: VaultState; vaultAccountId: string; amountIn: BaseUnits }, opts: { dry: boolean }): Promise<QuoteSummary>;
}

export interface StatusProvider {
  getStatus(depositAddress: string): Promise<{ status: OneClickStatus; raw: unknown }>;
  submitDepositTx(depositAddress: string, txHash: string): Promise<void>;
}

/**
 * `executeBuy` sent the transaction but can't tell whether it landed (timeout, network error).
 * The USDC may already have left, so the buy must stay in flight until 1Click's status settles it.
 */
export class BuyOutcomeUnknownError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuyOutcomeUnknownError";
  }
}

export interface VaultClient {
  /** The owner's vault per the factory, if one exists. */
  findVault(owner: string): Promise<string | null>;
  getState(vaultAccountId: string): Promise<VaultState>;
  usdcBalance(vaultAccountId: string): Promise<BaseUnits>;
  createVaultFor(owner: string): Promise<{ vaultAccountId: string; txHash: string }>;
  executeBuy(input: { vaultAccountId: string; quoteRef: string; depositAddress: string; amount: BaseUnits }): Promise<{ txHash: string }>;
}

export type { PlanInput };
