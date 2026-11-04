/**
 * Every 10 s: in-flight buys → final status + destination tx.
 * Roadmap: K5.4 · Spec: ARCHITECTURE.md §4.4
 * Status: scaffold — not implemented yet.
 */

/** One tick of the loop. Pure-ish: all I/O comes through `deps` so tests can run a single tick. */
export async function pollBuys(_deps: unknown): Promise<void> {
  // TODO(K5.4)
}
