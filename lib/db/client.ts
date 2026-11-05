/**
 * DB client: embedded PGlite when DATABASE_URL is empty (local + demo mode, zero config),
 * Postgres when it is set (hosted). Both expose the same Drizzle pg API plus `migrate()`.
 * Roadmap: K0.6, K3.4 · Spec: ARCHITECTURE.md §2
 */

import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema> & {
  /** Applies the SQL migrations in ./drizzle. Safe to call repeatedly. */
  migrate(): Promise<void>;
};

/** Same folder drizzle.config.ts uses, so `pnpm db:migrate` and the app share one local DB. */
export const DEFAULT_PGLITE_DIR = "./.pglite";
export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

export interface DbOptions {
  /** Postgres connection string. Empty or undefined → PGlite. */
  databaseUrl?: string;
  /** PGlite data directory, or "memory://" for tests. */
  pgliteDataDir?: string;
}

export function createDb({ databaseUrl, pgliteDataDir = DEFAULT_PGLITE_DIR }: DbOptions = {}): Db {
  if (databaseUrl) {
    // Serverless + pooled URLs (e.g. Neon's pooler): one connection per instance, no prepared statements.
    const db = drizzlePostgres(postgres(databaseUrl, { max: 1, prepare: false }), { schema });
    return Object.assign(db, { migrate: () => migratePostgres(db, { migrationsFolder: MIGRATIONS_FOLDER }) }) as unknown as Db;
  }
  const db = drizzlePglite(new PGlite(pgliteDataDir), { schema });
  return Object.assign(db, { migrate: () => migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER }) }) as unknown as Db;
}

let shared: Db | undefined;

/** Process-wide client for the app and worker. Tests should call `createDb` directly. */
export function getDb(): Db {
  if (!shared) {
    const databaseUrl = process.env.DATABASE_URL || undefined;
    // Hosted platforms have a read-only or throwaway disk: the embedded database would lose data or crash.
    if (!databaseUrl && process.env.VERCEL) throw new Error("DATABASE_URL is required when hosted (embedded PGlite is for local and CI only)");
    shared = createDb({ databaseUrl });
  }
  return shared;
}
