/**
 * What every worker loop receives. Real values come from getServices(); tests pass fakes.
 * Roadmap: K5.x
 */

import type { QuoteProvider, StatusProvider, VaultClient } from "../lib/core/adapters";
import type { Db } from "../lib/db/client";
import type { NearProvider } from "../lib/near/rpc";

export interface Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  /** Something a human should look at (low keeper gas, refused buy, …). */
  alert(msg: string, data?: Record<string, unknown>): void;
}

export interface WorkerDeps {
  db: Db;
  quotes: QuoteProvider;
  status: StatusProvider;
  /** null when the keeper isn't configured: scheduleBuys then does nothing. */
  vault: VaultClient | null;
  near: Pick<NearProvider, "viewAccount"> | null;
  keeperAccountId: string | null;
  now: () => number;
  log: Logger;
}

/** JSON-lines logger. Callers must never pass secrets or personal data. */
export const consoleLogger: Logger = {
  info: (msg, data) => console.log(JSON.stringify({ level: "info", msg, ...data })),
  warn: (msg, data) => console.warn(JSON.stringify({ level: "warn", msg, ...data })),
  alert: (msg, data) => console.error(JSON.stringify({ level: "alert", msg, ...data })),
};

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
