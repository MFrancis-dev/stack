import "server-only";

/**
 * Cron routes are callable only with `Authorization: Bearer $CRON_SECRET` (Vercel Cron and the
 * scheduled GitHub workflow send it). Closed when the secret is missing or shorter than 16 chars.
 * Roadmap: K8.9, K9.2
 */

import { timingSafeEqual } from "node:crypto";

export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
