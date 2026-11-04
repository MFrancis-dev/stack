/**
 * Worker entry: `pnpm worker`. Polls funding and buys, schedules buys, expires quotes, watches keeper gas.
 * Must run on a long-lived host (not serverless). Stops cleanly on SIGINT/SIGTERM.
 * Roadmap: K5.1 · Spec: ARCHITECTURE.md §4.4
 */

import { getServices } from "../lib/server/adapters";
import { checkKeeperBalance } from "./alerts";
import { consoleLogger, type WorkerDeps } from "./deps";
import { expireQuotes } from "./expireQuotes";
import { pollBuys } from "./pollBuys";
import { pollFunding } from "./pollFunding";
import { startLoops } from "./runner";
import { scheduleBuys } from "./scheduleBuys";

export const INTERVALS = {
  pollFunding: 5_000,
  pollBuys: 10_000,
  scheduleBuys: 60_000,
  expireQuotes: 60_000,
  keeperBalance: 10 * 60_000,
} as const;

async function main() {
  const s = await getServices();
  const deps: WorkerDeps = {
    db: s.db,
    quotes: s.quotes,
    status: s.status,
    vault: s.vault,
    near: s.near,
    keeperAccountId: process.env.KEEPER_ACCOUNT_ID || null,
    now: Date.now,
    log: consoleLogger,
  };
  if (!deps.vault) consoleLogger.warn("keeper not configured: scheduleBuys will do nothing (run `pnpm check-env`)");

  const runner = startLoops(
    [
      { name: "pollFunding", everyMs: INTERVALS.pollFunding, tick: () => pollFunding(deps) },
      { name: "pollBuys", everyMs: INTERVALS.pollBuys, tick: () => pollBuys(deps) },
      { name: "scheduleBuys", everyMs: INTERVALS.scheduleBuys, tick: () => scheduleBuys(deps) },
      { name: "expireQuotes", everyMs: INTERVALS.expireQuotes, tick: () => expireQuotes(deps) },
      { name: "keeperBalance", everyMs: INTERVALS.keeperBalance, tick: () => checkKeeperBalance(deps) },
    ],
    consoleLogger,
  );
  consoleLogger.info("worker started", { loops: Object.keys(INTERVALS) });

  const shutdown = async (signal: string) => {
    consoleLogger.info("worker stopping", { signal });
    await runner.stop();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((e) => {
  consoleLogger.alert("worker failed to start", { error: e instanceof Error ? e.message : String(e) });
  process.exit(1);
});
