/**
 * Queries for buys, including skipped ones. Roadmap: K3.4
 */

import { desc, eq, inArray } from "drizzle-orm";
import type { BuyStatus } from "../../core/status";
import type { Db } from "../client";
import { buys, type Buy } from "../schema";

export type NewBuy = typeof buys.$inferInsert;

export async function insertBuy(db: Db, row: NewBuy): Promise<Buy> {
  const [r] = await db.insert(buys).values(row).returning();
  return r!;
}

export async function updateBuy(db: Db, id: string, patch: Partial<Omit<NewBuy, "id" | "userId" | "quoteRef">> & { status?: BuyStatus }): Promise<void> {
  await db.update(buys).set(patch).where(eq(buys.id, id));
}

export async function listBuysByUser(db: Db, userId: string, limit = 200): Promise<Buy[]> {
  return db.select().from(buys).where(eq(buys.userId, userId)).orderBy(desc(buys.createdAt)).limit(limit);
}

/** Buys sent on-chain whose 1Click status isn't final yet. */
export async function listInFlightBuys(db: Db): Promise<Buy[]> {
  return db.select().from(buys).where(inArray(buys.status, ["sent", "processing"]));
}

/** Most recent buy row for a user (any status), used for in-flight and retry-backoff checks. */
export async function lastBuyForUser(db: Db, userId: string): Promise<Buy | undefined> {
  return (await db.select().from(buys).where(eq(buys.userId, userId)).orderBy(desc(buys.createdAt)).limit(1))[0];
}
