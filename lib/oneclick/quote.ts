/**
 * Funding and buy quotes (both EXACT_INPUT). Real quotes must pass signature verification before
 * their depositAddress is used; dry previews are display-only. Roadmap: K3.1 · Spec: ARCHITECTURE.md §4.2
 *
 * 🔍 K3.5: with SDK 0.1.26, signatures on today's unauthenticated dry quotes don't verify (the SDK
 * rebuilds the payload from a fixed field list). Real quotes therefore fail closed until K3.5 confirms
 * verification with a partner JWT.
 */

import {
  OneClickService,
  QuoteRequest,
  verifyQuoteSignature,
  type QuoteResponse,
} from "@defuse-protocol/one-click-sdk-typescript";
import { USDC_ON_NEAR } from "../core/assets";
import { asBaseUnits } from "../core/money";
import type { AssetId, BaseUnits, QuoteSummary, VaultState } from "../core/types";
import { OneClickError, toOneClickError } from "./client";

const MINUTE = 60_000;

/** Bitcoin deposits can need ~1 hour of confirmations (1Click docs), so give them longer. */
export function fundingDeadline(originBlockchain: string | undefined, now = Date.now()): string {
  const minutes = originBlockchain === "btc" ? 120 : 30;
  return new Date(now + minutes * MINUTE).toISOString();
}

export function buyDeadline(now = Date.now()): string {
  return new Date(now + 10 * MINUTE).toISOString();
}

export interface FundingQuoteParams {
  originAsset: AssetId;
  amountIn: BaseUnits;
  /** User's own address on the origin chain. Must exist, or 1Click errors. */
  refundTo: string;
  vaultAccountId: string;
  deadline: string;
  slippageBps?: number;
}

export function fundingQuoteRequest(p: FundingQuoteParams, dry: boolean): QuoteRequest {
  return {
    dry,
    swapType: QuoteRequest.swapType.EXACT_INPUT,
    slippageTolerance: p.slippageBps ?? 100,
    originAsset: p.originAsset,
    depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
    destinationAsset: USDC_ON_NEAR,
    amount: p.amountIn,
    recipient: p.vaultAccountId,
    recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
    refundTo: p.refundTo,
    refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
    deadline: p.deadline,
  };
}

export interface BuyQuoteParams {
  vault: VaultState;
  vaultAccountId: string;
  amountIn: BaseUnits;
  deadline: string;
  /** Before a vault exists, previews must refund to an existing account: the owner's. */
  refundTo?: string;
}

export function buyQuoteRequest(p: BuyQuoteParams, dry: boolean): QuoteRequest {
  if (!p.vault.targetAsset || !p.vault.destinationAddress) throw new OneClickError("Vault has no plan", null, null);
  return {
    dry,
    swapType: QuoteRequest.swapType.EXACT_INPUT,
    slippageTolerance: p.vault.maxCostBps,
    originAsset: USDC_ON_NEAR,
    depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
    destinationAsset: p.vault.targetAsset,
    amount: p.amountIn,
    recipient: p.vault.destinationAddress,
    recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
    refundTo: p.refundTo ?? p.vaultAccountId,
    refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
    deadline: p.deadline,
  };
}

export function toQuoteSummary(res: QuoteResponse): QuoteSummary {
  const q = res.quote;
  const r = res.quoteRequest;
  return {
    dry: r.dry,
    originAsset: r.originAsset,
    refundTo: r.refundTo,
    depositAddress: q.depositAddress ?? null,
    amountIn: asBaseUnits(q.amountIn),
    amountOut: asBaseUnits(q.amountOut),
    minAmountOut: q.minAmountOut ? asBaseUnits(q.minAmountOut) : null,
    timeEstimateS: typeof q.timeEstimate === "number" ? q.timeEstimate : null,
    amountInUsd: q.amountInUsd ?? null,
    amountOutUsd: q.amountOutUsd ?? null,
    recipient: r.recipient,
    destinationAsset: r.destinationAsset,
    deadline: q.deadline ?? r.deadline,
    signature: res.signature,
    raw: res,
  };
}

export type SignatureCheck = (res: QuoteResponse) => boolean;

/**
 * Requests a quote. Real quotes are rejected unless the signature verifies — they are the only ones
 * whose depositAddress can receive funds.
 */
export async function requestQuote(req: QuoteRequest, verify: SignatureCheck = verifyQuoteSignature): Promise<QuoteSummary> {
  let res: QuoteResponse;
  try {
    res = await OneClickService.getQuote(req);
  } catch (e) {
    throw toOneClickError(e);
  }
  if (!req.dry && !verify(res)) {
    throw new OneClickError("Quote signature did not verify; refusing to use its deposit address", null, res.correlationId ?? null);
  }
  return toQuoteSummary(res);
}
