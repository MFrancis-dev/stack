/**
 * Demo-mode QuoteProvider / StatusProvider. Dry quotes try live 1Click first (real prices, no funds) and
 * fall back to a fee model calibrated on real quotes (ARCHITECTURE §12) when offline. "Real" demo quotes
 * get a fake `demo-…` deposit address whose status advances with time. Nothing here can move funds.
 * Roadmap: K7.1, K7.3
 */

import type { QuoteProvider, StatusProvider } from "../core/adapters";
import { USDC_DECIMALS, USDC_ON_NEAR } from "../core/assets";
import { modelCostBps } from "../core/feeModel";
export { modelCostBps, NETWORK_FEE_USD, SPREAD_BPS } from "../core/feeModel";
import { asBaseUnits } from "../core/money";
import type { OneClickStatus } from "../core/status";
import type { AssetId, BaseUnits, QuoteSummary } from "../core/types";
import { oneClickQuotes } from "./index";
import { getTokens, type TokenInfo } from "./tokens";

/** An existing NEAR account to stand in as refund/recipient for live dry quotes (dry quotes never move funds). */
const LIVE_STAND_IN_ACCOUNT = "near";
const LIVE_TIMEOUT_MS = 5_000;

/** Used when /v0/tokens can't be reached. Prices are rough, for the demo model only. */
export const FALLBACK_TOKENS: TokenInfo[] = [
  { assetId: USDC_ON_NEAR, symbol: "USDC", blockchain: "near", decimals: 6, priceUsd: 1 },
  { assetId: "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near", symbol: "USDC", blockchain: "base", decimals: 6, priceUsd: 1 },
  { assetId: "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near", symbol: "USDC", blockchain: "arb", decimals: 6, priceUsd: 1 },
  { assetId: "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near", symbol: "USDC", blockchain: "sol", decimals: 6, priceUsd: 1 },
  { assetId: "nep141:eth-0xdac17f958d2ee523a2206206994597c13d831ec7.omft.near", symbol: "USDT", blockchain: "eth", decimals: 6, priceUsd: 1 },
  { assetId: "nep141:sol.omft.near", symbol: "SOL", blockchain: "sol", decimals: 9, priceUsd: 95 },
  { assetId: "nep141:eth.omft.near", symbol: "ETH", blockchain: "eth", decimals: 18, priceUsd: 2_400 },
  { assetId: "nep141:btc.omft.near", symbol: "BTC", blockchain: "btc", decimals: 8, priceUsd: 80_000 },
  { assetId: "nep141:wrap.near", symbol: "wNEAR", blockchain: "near", decimals: 24, priceUsd: 4.1 },
];

async function tokens(): Promise<TokenInfo[]> {
  try {
    return await getTokens();
  } catch {
    return FALLBACK_TOKENS;
  }
}

async function tokenInfo(assetId: AssetId): Promise<TokenInfo | undefined> {
  return (await tokens()).find((t) => t.assetId === assetId) ?? FALLBACK_TOKENS.find((t) => t.assetId === assetId);
}

/** Display-model math only; on-chain amounts never come from here. */
export function toBase(amount: number, decimals: number): BaseUnits {
  if (!(amount > 0)) return asBaseUnits("0");
  const precise = Math.min(decimals, 8);
  const scaled = BigInt(Math.floor(amount * 10 ** precise));
  return asBaseUnits((scaled * 10n ** BigInt(decimals - precise)).toString());
}

export function fromBase(amount: string, decimals: number): number {
  return Number(BigInt(amount)) / 10 ** decimals;
}

export const demoDepositAddress = (now = Date.now()) => `demo-${now}-${Math.random().toString(36).slice(2, 8)}`;

async function modelQuote(p: {
  dry: boolean;
  originAsset: AssetId;
  destinationAsset: AssetId;
  amountIn: BaseUnits;
  recipient: string;
  refundTo: string;
  costBps: (usd: number) => number;
}): Promise<QuoteSummary> {
  const [inTok, outTok] = await Promise.all([tokenInfo(p.originAsset), tokenInfo(p.destinationAsset)]);
  const inDec = inTok?.decimals ?? USDC_DECIMALS;
  const outDec = outTok?.decimals ?? USDC_DECIMALS;
  const inUsd = fromBase(p.amountIn, inDec) * (inTok?.priceUsd ?? 1);
  const outUsd = inUsd * (1 - p.costBps(inUsd) / 10_000);
  const amountOut = toBase(outUsd / (outTok?.priceUsd ?? 1), outDec);
  return {
    dry: p.dry,
    originAsset: p.originAsset,
    refundTo: p.refundTo,
    depositAddress: p.dry ? null : demoDepositAddress(),
    amountIn: p.amountIn,
    amountOut,
    minAmountOut: asBaseUnits(((BigInt(amountOut) * 99n) / 100n).toString()),
    timeEstimateS: p.destinationAsset === "nep141:btc.omft.near" ? 465 : 30,
    amountInUsd: inUsd.toFixed(4),
    amountOutUsd: outUsd.toFixed(4),
    recipient: p.recipient,
    destinationAsset: p.destinationAsset,
    deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
    signature: "demo",
    raw: { demo: true },
  };
}

async function tryLive<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await Promise.race([fn(), new Promise<null>((r) => setTimeout(() => r(null), LIVE_TIMEOUT_MS))]);
  } catch {
    return null;
  }
}

export const demoQuotes: QuoteProvider = {
  async fundingQuote(input, { dry }) {
    if (dry) {
      const live = await tryLive(() => oneClickQuotes.fundingQuote({ ...input, vault: LIVE_STAND_IN_ACCOUNT }, { dry: true }));
      if (live) return { ...live, recipient: input.vault };
    }
    return modelQuote({
      dry,
      originAsset: input.originAsset,
      destinationAsset: USDC_ON_NEAR,
      amountIn: input.amountIn,
      recipient: input.vault,
      refundTo: input.refundTo,
      costBps: () => 30,
    });
  },
  async buyQuote({ vault, vaultAccountId, amountIn }, { dry }) {
    if (dry) {
      const live = await tryLive(() => oneClickQuotes.buyQuote({ vault, vaultAccountId: LIVE_STAND_IN_ACCOUNT, amountIn }, { dry: true }));
      if (live) return { ...live, refundTo: vaultAccountId };
    }
    return modelQuote({
      dry,
      originAsset: USDC_ON_NEAR,
      destinationAsset: vault.targetAsset!,
      amountIn,
      recipient: vault.destinationAddress!,
      refundTo: vaultAccountId,
      costBps: (usd) => modelCostBps(vault.targetAsset!, usd),
    });
  },
};

/** Demo deposits advance on their own: waiting → seen → converting → done, ~20 s per step. */
export function demoStatusAt(depositAddress: string, now = Date.now()): OneClickStatus {
  const created = Number(depositAddress.split("-")[1]);
  if (!Number.isFinite(created)) return "FAILED";
  const s = (now - created) / 1000;
  if (s < 20) return "PENDING_DEPOSIT";
  if (s < 40) return "KNOWN_DEPOSIT_TX";
  if (s < 60) return "PROCESSING";
  return "SUCCESS";
}

export const demoStatus: StatusProvider = {
  async getStatus(depositAddress) {
    return { status: demoStatusAt(depositAddress), raw: { demo: true } };
  },
  async submitDepositTx() {
    /* nothing to tell anyone in demo mode */
  },
};

export async function tokensWithFallback(): Promise<{ tokens: TokenInfo[]; offline: boolean }> {
  try {
    return { tokens: await getTokens(), offline: false };
  } catch {
    return { tokens: FALLBACK_TOKENS, offline: true };
  }
}
