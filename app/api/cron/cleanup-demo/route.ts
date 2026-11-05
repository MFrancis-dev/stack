/**
 * GET /api/cron/cleanup-demo — Vercel Cron entry for the demo cleanup (the worker does this hourly on a
 * long-running host). Only callable with `Authorization: Bearer $CRON_SECRET`, which Vercel sends.
 * Roadmap: K8.9, K9.2
 */

import { timingSafeEqual } from "node:crypto";
import { getServices } from "@/lib/server/adapters";
import { handle, HttpError, json } from "@/lib/server/http";
import { cleanupDemo } from "@/worker/cleanupDemo";
import { consoleLogger } from "@/worker/deps";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const GET = handle(async (req: Request) => {
  if (!authorized(req)) throw new HttpError(401, "Unauthorized");
  const { db } = await getServices();
  const removed = await cleanupDemo({ db, now: Date.now, log: consoleLogger });
  return json({ removed });
});
