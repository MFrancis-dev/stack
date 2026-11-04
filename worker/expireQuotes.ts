/**
 * Every 60 s: unpaid funding quotes past their deadline → expired (DB only, works while 1Click is down).
 * Roadmap: K5.5 · Spec: ARCHITECTURE.md §4.4
 */

import { expireStaleFunding } from "../lib/db/queries/fundingAttempts";
import type { WorkerDeps } from "./deps";

export async function expireQuotes(deps: Pick<WorkerDeps, "db" | "now" | "log">): Promise<void> {
  const n = await expireStaleFunding(deps.db, new Date(deps.now()));
  if (n > 0) deps.log.info("expired unpaid funding quotes", { count: n });
}
