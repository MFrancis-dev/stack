/**
 * Every 60 s: due vaults → quote → cost check → plan match → execute_buy → submit deposit tx.
 * The contract bounds amount and timing (I2, I3); this loop guards price and recipient.
 * Roadmap: K5.3 · Spec: ARCHITECTURE.md §4.2, §4.4
 */

import { randomUUID } from "node:crypto";
import { BuyOutcomeUnknownError } from "../lib/core/adapters";
import { checkCost, costSkipNote } from "../lib/core/cost";
import { minUnits } from "../lib/core/money";
import { quoteMatchesPlan } from "../lib/core/planMatch";
import type { BaseUnits, QuoteSummary, VaultState } from "../lib/core/types";
import { insertBuy, lastBuyForUser, updateBuy } from "../lib/db/queries/buys";
import { listUsersWithVault } from "../lib/db/queries/users";
import type { User } from "../lib/db/schema";
import { errorMessage, type WorkerDeps } from "./deps";

/** After a skipped or failed attempt, wait this long before trying the same run again. */
export const RETRY_BACKOFF_MS = 15 * 60 * 1000;

export type BuyOutcome = "not_due" | "in_flight" | "backoff" | "empty" | "no_quote" | "skipped_cost" | "refused" | "failed" | "sent" | "unclear";

export async function scheduleBuys(deps: WorkerDeps): Promise<Map<string, BuyOutcome>> {
  const outcomes = new Map<string, BuyOutcome>();
  if (!deps.vault) return outcomes;
  for (const user of await listUsersWithVault(deps.db)) {
    try {
      outcomes.set(user.id, await runForUser(deps, user));
    } catch (e) {
      deps.log.warn("schedule failed", { userId: user.id, error: errorMessage(e) });
    }
  }
  return outcomes;
}

async function runForUser(deps: WorkerDeps, user: User): Promise<BuyOutcome> {
  const vaults = deps.vault!;
  const vaultAccountId = user.vaultAccountId!;
  const state = await vaults.getState(vaultAccountId);
  const now = deps.now();
  if (state.paused || state.nextRunAtS === null || state.nextRunAtS * 1000 > now) return "not_due";

  const last = await lastBuyForUser(deps.db, user.id);
  if (last && (last.status === "sent" || last.status === "processing")) return "in_flight";
  if (last && last.status !== "success" && last.createdAt.getTime() > state.nextRunAtS * 1000 && now - last.createdAt.getTime() < RETRY_BACKOFF_MS) {
    return "backoff";
  }

  const balance = await vaults.usdcBalance(vaultAccountId);
  const amount = minUnits(state.amountPerRun, balance);
  if (BigInt(amount) === 0n) return "empty";

  const record = (status: "no_quote" | "skipped_cost" | "failed", note: string, quote?: QuoteSummary, costBps?: number | null) =>
    insertBuy(deps.db, {
      userId: user.id,
      quoteRef: newQuoteRef(),
      amountIn: amount,
      targetAsset: state.targetAsset!,
      destinationAddress: state.destinationAddress!,
      status,
      note,
      costBps: costBps ?? null,
      amountInUsd: quote?.amountInUsd ?? null,
      quoteRaw: quote ? (quote.raw as object) : null,
      // Same clock as the backoff check below, never the DB's.
      createdAt: new Date(now),
      completedAt: new Date(now),
    });

  let quote: QuoteSummary;
  try {
    quote = await deps.quotes.buyQuote({ vault: state, vaultAccountId, amountIn: amount }, { dry: false });
  } catch (e) {
    await record("no_quote", errorMessage(e));
    deps.log.warn("no quote", { userId: user.id, error: errorMessage(e) });
    return "no_quote";
  }

  const cost = checkCost(quote, state.maxCostBps);
  if (!cost.ok) {
    const note = costSkipNote(cost.costBps, state.maxCostBps);
    await record("skipped_cost", note, quote, cost.costBps);
    deps.log.info("buy skipped for cost", { userId: user.id, costBps: cost.costBps });
    return "skipped_cost";
  }

  const match = quoteMatchesPlan(quote, state, vaultAccountId);
  if (!match.ok) {
    await record("failed", `refused: ${match.reason}`, quote, cost.costBps);
    deps.log.alert("buy quote refused", { userId: user.id, reason: match.reason });
    return "refused";
  }

  return execute(deps, user, state, vaultAccountId, amount, quote, cost.costBps);
}

async function execute(
  deps: WorkerDeps,
  user: User,
  state: VaultState,
  vaultAccountId: string,
  amount: BaseUnits,
  quote: QuoteSummary,
  costBps: number,
): Promise<BuyOutcome> {
  // Record before acting, so an on-chain action is never left without a row.
  const row = await insertBuy(deps.db, {
    userId: user.id,
    quoteRef: newQuoteRef(),
    amountIn: amount,
    targetAsset: state.targetAsset!,
    destinationAddress: state.destinationAddress!,
    costBps,
    amountInUsd: quote.amountInUsd,
    amountOut: quote.amountOut,
    depositAddress: quote.depositAddress,
    quoteSignature: quote.signature,
    quoteRaw: quote.raw as object,
    status: "sent",
    createdAt: new Date(deps.now()),
  });
  try {
    const { txHash } = await deps.vault!.executeBuy({ vaultAccountId, quoteRef: row.quoteRef, depositAddress: quote.depositAddress!, amount });
    await updateBuy(deps.db, row.id, { nearTxHash: txHash });
    deps.log.info("buy sent", { userId: user.id, quoteRef: row.quoteRef, txHash });
    try {
      await deps.status.submitDepositTx(quote.depositAddress!, txHash);
    } catch (e) {
      deps.log.warn("deposit submit failed (1Click will still detect it)", { quoteRef: row.quoteRef, error: errorMessage(e) });
    }
    return "sent";
  } catch (e) {
    if (e instanceof BuyOutcomeUnknownError) {
      // The USDC may already have left. Stay in flight: pollBuys settles it from 1Click's status, and
      // a deposit 1Click never sees expires after BUY_EXPIRY_MS (K13.2).
      await updateBuy(deps.db, row.id, { note: `Waiting for NEAR Intents to confirm: ${errorMessage(e)}` });
      deps.log.alert("execute_buy outcome unclear", { userId: user.id, quoteRef: row.quoteRef, error: errorMessage(e) });
      return "unclear";
    }
    await updateBuy(deps.db, row.id, { status: "failed", note: errorMessage(e), completedAt: new Date(deps.now()) });
    deps.log.alert("execute_buy failed", { userId: user.id, quoteRef: row.quoteRef, error: errorMessage(e) });
    return "failed";
  }
}

function newQuoteRef(): string {
  return `b_${randomUUID()}`;
}

