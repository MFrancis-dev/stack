/**
 * The plan in one sentence and when the next buy happens. Roadmap: K6.5
 */

import Link from "next/link";
import { targetByAssetId } from "@/lib/core/assets";
import type { VaultState } from "@/lib/core/types";
import { formatUsdc, intervalLabel, untilLabel } from "@/lib/client/format";

export function NextBuy({ state }: { state: VaultState }) {
  const target = state.targetAsset ? targetByAssetId(state.targetAsset) : undefined;
  if (!target || !state.destinationAddress) {
    return (
      <section className="grid gap-2">
        <h2 className="text-2xl font-bold">No plan yet</h2>
        <p className="text-sage">Choose what to buy and how often. Your vault stays paused until you do.</p>
        <Link href="/plan" className="font-bold text-moss underline-offset-4 hover:underline">
          Set your plan
        </Link>
      </section>
    );
  }
  return (
    <section className="grid gap-2">
      <h2 className="text-2xl font-bold">
        ${formatUsdc(state.amountPerRun)} of {target.symbol}, {intervalLabel(state.intervalS)}
      </h2>
      <p className="text-sage">
        {state.paused ? "Paused. No buys until you resume." : state.nextRunAtS ? `Next buy ${untilLabel(state.nextRunAtS * 1000)}.` : null} Coins go to{" "}
        <span className="break-all font-bold text-ink">{state.destinationAddress}</span> on {target.chainName}. Buys cost at most {(state.maxCostBps / 100).toFixed(2)}% in fees, or
        they’re skipped.
      </p>
    </section>
  );
}
