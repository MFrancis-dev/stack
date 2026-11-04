/**
 * GET /api/export.csv — deposits and buys with the USD value of each buy (cost basis for tax, K-E20).
 * Times in UTC. Roadmap: K4.6 · Spec: ARCHITECTURE.md §4.1
 */

import { targetByAssetId, USDC_DECIMALS } from "@/lib/core/assets";
import { toCsv, type CsvValue } from "@/lib/core/csv";
import { formatAmount } from "@/lib/core/money";
import { listBuysByUser } from "@/lib/db/queries/buys";
import { listFundingByUser } from "@/lib/db/queries/fundingAttempts";
import { requireUser } from "@/lib/server/context";
import { handle } from "@/lib/server/http";

const HEADER = [
  "date_utc",
  "type",
  "status",
  "amount_in",
  "asset_in",
  "amount_out",
  "asset_out",
  "usd_value_in",
  "cost_bps",
  "deposit_address",
  "near_tx",
  "destination_tx",
] as const;

export const GET = handle(async (req: Request) => {
  const { services, user } = await requireUser(req);
  const [funding, buys, tokens] = await Promise.all([
    listFundingByUser(services.db, user.id, 1_000),
    listBuysByUser(services.db, user.id, 10_000),
    services.listTokens().catch(() => []),
  ]);
  const decimalsOf = (assetId: string) => tokens.find((t) => t.assetId === assetId)?.decimals;
  const fmt = (amount: string | null, decimals: number | undefined) => (amount && decimals !== undefined ? formatAmount(amount, decimals) : amount);

  const rows: { at: Date; row: CsvValue[] }[] = [
    ...funding.map((f) => ({
      at: f.createdAt,
      row: [f.createdAt.toISOString(), "deposit", f.status, fmt(f.amountIn, decimalsOf(f.originAsset)), f.originAsset, fmt(f.expectedOut, USDC_DECIMALS), "USDC", null, null, f.depositAddress, f.depositTxHash, null],
    })),
    ...buys.map((b) => ({
      at: b.createdAt,
      row: [
        b.createdAt.toISOString(),
        "buy",
        b.status,
        fmt(b.amountIn, USDC_DECIMALS),
        "USDC",
        fmt(b.amountOut, targetByAssetId(b.targetAsset)?.decimals),
        targetByAssetId(b.targetAsset)?.symbol ?? b.targetAsset,
        b.amountInUsd,
        b.costBps,
        b.depositAddress,
        b.nearTxHash,
        b.destinationTxHash,
      ],
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return new Response(toCsv(HEADER, rows.map((r) => r.row)), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="stack-history.csv"',
      "cache-control": "no-store",
    },
  });
});
