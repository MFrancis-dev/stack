"use client";

/**
 * Amount in the token's own units, converted to base units without floats. Roadmap: K6.2
 */

import { TextField } from "@/components/ui/Field";
import { toBaseUnits } from "@/lib/core/money";

export function parseAmount(display: string, decimals: number): { base: string | null; error: string | null } {
  if (!display.trim()) return { base: null, error: null };
  try {
    const base = toBaseUnits(display, decimals);
    return BigInt(base) > 0n ? { base, error: null } : { base: null, error: "Enter more than zero" };
  } catch (e) {
    return { base: null, error: e instanceof Error && e.message.startsWith("At most") ? e.message : "Enter a number like 25 or 0.5" };
  }
}

export function AmountInput({
  label,
  value,
  onChange,
  decimals,
  symbol,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  decimals: number;
  symbol: string;
  hint?: string;
}) {
  const { error } = parseAmount(value, decimals);
  return (
    <TextField
      label={label}
      inputMode="decimal"
      autoComplete="off"
      placeholder={`0 ${symbol}`}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(",", "."))}
      error={error}
      hint={hint}
    />
  );
}
