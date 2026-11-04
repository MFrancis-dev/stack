/**
 * Assets Stack works with (decision KD-6). Ids verified against live /v0/tokens on 2026-11-04
 * (ARCHITECTURE.md §12). Always match on assetId — symbols repeat across chains.
 * Roadmap: K2.x
 */

import type { AssetId } from "./types";

export const USDC_ON_NEAR: AssetId = "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";
export const USDC_DECIMALS = 6;

export type TargetKey = "btc" | "eth" | "near";

export interface TargetAsset {
  key: TargetKey;
  assetId: AssetId;
  symbol: string;
  /** Chain the asset is delivered on; selects the address validator. */
  chain: "btc" | "eth" | "near";
  chainName: string;
  decimals: number;
  /** Below this, fees dominate (BTC $10 ≈ 15% cost). Used as a UI suggestion, not a rule. */
  suggestedMinPerRunUsd: number;
}

export const TARGET_ASSETS: Record<TargetKey, TargetAsset> = {
  btc: {
    key: "btc",
    assetId: "nep141:btc.omft.near",
    symbol: "BTC",
    chain: "btc",
    chainName: "Bitcoin",
    decimals: 8,
    suggestedMinPerRunUsd: 100,
  },
  eth: {
    key: "eth",
    assetId: "nep141:eth.omft.near",
    symbol: "ETH",
    chain: "eth",
    chainName: "Ethereum",
    decimals: 18,
    suggestedMinPerRunUsd: 20,
  },
  near: {
    key: "near",
    assetId: "nep141:wrap.near",
    symbol: "NEAR",
    chain: "near",
    chainName: "NEAR",
    decimals: 24,
    suggestedMinPerRunUsd: 10,
  },
};

export function targetByAssetId(assetId: AssetId): TargetAsset | undefined {
  return Object.values(TARGET_ASSETS).find((t) => t.assetId === assetId);
}
