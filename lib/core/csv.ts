/**
 * Minimal RFC 4180 CSV writer (quotes fields containing commas, quotes or newlines).
 * Roadmap: K4.6
 */

export type CsvValue = string | number | null | undefined;

function field(v: CsvValue): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // Neutralise spreadsheet formulas from user-controlled text.
  const safe = /^[=+\-@]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: readonly string[], rows: readonly CsvValue[][]): string {
  return [header, ...rows].map((r) => r.map(field).join(",")).join("\r\n") + "\r\n";
}
