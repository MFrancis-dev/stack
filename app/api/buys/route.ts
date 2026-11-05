/**
 * GET /api/buys — the signed-in user's buys, including skipped ones with their reason.
 * Roadmap: K4.6 · Spec: ARCHITECTURE.md §4.1
 */

import { listBuysByUser } from "@/lib/db/queries/buys";
import { requireUser } from "@/lib/server/context";
import { handle, json } from "@/lib/server/http";

export const GET = handle(async (req: Request) => {
  const { services, user } = await requireUser(req);
  const rows = await listBuysByUser(services.db, user.id);
  return json({
    buys: rows.map((b) => ({
      id: b.id,
      quoteRef: b.quoteRef,
      status: b.status,
      amountIn: b.amountIn,
      targetAsset: b.targetAsset,
      destinationAddress: b.destinationAddress,
      amountOut: b.amountOut,
      amountInUsd: b.amountInUsd,
      costBps: b.costBps,
      nearTxHash: b.nearTxHash,
      destinationTxHash: b.destinationTxHash,
      note: b.note,
      createdAt: b.createdAt.toISOString(),
      completedAt: b.completedAt?.toISOString() ?? null,
    })),
  });
});
