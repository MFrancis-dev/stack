/**
 * Plain-language status for a buy, with the recorded reason when it didn't happen.
 * Roadmap: K6.6
 */

import type { BuyStatus } from "@/lib/core/status";

const WORDS: Record<BuyStatus, string> = {
  success: "Arrived",
  sent: "On its way",
  processing: "On its way",
  skipped_cost: "Skipped: fees too high",
  no_quote: "Skipped: no price available",
  refunded: "Refunded to your vault",
  failed: "Didn't go through",
  expired: "Expired",
};

export function SkipReason({ status, note }: { status: BuyStatus; note: string | null }) {
  const bad = status === "failed";
  return (
    <span className="grid">
      <span className={`font-bold ${bad ? "text-rust" : ""}`}>{WORDS[status]}</span>
      {note && status !== "success" ? <span className="text-sm text-sage">{note}</span> : null}
    </span>
  );
}
