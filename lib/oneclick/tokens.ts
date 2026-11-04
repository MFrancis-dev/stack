/**
 * /v0/tokens with a 10-minute in-memory cache. Asset ids and decimals always come from here.
 * Roadmap: K3.1 · Spec: ARCHITECTURE.md §4.2
 */

import { OneClickService } from "@defuse-protocol/one-click-sdk-typescript";
import type { Asset } from "../core/types";
import { toOneClickError } from "./client";

export interface TokenInfo extends Asset {
  priceUsd: number | null;
}

const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; tokens: TokenInfo[] } | null = null;

export async function getTokens(now = Date.now()): Promise<TokenInfo[]> {
  if (cache && now - cache.at < TTL_MS) return cache.tokens;
  try {
    const raw = await OneClickService.getTokens();
    const tokens = raw.map((t) => ({
      assetId: t.assetId,
      symbol: t.symbol,
      blockchain: String(t.blockchain),
      decimals: t.decimals,
      priceUsd: Number.isFinite(t.price) ? t.price : null,
    }));
    cache = { at: now, tokens };
    return tokens;
  } catch (e) {
    if (cache) return cache.tokens; // stale beats nothing for a list that changes rarely
    throw toOneClickError(e);
  }
}

export async function getToken(assetId: string): Promise<TokenInfo | undefined> {
  return (await getTokens()).find((t) => t.assetId === assetId);
}

/** For tests. */
export function clearTokenCache(): void {
  cache = null;
}
