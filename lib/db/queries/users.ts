/**
 * Queries for users. Roadmap: K3.4
 */

import { and, eq, isNotNull } from "drizzle-orm";
import type { Db } from "../client";
import { users, type User } from "../schema";

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
