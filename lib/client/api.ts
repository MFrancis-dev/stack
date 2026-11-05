/**
 * Typed fetch helpers for the browser. Errors carry the API's own message.
 * Roadmap: K6.x
 */

import type { BuyStatus, FundingStatus } from "../core/status";
import type { VaultState } from "../core/types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? (init?.body === undefined ? "GET" : "POST"),
    headers: init?.body === undefined ? undefined : { "content-type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export interface VaultResponse {
  accountId: string;
  vaultAccountId: string | null;
  /** Demo session: example data, owner actions applied without a wallet. */
  demo?: boolean;
  state?: VaultState;
  usdcBalance?: string;
  usdcBalanceFormatted?: string;
}

export interface TokenDto {
  assetId: string;
  symbol: string;
  blockchain: string;
  decimals: number;
  priceUsd: number | null;
}

export interface QuotePreviewDto {
  amountIn: string;
  amountOut: string;
  minAmountOut: string | null;
  amountInUsd: string | null;
  amountOutUsd: string | null;
  timeEstimateS: number | null;
  deadline: string;
}

export interface FundQuoteResponse {
  dry: boolean;
  quote: QuotePreviewDto;
  attempt?: { id: string; depositAddress: string; status: FundingStatus };
}

export interface FundStatusDto {
  id: string;
  status: FundingStatus;
  depositAddress: string;
  amountIn: string;
  expectedOut: string;
  deadline: string;
  depositTxHash: string | null;
}

export interface PlanPreviewDto {
  target: "btc" | "eth" | "near";
  amountOut: string;
  amountOutFormatted: string;
  costBps: number | null;
  timeEstimateS: number | null;
  suggestedMinPerRunUsd: number;
  belowSuggestedMin: boolean;
}

export interface BuyDto {
  id: string;
  quoteRef: string;
  status: BuyStatus;
  amountIn: string;
  targetAsset: string;
  destinationAddress: string;
  amountOut: string | null;
  amountInUsd: string | null;
  costBps: number | null;
  nearTxHash: string | null;
  destinationTxHash: string | null;
  note: string | null;
  createdAt: string;
  completedAt: string | null;
}
