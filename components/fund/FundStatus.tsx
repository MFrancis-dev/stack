"use client";

/**
 * Live status of one deposit, in plain words. Polls until final. Roadmap: K6.2
 */

import { useQuery } from "@tanstack/react-query";
import { Notice } from "@/components/ui/Notice";
import { api, type FundStatusDto } from "@/lib/client/api";
import { formatUsdc } from "@/lib/client/format";
import { FUNDING_TERMINAL, type FundingStatus } from "@/lib/core/status";

const COPY: Record<FundingStatus, { text: string; tone: "info" | "warn" | "error" }> = {
  awaiting_deposit: { text: "Waiting for your deposit.", tone: "info" },
  detected: { text: "Deposit seen. Waiting for confirmations.", tone: "info" },
  processing: { text: "Converting to dollars for your vault.", tone: "info" },
  credited: { text: "Done. The dollars are in your vault.", tone: "info" },
  underpaid: { text: "Less than the quoted amount arrived. Top up to the full amount before the deadline, or it will be refunded to your refund address.", tone: "warn" },
  refunded: { text: "Refunded to your refund address. Nothing reached your vault.", tone: "warn" },
  failed: { text: "This deposit failed. If you sent funds, they'll be refunded to your refund address.", tone: "error" },
  expired: { text: "This address expired before a deposit arrived. Get a new address to try again.", tone: "warn" },
};

export function FundStatus({ attemptId }: { attemptId: string }) {
  const q = useQuery({
    queryKey: ["fund", attemptId],
    queryFn: () => api<FundStatusDto>(`/api/fund/${attemptId}/status`),
    refetchInterval: (query) => (query.state.data && FUNDING_TERMINAL.has(query.state.data.status) ? false : 5_000),
  });
  if (q.isError) return <Notice tone="error">{q.error.message}</Notice>;
  if (!q.data) return <p className="text-sage">Checking status…</p>;
  const c = COPY[q.data.status];
  return (
    <div className="grid gap-1" aria-live="polite">
      <Notice tone={c.tone}>{c.text}</Notice>
      {q.data.status === "credited" ? <p className="text-sm text-sage">About ${formatUsdc(q.data.expectedOut)} added.</p> : null}
    </div>
  );
}
