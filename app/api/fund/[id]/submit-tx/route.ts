/**
 * POST /api/fund/:id/submit-tx — the user tells us (and 1Click) their deposit tx hash. Optional speed-up.
 * Roadmap: K4.4 · Spec: ARCHITECTURE.md §4.2
 */

import { z } from "zod";
import { getFundingAttempt, updateFundingStatus } from "@/lib/db/queries/fundingAttempts";
import { requireUser } from "@/lib/server/context";
import { handle, HttpError, json, parseBody } from "@/lib/server/http";

const input = z.object({ txHash: z.string().trim().min(8).max(200) });

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { services, user } = await requireUser(req);
  const { txHash } = await parseBody(req, input);
  const attempt = await getFundingAttempt(services.db, id, user.id);
  if (!attempt) throw new HttpError(404, "Not found");
  await services.status.submitDepositTx(attempt.depositAddress, txHash);
  await updateFundingStatus(services.db, attempt.id, { status: attempt.status, depositTxHash: txHash });
  return json({ ok: true });
});
