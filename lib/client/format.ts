/**
 * Display helpers for the UI. Amounts stay bigint-safe via lib/core/money.
 * Roadmap: K6.x
 */

import { TARGET_ASSETS, targetByAssetId, USDC_DECIMALS } from "../core/assets";
import { formatAmount } from "../core/money";

/** Dollars: whole numbers stay whole ("100"), anything with cents shows two decimals ("996.70"). */
export function formatUsdc(base: string, maxFraction = 2): string {
  const s = formatAmount(base, USDC_DECIMALS, maxFraction);
  const [whole, frac] = s.split(".");
  return frac && maxFraction === 2 ? `${whole}.${frac.padEnd(2, "0")}` : s;
}

export function formatTarget(base: string | null, assetId: string): string {
  const t = targetByAssetId(assetId);
  if (!base || !t) return "—";
  return `${formatAmount(base, t.decimals, t.key === "btc" ? 8 : 6)} ${t.symbol}`;
}

export const INTERVALS = [
  { label: "Every day", seconds: 86_400 },
  { label: "Every week", seconds: 604_800 },
  { label: "Every 2 weeks", seconds: 1_209_600 },
  { label: "Every month (30 days)", seconds: 2_592_000 },
] as const;

export function intervalLabel(seconds: number): string {
  const known = INTERVALS.find((i) => i.seconds === seconds);
  if (known) return known.label.toLowerCase();
  if (seconds % 86_400 === 0) return `every ${seconds / 86_400} days`;
  if (seconds % 3_600 === 0) return `every ${seconds / 3_600} hours`;
  return `every ${Math.round(seconds / 60)} minutes`;
}

export function untilLabel(targetMs: number, now = Date.now()): string {
  const diff = targetMs - now;
  if (diff <= 0) return "due now";
  const m = Math.round(diff / 60_000);
  if (m < 60) return `in ${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `in ${h} h`;
  return `in ${Math.round(h / 24)} days`;
}

export const nearTxUrl = (hash: string) => `https://nearblocks.io/txns/${hash}`;

export function destinationTxUrl(assetId: string, hash: string): string | null {
  const t = targetByAssetId(assetId);
  if (t?.chain === "btc") return `https://mempool.space/tx/${hash}`;
  if (t?.chain === "eth") return `https://etherscan.io/tx/${hash}`;
  if (t?.chain === "near") return nearTxUrl(hash);
  return null;
}

export const targetOptions = Object.values(TARGET_ASSETS);
