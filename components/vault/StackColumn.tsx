/**
 * The stack: one bar per buy, newest on top, width = share of the largest buy.
 * Solid brass = arrived, striped = on its way, outline = skipped (nothing spent).
 * Roadmap: K6.5
 */

export interface StackBar {
  key: string;
  /** relative size; ignored for skipped */
  weight: number;
  state: "done" | "pending" | "skipped";
  label: string;
}

export function StackColumn({ bars, empty }: { bars: StackBar[]; empty?: string }) {
  if (bars.length === 0) {
    return <p className="text-sage">{empty ?? "Your first buy will appear here."}</p>;
  }
  const max = Math.max(1, ...bars.filter((b) => b.state !== "skipped").map((b) => b.weight));
  return (
    <ol className="flex flex-col-reverse gap-1" aria-label="Buys, newest at the top">
      {bars.map((b) => (
        <li key={b.key} title={b.label}>
          <span
            aria-hidden
            className={`block h-4 rounded-[2px] ${b.state === "done" ? "bg-brass" : b.state === "pending" ? "stack-pending" : "border border-dashed border-sage/60"}`}
            style={{ width: b.state === "skipped" ? "22%" : `${Math.max(10, (b.weight / max) * 100)}%` }}
          />
          <span className="sr-only">{b.label}</span>
        </li>
      ))}
    </ol>
  );
}
