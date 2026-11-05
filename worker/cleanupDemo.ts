/**
 * Hourly: delete demo users older than a day (with their rows), so a hosted demo stays small.
 * Roadmap: K8.9
 */

import { deleteStaleDemoUsers } from "../lib/db/queries/users";
import type { WorkerDeps } from "./deps";

export const DEMO_TTL_MS = 24 * 60 * 60 * 1000;

export async function cleanupDemo(deps: Pick<WorkerDeps, "db" | "now" | "log">): Promise<number> {
  const n = await deleteStaleDemoUsers(deps.db, new Date(deps.now() - DEMO_TTL_MS));
  if (n > 0) deps.log.info("removed stale demo users", { count: n });
  return n;
}
