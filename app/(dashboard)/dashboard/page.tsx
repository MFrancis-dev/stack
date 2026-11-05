"use client";

/**
 * Overview: your stack (the one memorable element), dollars ready, the plan, what's moving.
 * Roadmap: K6.5
 */

import { BalanceCard } from "@/components/vault/BalanceCard";
import { NextBuy } from "@/components/vault/NextBuy";
import { StackColumn, type StackBar } from "@/components/vault/StackColumn";
import { WhereIsMyMoney } from "@/components/vault/WhereIsMyMoney";
import { useBuys, useVault } from "@/lib/client/hooks";
import { formatTarget, formatUsdc } from "@/lib/client/format";
import { targetByAssetId } from "@/lib/core/assets";
import { formatAmount } from "@/lib/core/money";

export default function Dashboard() {
  const vault = useVault();
  const v = vault.data?.signedIn ? vault.data : null;
  const buys = useBuys(!!v?.vaultAccountId);
  if (!v?.state || !v.usdcBalance) return null;

  // Until the buy list arrives, say so: an empty list would read as "no buys yet" (slow on a cold hosted DB).
  if (buys.isPending) return <p className="text-sage" role="status">Loading your stack…</p>;
  const list = buys.data ?? [];
  const recent = list.slice(0, 30);
  const bars: StackBar[] = recent.map((b) => ({
    key: b.id,
    weight: Number(b.amountIn),
    state: b.status === "success" ? "done" : b.status === "sent" || b.status === "processing" ? "pending" : "skipped",
    label: `${new Date(b.createdAt).toLocaleDateString()}: ${b.status === "success" ? formatTarget(b.amountOut, b.targetAsset) : b.status.replace("_", " ")}`,
  }));

  const done = list.filter((b) => b.status === "success" && b.amountOut);
  const target = v.state.targetAsset ? targetByAssetId(v.state.targetAsset) : undefined;
  const sameAsset = target ? done.filter((b) => b.targetAsset === target.assetId) : [];
  const totalOut = sameAsset.reduce((s, b) => s + BigInt(b.amountOut!), 0n);
  const totalIn = sameAsset.reduce((s, b) => s + BigInt(b.amountIn), 0n);

  return (
    <div className="grid gap-14 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section aria-labelledby="stack" className="grid content-start gap-5">
        <div>
          <h1 id="stack" className="text-base font-bold text-sage">
            Your stack
          </h1>
          <p className="font-display text-[clamp(2.4rem,6vw,3.6rem)] font-extrabold leading-none">
            {target ? `${formatAmount(totalOut.toString(), target.decimals, target.key === "btc" ? 8 : 6)} ${target.symbol}` : "Nothing yet"}
          </p>
          {target && sameAsset.length > 0 ? (
            <p className="mt-2 text-sage">
              From {sameAsset.length} {sameAsset.length === 1 ? "buy" : "buys"} totalling ${formatUsdc(totalIn.toString())}, all sent to your wallet.
            </p>
          ) : null}
        </div>
        <StackColumn bars={bars} />
        {bars.length > 0 ? <p className="text-sm text-sage">Solid bars arrived. Striped bars are on their way. Dashed bars were skipped and cost nothing.</p> : null}
      </section>

      <div className="grid content-start gap-12">
        <BalanceCard usdcBalance={v.usdcBalance} amountPerRun={v.state.amountPerRun} />
        <NextBuy state={v.state} />
        <WhereIsMyMoney buys={list} />
      </div>
    </div>
  );
}
