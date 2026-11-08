/**
 * Fixed-window rate limiter kept in Postgres, so every serverless instance shares the same counters
 * (K13.7; it used to live in each instance's memory). One atomic upsert per request: a new window
 * starts at 1, otherwise the count goes up by one, and the request is refused once it passes `limit`.
 * Roadmap: K4.4, K8.7, K13.7
 */

import { lt, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { rateLimits } from "../db/schema";
import { HttpError } from "./http";

export async function rateLimit(
  db: Db,
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
  message = "Too many requests, try again shortly",
): Promise<void> {
  const at = new Date(now);
  const windowOpenedBefore = new Date(now - windowMs);
  const expired = sql`${rateLimits.windowStart} <= ${windowOpenedBefore.toISOString()}::timestamptz`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: at, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        windowStart: sql`case when ${expired} then ${at.toISOString()}::timestamptz else ${rateLimits.windowStart} end`,
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
      },
    })
    .returning({ count: rateLimits.count });
  if ((row?.count ?? 0) > limit) throw new HttpError(429, message);
}

/** Drops counters whose window is long over (run daily with the demo cleanup). */
export async function deleteStaleRateLimits(db: Db, olderThan: Date): Promise<number> {
  const rows = await db.delete(rateLimits).where(lt(rateLimits.windowStart, olderThan)).returning({ key: rateLimits.key });
  return rows.length;
}
