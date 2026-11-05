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
    <ol className="flex flex-col-reverse gap-[3px]" aria-label="Buys, newest at the top">
      {bars.map((b) => (
        <li key={b.key} className="group flex items-center gap-3">
          <span
            aria-hidden
            className={`block h-3 rounded-[2px] ${b.state === "done" ? "bg-brass" : b.state === "pending" ? "stack-pending" : "border border-dashed border-sage/60"}`}
            style={{ width: b.state === "skipped" ? "18%" : `${Math.max(8, (b.weight / max) * 100)}%` }}
          />
          <span className="sr-only sm:not-sr-only sm:shrink-0 sm:text-xs sm:text-sage sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">{b.label}</span>
        </li>
      ))}
    </ol>
  );
}
