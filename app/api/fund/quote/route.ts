/**
 * POST /api/fund/quote — any token on any chain → USDC into the user's vault.
 * dry: preview only (nothing stored, no deposit address). Real: stores a funding attempt with the
 * verified deposit address. Roadmap: K4.4 · Spec: ARCHITECTURE.md §4.2
 */

import { fundQuoteInput } from "@/lib/core/schemas";
import { asBaseUnits } from "@/lib/core/money";
import { insertFundingAttempt } from "@/lib/db/queries/fundingAttempts";
import { requireVaultOwner } from "@/lib/server/context";
import { clientIp, handle, HttpError, json, parseBody } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rateLimit";

export const POST = handle(async (req: Request) => {
  const { services, user, vaultAccountId } = await requireVaultOwner(req);
  rateLimit(`fund-quote:${user.id}:${clientIp(req)}`, 20, 60_000);
  const body = await parseBody(req, fundQuoteInput);

  const quote = await services.quotes.fundingQuote(
    { originAsset: body.originAsset, amountIn: asBaseUnits(body.amountIn), refundTo: body.refundTo, vault: vaultAccountId },
    { dry: body.dry },
  );
  const preview = {
    amountIn: quote.amountIn,
    amountOut: quote.amountOut,
    minAmountOut: quote.minAmountOut,
    amountInUsd: quote.amountInUsd,
    amountOutUsd: quote.amountOutUsd,
    timeEstimateS: quote.timeEstimateS,
    deadline: quote.deadline,
  };
  if (body.dry) return json({ dry: true, quote: preview });

  if (!quote.depositAddress) throw new HttpError(502, "1Click returned no deposit address");
  const attempt = await insertFundingAttempt(services.db, {
    userId: user.id,
    originAsset: body.originAsset,
    amountIn: quote.amountIn,
    expectedOut: quote.amountOut,
    refundTo: body.refundTo,
    depositAddress: quote.depositAddress,
    quoteDeadline: new Date(quote.deadline),
    quoteSignature: quote.signature,
    quoteRaw: quote.raw as object,
  });
  return json({ dry: false, quote: preview, attempt: { id: attempt.id, depositAddress: attempt.depositAddress, status: attempt.status } }, { status: 201 });
});
