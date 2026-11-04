/**
 * Base-unit conversion, formatting and decimal parsing. bigint only — never floats.
 * Roadmap: K2.1 · Spec: AGENTS.md §6
 */

import type { BaseUnits } from "./types";

const DIGITS = /^\d+$/;
const DECIMAL = /^(\d+)(?:\.(\d+))?$/;

/** Validates and brands an integer string (or bigint) as base units. */
export function asBaseUnits(value: string | bigint): BaseUnits {
  const s = typeof value === "bigint" ? value.toString() : value;
  if (!DIGITS.test(s)) throw new Error(`Not a non-negative integer amount: "${s}"`);
  return BigInt(s).toString() as BaseUnits;
}

/** "12.5" with 6 decimals → "12500000". Rejects more fraction digits than the asset has. */
export function toBaseUnits(display: string, decimals: number): BaseUnits {
  const m = DECIMAL.exec(display.trim());
  if (!m) throw new Error(`Not a decimal amount: "${display}"`);
  const whole = m[1] ?? "0";
  const frac = m[2] ?? "";
  if (frac.length > decimals) throw new Error(`At most ${decimals} decimal places`);
  return asBaseUnits(BigInt(whole + frac.padEnd(decimals, "0")));
}

/** "12500000" with 6 decimals → "12.5" (trailing zeros trimmed, optional cap on shown digits). */
export function formatAmount(amount: BaseUnits | string, decimals: number, maxFractionDigits = decimals): string {
  const v = BigInt(asBaseUnits(amount));
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  let frac = (v % base).toString().padStart(decimals, "0").slice(0, maxFractionDigits);
  frac = frac.replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

/** Parses a decimal string (e.g. a USD value from 1Click) into a bigint scaled by 10^scale, truncating. */
export function parseScaled(decimal: string, scale: number): bigint {
  const m = DECIMAL.exec(decimal.trim());
  if (!m) throw new Error(`Not a decimal: "${decimal}"`);
  const frac = (m[2] ?? "").slice(0, scale).padEnd(scale, "0");
  return BigInt((m[1] ?? "0") + frac);
}

export function minUnits(a: BaseUnits, b: BaseUnits): BaseUnits {
  return BigInt(a) <= BigInt(b) ? a : b;
}
