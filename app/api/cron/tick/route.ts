/**
 * GET /api/cron/tick — one pass of the worker loops (funding status, buy status, quote expiry,
 * scheduled buys, keeper gas) for the serverless host. Called every 5 minutes by
 * .github/workflows/worker-tick.yml with `Authorization: Bearer $CRON_SECRET`.
 * Without a configured keeper, scheduleBuys does nothing; demo users are never touched.
 * Roadmap: K9.2
 */

import { getServices } from "@/lib/server/adapters";
import { cronAuthorized } from "@/lib/server/cronAuth";
import { handle, HttpError, json } from "@/lib/server/http";
import { consoleLogger } from "@/worker/deps";
import { depsFromServices, runTick } from "@/worker/tick";

export const maxDuration = 60;

export const GET = handle(async (req: Request) => {
  if (!cronAuthorized(req)) throw new HttpError(401, "Unauthorized");
  const deps = depsFromServices(await getServices(), consoleLogger);
  const loops = await runTick(deps);
  return json({ loops, keeper: deps.vault ? "configured" : "not configured" });
});
