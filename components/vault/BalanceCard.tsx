/**
 * Dollars waiting in the vault and what they cover. Roadmap: K6.5
 */

import Link from "next/link";
import { formatUsdc } from "@/lib/client/format";

export function BalanceCard({ usdcBalance, amountPerRun }: { usdcBalance: string; amountPerRun: string }) {
  const perRun = BigInt(amountPerRun);
  const runs = perRun > 0n ? BigInt(usdcBalance) / perRun : null;
  return (
    <section aria-labelledby="balance" className="grid gap-1">
      <h2 id="balance" className="text-base font-bold text-sage">
        Ready to buy with
      </h2>
      <p className="font-display text-5xl font-extrabold">${formatUsdc(usdcBalance)}</p>
      <p className="text-sage">
        {runs === null ? "Set a plan to start buying." : runs === 0n ? "Less than one buy left. " : `Enough for ${runs} more ${runs === 1n ? "buy" : "buys"}. `}
        <Link href="/fund" className="font-bold text-moss underline-offset-4 hover:underline">
          Add funds
        </Link>
      </p>
    </section>
  );
}
