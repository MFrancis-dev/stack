/**
 * DB client: embedded PGlite when DATABASE_URL is empty (local + demo mode, zero config),
 * Postgres when it is set (hosted). Both expose the same Drizzle pg API.
 * Roadmap: K0.6 · Spec: ARCHITECTURE.md §2
 */

import { PGlite } from "@electric-sql/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Same folder drizzle.config.ts uses, so `pnpm db:migrate` and the app share one local DB. */
export const DEFAULT_PGLITE_DIR = "./.pglite";

export interface DbOptions {
  /** Postgres connection string. Empty or undefined → PGlite. */
  databaseUrl?: string;
  /** PGlite data directory, or "memory://" for tests. */
  pgliteDataDir?: string;
}

export function createDb({ databaseUrl, pgliteDataDir = DEFAULT_PGLITE_DIR }: DbOptions = {}): Db {
  if (databaseUrl) {
    return drizzlePostgres(postgres(databaseUrl), { schema }) as unknown as Db;
  }
  return drizzlePglite(new PGlite(pgliteDataDir), { schema }) as unknown as Db;
}

let shared: Db | undefined;

/** Process-wide client for the app and worker. Tests should call `createDb` directly. */
export function getDb(): Db {
  shared ??= createDb({ databaseUrl: process.env.DATABASE_URL || undefined });
  return shared;
}
