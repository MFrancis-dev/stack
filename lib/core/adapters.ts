/**
 * Interfaces swapped between real and demo implementations.
 * Roadmap: K2.6 · Spec: ARCHITECTURE.md §8
 * Status: scaffold — not implemented yet.
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

export interface VaultClient {
  getState(vaultAccountId: string): Promise<VaultState>;
  usdcBalance(vaultAccountId: string): Promise<BaseUnits>;
  createVaultFor(owner: string): Promise<{ vaultAccountId: string; txHash: string }>;
  executeBuy(input: { vaultAccountId: string; quoteRef: string; depositAddress: string; amount: BaseUnits }): Promise<{ txHash: string }>;
}

export type { PlanInput };
