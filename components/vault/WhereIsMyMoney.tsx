"use client";

/**
 * Anything in motion right now: deposits on their way in and buys on their way out. Roadmap: K6.5
 */

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api, type BuyDto } from "@/lib/client/api";
import { formatTarget, formatUsdc } from "@/lib/client/format";
import { FUNDING_TERMINAL, type FundingStatus } from "@/lib/core/status";

interface AttemptDto {
  id: string;
  status: FundingStatus;
  originAsset: string;
  expectedOut: string;
  createdAt: string;
}

const FUNDING_WORDS: Partial<Record<FundingStatus, string>> = {
  awaiting_deposit: "waiting for your deposit",
  detected: "deposit seen, confirming",
  processing: "converting to dollars",
  underpaid: "arrived short — check the details",
};

export function WhereIsMyMoney({ buys }: { buys: BuyDto[] }) {
  const funding = useQuery({
    queryKey: ["funding"],
    queryFn: async () => (await api<{ attempts: AttemptDto[] }>("/api/fund")).attempts,
    refetchInterval: 10_000,
  });
  const incoming = (funding.data ?? []).filter((a) => !FUNDING_TERMINAL.has(a.status));
  const outgoing = buys.filter((b) => b.status === "sent" || b.status === "processing");

  return (
    <section aria-labelledby="motion" className="grid gap-3">
      <h2 id="motion" className="text-lg font-bold">
        Where your money is right now
      </h2>
      {incoming.length === 0 && outgoing.length === 0 ? (
        <p className="text-sage">Nothing on the move. Everything is either in your vault or already in your wallet.</p>
      ) : (
        <ul className="grid gap-2">
          {incoming.map((a) => (
            <li key={a.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-surface px-4 py-3 ring-1 ring-inset ring-mist">
              <span>
                About ${formatUsdc(a.expectedOut)} coming into your vault: {FUNDING_WORDS[a.status] ?? a.status}
              </span>
              <Link href={`/fund?attempt=${a.id}`} className="font-bold text-moss underline-offset-4 hover:underline">
                Details
              </Link>
            </li>
          ))}
          {outgoing.map((b) => (
            <li key={b.id} className="rounded-lg bg-surface px-4 py-3 ring-1 ring-inset ring-mist">
              ${formatUsdc(b.amountIn)} buying about {formatTarget(b.amountOut, b.targetAsset)}, on its way to your wallet
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
