/**
 * GET /api/cron/cleanup-demo — Vercel Cron entry for the demo cleanup (the worker does this hourly on a
 * long-running host). Only callable with `Authorization: Bearer $CRON_SECRET`, which Vercel sends.
 * Roadmap: K8.9, K9.2
 */

import { getServices } from "@/lib/server/adapters";
import { cronAuthorized } from "@/lib/server/cronAuth";
import { handle, HttpError, json } from "@/lib/server/http";
import { cleanupDemo } from "@/worker/cleanupDemo";
import { consoleLogger } from "@/worker/deps";

export const GET = handle(async (req: Request) => {
  if (!cronAuthorized(req)) throw new HttpError(401, "Unauthorized");
  const { db } = await getServices();
  const removed = await cleanupDemo({ db, now: Date.now, log: consoleLogger });
  return json({ removed });
});
