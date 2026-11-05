/**
 * Fee model calibrated on real dry quotes (ARCHITECTURE §12): a payout network fee per target chain
 * plus the solver spread. Used for demo quotes when NEAR Intents can't be reached and for the
 * landing page's fee check. Display only: real buys always use a live, signed quote.
 * Roadmap: K7.1
 */

import { targetByAssetId } from "./assets";
import type { AssetId } from "./types";

/** Payout network fee in USD per target chain + solver spread. Calibrated: $10 BTC ≈ 15%, $100 BTC ≈ 1.6%. */
export const NETWORK_FEE_USD: Record<string, number> = { btc: 1.5, eth: 0.2, near: 0.02 };
export const SPREAD_BPS = 25;

/** Modelled cost in bps for buying `usd` of `targetAssetId`, plus an optional fee spike. */
export function modelCostBps(targetAssetId: AssetId, usd: number, spikeBps = 0): number {
  const chain = targetByAssetId(targetAssetId)?.chain ?? "near";
  return Math.ceil(SPREAD_BPS + ((NETWORK_FEE_USD[chain] ?? 0.1) / usd) * 10_000 + spikeBps);
}
