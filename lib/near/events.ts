/**
 * NEP-297 events from transaction outcomes (`EVENT_JSON:{...}` logs). Roadmap: K3.3
 */

export interface NearEvent {
  standard: string;
  version: string;
  event: string;
  data?: unknown;
}

const PREFIX = "EVENT_JSON:";

export function parseEvents(logs: readonly string[]): NearEvent[] {
  const out: NearEvent[] = [];
  for (const log of logs) {
    if (!log.startsWith(PREFIX)) continue;
    try {
      const e = JSON.parse(log.slice(PREFIX.length)) as Partial<NearEvent>;
      if (typeof e.standard === "string" && typeof e.event === "string") {
        out.push({ standard: e.standard, version: String(e.version ?? ""), event: e.event, data: e.data });
      }
    } catch {
      /* not ours */
    }
  }
  return out;
}

/** Minimal shape of an RPC transaction response we rely on. */
export interface TxOutcomeLike {
  transaction_outcome?: { id?: string };
  transaction?: { hash?: string };
  receipts_outcome?: { outcome?: { logs?: string[] } }[];
}

export function txHash(res: TxOutcomeLike): string {
  return res.transaction_outcome?.id ?? res.transaction?.hash ?? "";
}

export function eventsOf(res: TxOutcomeLike): NearEvent[] {
  return parseEvents((res.receipts_outcome ?? []).flatMap((r) => r.outcome?.logs ?? []));
}
