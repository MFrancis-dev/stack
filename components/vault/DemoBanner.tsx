"use client";

/**
 * Shown on every page of a demo session: says it's example data and offers the two demo controls.
 * Roadmap: K7.3, K7.4
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/client/api";

export function DemoBanner() {
  const qc = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const done = () => qc.invalidateQueries();
  const forward = useMutation({
    mutationFn: () => api<{ bought: number; skipped: number; stoppedEmpty: boolean }>("/api/demo/fast-forward", { method: "POST" }),
    onSuccess: (r) => {
      setMessage(
        `30 days later: ${r.bought} ${r.bought === 1 ? "buy" : "buys"}${r.skipped ? `, ${r.skipped} skipped for fees` : ""}${r.stoppedEmpty ? ". The vault ran out of dollars" : ""}.`,
      );
      return done();
    },
    onError: (e) => setMessage(e.message),
  });
  const reset = useMutation({
    mutationFn: () => api("/api/demo/reset", { method: "POST" }),
    onSuccess: () => {
      setMessage("Back to the start.");
      return done();
    },
  });
  return (
    <aside className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-md bg-brass-soft/60 px-4 py-3" aria-label="Demo mode">
      <p>
        <strong>Demo mode.</strong> Example data, no real money. Your wallet isn&apos;t used.
        {message ? <span className="block text-sm" aria-live="polite">{message}</span> : null}
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="min-h-9 rounded-md bg-ink px-3 text-sm font-bold text-paper disabled:opacity-60" disabled={forward.isPending} onClick={() => forward.mutate()}>
          {forward.isPending ? "Fast-forwarding…" : "Fast-forward 30 days"}
        </button>
        <button className="min-h-9 rounded-md px-3 text-sm font-bold ring-1 ring-inset ring-ink/30 disabled:opacity-60" disabled={reset.isPending} onClick={() => reset.mutate()}>
          Start over
        </button>
      </div>
    </aside>
  );
}
