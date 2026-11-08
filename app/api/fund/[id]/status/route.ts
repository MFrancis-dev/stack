/**
 * GET /api/fund/:id/status — current funding status. Non-final attempts are refreshed from 1Click
 * on read, so the page stays live even without the worker. Roadmap: K4.4 · Spec: ARCHITECTURE.md §4.3
 */

import { FUNDING_TERMINAL, fundingStatusFromOneClick, type FundingStatus } from "@/lib/core/status";
import { getFundingAttempt, updateFundingStatus } from "@/lib/db/queries/fundingAttempts";
import { requireUser } from "@/lib/server/context";
import { handle, HttpError, json, uuidParam } from "@/lib/server/http";

export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const id = uuidParam((await ctx.params).id);
  const { services, user } = await requireUser(req);
  const attempt = await getFundingAttempt(services.db, id, user.id);
  if (!attempt) throw new HttpError(404, "Not found");

  let status = attempt.status as FundingStatus;
  let oneclickStatus = attempt.oneclickStatus;
  if (!FUNDING_TERMINAL.has(status)) {
    const r = await services.status.getStatus(attempt.depositAddress);
    oneclickStatus = r.status;
    status = fundingStatusFromOneClick(r.status);
    if (r.status === "PENDING_DEPOSIT" && attempt.quoteDeadline.getTime() < Date.now()) status = "expired";
    if (status !== attempt.status || oneclickStatus !== attempt.oneclickStatus) {
      await updateFundingStatus(services.db, attempt.id, { status, oneclickStatus });
    }
  }
  return json({
    id: attempt.id,
    status,
    oneclickStatus,
    depositAddress: attempt.depositAddress,
    amountIn: attempt.amountIn,
    expectedOut: attempt.expectedOut,
    deadline: attempt.quoteDeadline.toISOString(),
    depositTxHash: attempt.depositTxHash,
  });
});
