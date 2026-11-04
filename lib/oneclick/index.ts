/**
 * Real QuoteProvider / StatusProvider backed by 1Click. Demo implementations live in demo.ts (K7.1).
 * Roadmap: K3.1
 */

import type { QuoteProvider, StatusProvider } from "../core/adapters";
import { buyDeadline, buyQuoteRequest, fundingDeadline, fundingQuoteRequest, requestQuote } from "./quote";
import { getStatus, submitDepositTx } from "./status";
import { getToken } from "./tokens";

export { configureOneClick, OneClickError } from "./client";
export { getTokens, getToken } from "./tokens";

export const oneClickQuotes: QuoteProvider = {
  async fundingQuote({ originAsset, amountIn, refundTo, vault }, { dry }) {
    const token = await getToken(originAsset);
    const req = fundingQuoteRequest(
      { originAsset, amountIn, refundTo, vaultAccountId: vault, deadline: fundingDeadline(token?.blockchain) },
      dry,
    );
    return requestQuote(req);
  },
  async buyQuote({ vault, vaultAccountId, amountIn }, { dry }) {
    return requestQuote(buyQuoteRequest({ vault, vaultAccountId, amountIn, deadline: buyDeadline() }, dry));
  },
};

export const oneClickStatus: StatusProvider = {
  async getStatus(depositAddress) {
    const { status, raw } = await getStatus(depositAddress);
    return { status, raw };
  },
  submitDepositTx,
};
