/**
 * In-memory fixed-window rate limiter (single app instance). Roadmap: K4.4, K8.7
 */

import { HttpError } from "./http";

const windows = new Map<string, { start: number; count: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): void {
  const w = windows.get(key);
  if (!w || now - w.start >= windowMs) {
    windows.set(key, { start: now, count: 1 });
    return;
  }
  w.count += 1;
  if (w.count > limit) throw new HttpError(429, "Too many requests, try again shortly");
}

/** For tests. */
export function resetRateLimits(): void {
  windows.clear();
}
