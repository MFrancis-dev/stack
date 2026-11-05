/**
 * GET /api/fund — the signed-in user's recent funding attempts (for "where is my money").
 * Roadmap: K6.5 · Spec: ARCHITECTURE.md §4.1
 */

import { listFundingByUser } from "@/lib/db/queries/fundingAttempts";
import { requireUser } from "@/lib/server/context";
import { handle, json } from "@/lib/server/http";

export const GET = handle(async (req: Request) => {
  const { services, user } = await requireUser(req);
  const rows = await listFundingByUser(services.db, user.id, 20);
  return json({
    attempts: rows.map((f) => ({
      id: f.id,
      status: f.status,
      originAsset: f.originAsset,
      amountIn: f.amountIn,
      expectedOut: f.expectedOut,
      depositAddress: f.depositAddress,
      deadline: f.quoteDeadline.toISOString(),
      createdAt: f.createdAt.toISOString(),
    })),
  });
});
