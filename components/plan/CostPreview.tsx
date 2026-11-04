"use client";

/**
 * Live estimate of what one buy gets and what it costs, so small BTC buys (mostly fees) are obvious
 * before saving. Debounced dry quote via /api/plan/preview. Roadmap: K6.3
 */

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Notice } from "@/components/ui/Notice";
import { api, type PlanPreviewDto } from "@/lib/client/api";
import type { TargetKey } from "@/lib/core/assets";

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function CostPreview({ target, amountPerRun, maxCostBps }: { target: TargetKey; amountPerRun: string | null; maxCostBps: number | null }) {
  const key = useDebounced(amountPerRun ? `${target}:${amountPerRun}` : null, 500);
  const q = useQuery({
    queryKey: ["plan-preview", key],
    queryFn: () => api<PlanPreviewDto>("/api/plan/preview", { body: { target, amountPerRun } }),
    enabled: !!key,
    staleTime: 60_000,
    retry: false,
  });

  if (!amountPerRun) return <p className="text-sage">Enter an amount to see what each buy gets you.</p>;
  if (q.isPending) return <p className="text-sage">Checking today&apos;s rate…</p>;
  if (q.isError) return <Notice tone="error">{q.error.message}</Notice>;
  const p = q.data;
  const pct = p.costBps === null ? null : p.costBps / 100;
  const over = p.costBps !== null && maxCostBps !== null && p.costBps > maxCostBps;
  return (
    <div className="grid gap-3" aria-live="polite">
      <p className="text-lg">
        Each buy gets about <strong>{p.amountOutFormatted} {p.target.toUpperCase()}</strong>
        {pct !== null ? (
          <>
            , costing <strong>{pct.toFixed(2)}%</strong> in fees today
          </>
        ) : null}
        .
      </p>
      {over ? (
        <Notice tone="warn">
          That&apos;s above your limit of {(maxCostBps! / 100).toFixed(2)}%, so buys like this would be skipped. Raise the amount or the limit.
        </Notice>
      ) : null}
      {p.belowSuggestedMin ? (
        <Notice tone="warn">
          Small {p.target.toUpperCase()} buys are mostly network fees. We suggest at least ${p.suggestedMinPerRunUsd} per buy.
        </Notice>
      ) : null}
    </div>
  );
}
