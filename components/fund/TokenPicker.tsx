"use client";

/**
 * Pick what you're sending: filter by name or chain, grouped by chain. Matches on assetId (symbols repeat).
 * Roadmap: K6.2
 */

import { useMemo, useState } from "react";
import { SelectField, TextField } from "@/components/ui/Field";
import type { TokenDto } from "@/lib/client/api";

export function TokenPicker({ tokens, value, onChange }: { tokens: TokenDto[]; value: string; onChange: (assetId: string) => void }) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = tokens.filter((t) => !needle || t.symbol.toLowerCase().includes(needle) || t.blockchain.toLowerCase().includes(needle));
    const by = new Map<string, TokenDto[]>();
    for (const t of list) by.set(t.blockchain, [...(by.get(t.blockchain) ?? []), t]);
    return [...by.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [tokens, q]);

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr]">
      <TextField label="Find a token" placeholder="USDC, SOL, base…" value={q} onChange={(e) => setQ(e.target.value)} />
      <SelectField label="You send" value={value} onChange={(e) => onChange(e.target.value)} hint="The token and the chain it's on.">
        <option value="">Choose a token</option>
        {groups.map(([chain, list]) => (
          <optgroup key={chain} label={chain}>
            {list.map((t) => (
              <option key={t.assetId} value={t.assetId}>
                {t.symbol} on {chain}
              </option>
            ))}
          </optgroup>
        ))}
      </SelectField>
    </div>
  );
}
