/**
 * Every 60 s: due vaults → quote → verify → plan match → cost check → execute_buy → submit.
 * Roadmap: K5.3 · Spec: ARCHITECTURE.md §4.4
 * Status: scaffold — not implemented yet.
 */

/** One tick of the loop. Pure-ish: all I/O comes through `deps` so tests can run a single tick. */
export async function scheduleBuys(_deps: unknown): Promise<void> {
  // TODO(K5.3)
}
