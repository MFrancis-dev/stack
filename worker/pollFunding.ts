/**
 * Every 5 s: non-terminal funding attempts → status.
 * Roadmap: K5.2 · Spec: ARCHITECTURE.md §4.4
 * Status: scaffold — not implemented yet.
 */

/** One tick of the loop. Pure-ish: all I/O comes through `deps` so tests can run a single tick. */
export async function pollFunding(_deps: unknown): Promise<void> {
  // TODO(K5.2)
}
