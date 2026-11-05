import type { ReactNode } from "react";

/** Inline message. `tone="warn"` for things the user should act on, never for decoration. */
export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error"; children: ReactNode }) {
  const look = {
    info: "bg-surface text-ink ring-1 ring-inset ring-mist",
    warn: "bg-brass-soft/60 text-ink",
    error: "bg-rust/10 text-rust",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-md px-4 py-3 text-[0.95rem] ${look}`}>
      {children}
    </div>
  );
}
