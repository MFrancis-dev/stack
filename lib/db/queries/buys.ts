/**
 * Queries for buys, including skipped ones. Roadmap: K3.4
 */

import { and, desc, eq, inArray, notInArray } from "drizzle-orm";
import type { BuyStatus } from "../../core/status";
import type { Db } from "../client";
import { buys, users, type Buy } from "../schema";

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

/** Real buys sent on-chain whose 1Click status isn't final yet (demo users excluded). */
export async function listInFlightBuys(db: Db): Promise<Buy[]> {
  const demoUsers = db.select({ id: users.id }).from(users).where(eq(users.isDemo, true));
  return db.select().from(buys).where(and(inArray(buys.status, ["sent", "processing"]), notInArray(buys.userId, demoUsers)));
}

/** Most recent buy row for a user (any status), used for in-flight and retry-backoff checks. */
export async function lastBuyForUser(db: Db, userId: string): Promise<Buy | undefined> {
  return (await db.select().from(buys).where(eq(buys.userId, userId)).orderBy(desc(buys.createdAt)).limit(1))[0];
}
