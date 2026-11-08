/**
 * Queries for users. Roadmap: K3.4
 */

import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import type { Db } from "../client";
import { buys, fundingAttempts, users, type User } from "../schema";

export async function upsertUser(db: Db, nearAccountId: string, opts: { isDemo?: boolean } = {}): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({ nearAccountId, isDemo: opts.isDemo ?? false })
    .onConflictDoUpdate({ target: users.nearAccountId, set: { nearAccountId } })
    .returning();
  return row!;
}

export async function getUserByAccount(db: Db, nearAccountId: string): Promise<User | undefined> {
  return (await db.select().from(users).where(eq(users.nearAccountId, nearAccountId)).limit(1))[0];
}

export async function getUserById(db: Db, id: string): Promise<User | undefined> {
  return (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
}

export async function setVault(db: Db, userId: string, vaultAccountId: string): Promise<void> {
  await db.update(users).set({ vaultAccountId }).where(eq(users.id, userId));
}

/** Everyone the real scheduler has to look at. Demo users never reach real-mode loops. */
export async function listUsersWithVault(db: Db): Promise<User[]> {
  return db.select().from(users).where(and(isNotNull(users.vaultAccountId), eq(users.isDemo, false)));
}

/**
 * Deletes demo users created before `olderThan`, with their deposits, buys and demo vault, so a hosted
 * demo doesn't grow forever. Never touches real users. Roadmap: K8.9
 */
export async function deleteStaleDemoUsers(db: Db, olderThan: Date): Promise<number> {
  const stale = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isDemo, true), lt(users.createdAt, olderThan)));
  if (stale.length === 0) return 0;
  const ids = stale.map((u) => u.id);
  await db.delete(buys).where(inArray(buys.userId, ids));
  await db.delete(fundingAttempts).where(inArray(fundingAttempts.userId, ids));
  await db.delete(users).where(and(inArray(users.id, ids), eq(users.isDemo, true))); // demo_vaults cascade
  return ids.length;
}

/** Signs the user out everywhere: every session issued before `at` stops working (K13.4). */
export async function revokeSessions(db: Db, userId: string, at: Date): Promise<void> {
  await db.update(users).set({ sessionsValidAfter: at }).where(eq(users.id, userId));
}
