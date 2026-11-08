/**
 * Hourly: delete demo users older than a day (with their rows), so a hosted demo stays small.
 * Also drops rate-limit counters older than a day (K13.7).
 * Roadmap: K8.9, K13.7
 */

import { deleteStaleDemoUsers } from "../lib/db/queries/users";
import { deleteStaleRateLimits } from "../lib/server/rateLimit";
import type { WorkerDeps } from "./deps";

export const DEMO_TTL_MS = 24 * 60 * 60 * 1000;

export async function cleanupDemo(deps: Pick<WorkerDeps, "db" | "now" | "log">): Promise<number> {
  const n = await deleteStaleDemoUsers(deps.db, new Date(deps.now() - DEMO_TTL_MS));
  await deleteStaleRateLimits(deps.db, new Date(deps.now() - DEMO_TTL_MS));
  if (n > 0) deps.log.info("removed stale demo users", { count: n });
  return n;
}
