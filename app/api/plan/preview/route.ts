/**
 * POST /api/plan/preview — dry buy quote for a buy size → expected cost %, so users see that small
 * BTC buys are mostly fees before they commit. Roadmap: K4.5 · Spec: ARCHITECTURE.md §4.2, §12
 */

import { TARGET_ASSETS, USDC_DECIMALS } from "@/lib/core/assets";
import { costBps } from "@/lib/core/cost";
import { asBaseUnits, formatAmount } from "@/lib/core/money";
import { planPreviewInput } from "@/lib/core/schemas";
import type { VaultState } from "@/lib/core/types";
import { requireUser } from "@/lib/server/context";
import { handle, json, parseBody } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rateLimit";

/**
 * Cost doesn't depend on who receives the coins, so previews quote to well-known example addresses
 * (BIP-173 test vector, EIP-55 example). Dry quotes never move funds.
 */
const PREVIEW_RECIPIENT = {
  btc: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
  eth: "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
} as const;

export const POST = handle(async (req: Request) => {
  const { services, user } = await requireUser(req);
  await rateLimit(services.db, `plan-preview:${user.id}`, 30, 60_000);
  const body = await parseBody(req, planPreviewInput);
  const target = TARGET_ASSETS[body.target];
  const amountIn = asBaseUnits(body.amountPerRun);

  const vault: VaultState = {
    owner: user.nearAccountId,
    keeper: "",
    usdc: "",
    targetAsset: target.assetId,
    destinationAddress: body.target === "near" ? user.nearAccountId : PREVIEW_RECIPIENT[body.target],
    amountPerRun: amountIn,
    intervalS: 86_400,
    maxCostBps: 500,
    paused: false,
    lastRunAtS: 0,
    nextRunAtS: null,
  };
  // refundTo must be an existing account (ARCHITECTURE §12): the vault if it exists, else the user's own.
  const quote = await services.quotes.buyQuote(
    { vault, vaultAccountId: user.vaultAccountId ?? user.nearAccountId, amountIn },
    { dry: true },
  );

  const perRunUsd = Number(formatAmount(amountIn, USDC_DECIMALS));
  return json({
    target: body.target,
    amountIn,
    amountOut: quote.amountOut,
    amountOutFormatted: formatAmount(quote.amountOut, target.decimals, 8),
    minAmountOut: quote.minAmountOut,
    costBps: costBps(quote),
    timeEstimateS: quote.timeEstimateS,
    suggestedMinPerRunUsd: target.suggestedMinPerRunUsd,
    belowSuggestedMin: perRunUsd < target.suggestedMinPerRunUsd,
  });
});
