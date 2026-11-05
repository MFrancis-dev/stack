/**
 * One pass of every worker loop, for hosts without a long-running process (the hosted app is
 * serverless). `GET /api/cron/tick` calls it on a schedule; `pnpm worker` keeps using the loops.
 * Each loop is isolated: one failing never stops the others.
 * Roadmap: K9.2 · Spec: ARCHITECTURE.md §4.4
 */

import type { Services } from "../lib/server/adapters";
import { checkKeeperBalance } from "./alerts";
import { errorMessage, type WorkerDeps } from "./deps";
import { expireQuotes } from "./expireQuotes";
import { pollBuys } from "./pollBuys";
import { pollFunding } from "./pollFunding";
import { scheduleBuys } from "./scheduleBuys";

export function depsFromServices(s: Services, log: WorkerDeps["log"]): WorkerDeps {
  return {
    db: s.db,
    quotes: s.quotes,
    status: s.status,
    vault: s.vault,
    near: s.near,
    keeperAccountId: process.env.KEEPER_ACCOUNT_ID || null,
    now: Date.now,
    log,
  };
}

export type TickLoop = { name: string; run: (deps: WorkerDeps) => Promise<unknown> };

/** Order matters: settle what's in flight before starting anything new. */
export const TICK_LOOPS: TickLoop[] = [
  { name: "pollFunding", run: pollFunding },
  { name: "pollBuys", run: pollBuys },
  { name: "expireQuotes", run: expireQuotes },
  { name: "scheduleBuys", run: scheduleBuys },
  { name: "keeperBalance", run: checkKeeperBalance },
];

export async function runTick(deps: WorkerDeps, loops: TickLoop[] = TICK_LOOPS): Promise<Record<string, "ok" | "failed">> {
  const result: Record<string, "ok" | "failed"> = {};
  for (const loop of loops) {
    try {
      await loop.run(deps);
      result[loop.name] = "ok";
    } catch (e) {
      result[loop.name] = "failed";
      deps.log.alert("worker tick loop failed", { loop: loop.name, error: errorMessage(e) });
    }
  }
  return result;
}
