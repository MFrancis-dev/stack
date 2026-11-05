"use client";

/**
 * Every buy with its result, reason and proof, plus the CSV export (USD value per buy, for tax).
 * Roadmap: K6.6
 */

import { BuyTable } from "@/components/history/BuyTable";
import { Notice } from "@/components/ui/Notice";
import { useBuys, useVault } from "@/lib/client/hooks";

export default function HistoryPage() {
  const vault = useVault();
  const signedIn = !!(vault.data?.signedIn && vault.data.vaultAccountId);
  const buys = useBuys(signedIn);
  if (!signedIn) return null;
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <h1 className="text-4xl font-bold">History</h1>
          <p className="max-w-2xl text-lg text-sage">Every buy, including the ones that were skipped and why. Skipped buys never spend anything.</p>
        </div>
        <a href="/api/export.csv" className="inline-flex min-h-11 items-center rounded-md px-4 font-bold ring-1 ring-inset ring-mist hover:bg-paper-deep" download>
          Download CSV
        </a>
      </div>
      {buys.isError ? (
        <Notice tone="error">{buys.error.message}</Notice>
      ) : buys.isPending ? (
        <p className="text-sage" role="status">Loading your buys…</p>
      ) : (
        <BuyTable buys={buys.data ?? []} />
      )}
    </div>
  );
}
