/**
 * Queries for funding attempts (any token → USDC into the vault). Roadmap: K3.4
 */

import { and, desc, eq, lt, notInArray } from "drizzle-orm";
import { FUNDING_TERMINAL, type FundingStatus } from "../../core/status";
import type { Db } from "../client";
import { fundingAttempts, type FundingAttempt } from "../schema";

export type NewFundingAttempt = typeof fundingAttempts.$inferInsert;

export async function insertFundingAttempt(db: Db, row: NewFundingAttempt): Promise<FundingAttempt> {
  const [r] = await db.insert(fundingAttempts).values(row).returning();
  return r!;
}

export async function getFundingAttempt(db: Db, id: string, userId: string): Promise<FundingAttempt | undefined> {
  return (await db.select().from(fundingAttempts).where(and(eq(fundingAttempts.id, id), eq(fundingAttempts.userId, userId))).limit(1))[0];
}

export async function listFundingByUser(db: Db, userId: string, limit = 50): Promise<FundingAttempt[]> {
  return db.select().from(fundingAttempts).where(eq(fundingAttempts.userId, userId)).orderBy(desc(fundingAttempts.createdAt)).limit(limit);
}

/** Attempts the worker still polls. */
export async function listActiveFunding(db: Db): Promise<FundingAttempt[]> {
  return db.select().from(fundingAttempts).where(notInArray(fundingAttempts.status, [...FUNDING_TERMINAL]));
}

export async function updateFundingStatus(
  db: Db,
  id: string,
  patch: { status: FundingStatus; oneclickStatus?: string | null; depositTxHash?: string | null },
): Promise<void> {
  await db
    .update(fundingAttempts)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(fundingAttempts.id, id));
}

/** DB-only expiry for quotes nobody paid, so the worker stops polling them even if 1Click is unreachable. */
export async function expireStaleFunding(db: Db, now: Date): Promise<number> {
  const rows = await db
    .update(fundingAttempts)
    .set({ status: "expired", updatedAt: now })
    .where(and(eq(fundingAttempts.status, "awaiting_deposit"), lt(fundingAttempts.quoteDeadline, now)))
    .returning({ id: fundingAttempts.id });
  return rows.length;
}
