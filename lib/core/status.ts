/**
 * Status unions and 1Click → our status mapping for funding and buys.
 * Roadmap: K2.4 · Spec: ARCHITECTURE.md §4.3
 * Status: scaffold — not implemented yet.
 */

/** 1Click /v0/status values. 🔍 Verify the exact enum (K0.11). */
export const ONECLICK_STATUSES = [
  "PENDING_DEPOSIT",
  "KNOWN_DEPOSIT_TX",
  "PROCESSING",
  "SUCCESS",
  "INCOMPLETE_DEPOSIT",
  "REFUNDED",
  "FAILED",
] as const;
export type OneClickStatus = (typeof ONECLICK_STATUSES)[number];

export const FUNDING_STATUSES = [
  "awaiting_deposit",
  "detected",
  "processing",
  "credited",
  "underpaid",
  "refunded",
  "failed",
  "expired",
] as const;
export type FundingStatus = (typeof FUNDING_STATUSES)[number];

export const BUY_STATUSES = [
  "skipped_cost",
  "no_quote",
  "sent",
  "processing",
  "success",
  "refunded",
  "failed",
  "expired",
] as const;
export type BuyStatus = (typeof BUY_STATUSES)[number];

export function fundingStatusFromOneClick(s: OneClickStatus): FundingStatus {
  switch (s) {
    case "PENDING_DEPOSIT":
      return "awaiting_deposit";
    case "KNOWN_DEPOSIT_TX":
      return "detected";
    case "PROCESSING":
      return "processing";
    case "SUCCESS":
      return "credited";
    case "INCOMPLETE_DEPOSIT":
      return "underpaid";
    case "REFUNDED":
      return "refunded";
    case "FAILED":
      return "failed";
  }
}

export function buyStatusFromOneClick(s: OneClickStatus): BuyStatus {
  switch (s) {
    case "PENDING_DEPOSIT":
    case "KNOWN_DEPOSIT_TX":
      return "sent";
    case "PROCESSING":
      return "processing";
    case "SUCCESS":
      return "success";
    case "INCOMPLETE_DEPOSIT":
    case "FAILED":
      return "failed";
    case "REFUNDED":
      return "refunded";
  }
}
