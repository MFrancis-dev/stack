import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "../db/client";
import { deleteStaleRateLimits, rateLimit } from "./rateLimit";

// Roadmap: K13.7
let db: Db;
const NOW = Date.parse("2026-11-08T12:00:00Z");
beforeEach(async () => {
  db = createDb({ pgliteDataDir: "memory://" });
  await db.migrate();
});

const status = (p: Promise<void>) => p.then(() => 200, (e: { status?: number }) => e.status ?? 500);

describe("rateLimit (shared, in Postgres)", () => {
  it("allows up to the limit in a window, then refuses with 429", async () => {
    for (let i = 0; i < 3; i++) await rateLimit(db, "k", 3, 60_000, NOW + i);
    expect(await status(rateLimit(db, "k", 3, 60_000, NOW + 10))).toBe(429);
  });

  it("starts a fresh window once the old one is over", async () => {
    for (let i = 0; i < 4; i++) await status(rateLimit(db, "k", 3, 60_000, NOW));
    expect(await status(rateLimit(db, "k", 3, 60_000, NOW + 60_000))).toBe(200);
  });

  it("keeps separate counters per key", async () => {
    for (let i = 0; i < 3; i++) await rateLimit(db, "a", 3, 60_000, NOW);
    expect(await status(rateLimit(db, "b", 3, 60_000, NOW))).toBe(200);
  });

  it("counts every request even when they arrive at once (one atomic upsert each)", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => status(rateLimit(db, "burst", 5, 60_000, NOW))));
    expect(results.filter((s) => s === 200)).toHaveLength(5);
    expect(results.filter((s) => s === 429)).toHaveLength(3);
  });

  it("cleanup drops counters whose window is long over", async () => {
    await rateLimit(db, "old", 3, 60_000, NOW - 2 * 86_400_000);
    await rateLimit(db, "new", 3, 60_000, NOW);
    expect(await deleteStaleRateLimits(db, new Date(NOW - 86_400_000))).toBe(1);
  });
});
