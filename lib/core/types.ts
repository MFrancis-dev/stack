/**
 * Domain types shared by server, worker and UI. Pure — no I/O.
 * Roadmap: K2.x · Spec: ARCHITECTURE.md §3–5
 * Status: scaffold — not implemented yet.
 */

/** Amount in an asset's smallest unit, as a decimal string. Never a float. */
export type BaseUnits = string & { readonly __brand: "BaseUnits" };

/** 1Click asset id. Always resolved from /v0/tokens. */
export type AssetId = string;

export interface Asset {
  assetId: AssetId;
  symbol: string;
  blockchain: string;
  decimals: number;
}

/** Mirror of the vault contract's `get_state` view (contracts/vault/src/lib.rs VaultView). */
export interface VaultState {
  owner: string;
  keeper: string;
  usdc: string;
  targetAsset: AssetId | null;
  destinationAddress: string | null;
  amountPerRun: BaseUnits;
  intervalS: number;
  maxCostBps: number;
  paused: boolean;
  lastRunAtS: number;
  nextRunAtS: number | null;
}

export interface PlanInput {
  targetAsset: AssetId;
  destinationAddress: string;
  amountPerRun: BaseUnits;
  intervalS: number;
  maxCostBps: number;
}

/** What we keep from a verified 1Click quote. */
export interface QuoteSummary {
  dry: boolean;
  depositAddress: string | null;
  amountIn: BaseUnits;
  amountOut: BaseUnits;
  amountInUsd: string | null;
  amountOutUsd: string | null;
  recipient: string;
  destinationAsset: AssetId;
  deadline: string;
  signature: string;
  raw: unknown;
}
