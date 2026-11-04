import "server-only";

/**
 * Validated environment. Everything is optional so `pnpm demo` runs with no .env;
 * real (non-demo) mode checks `missingForRealMode()` at startup.
 * Roadmap: K0.6 · Spec: ARCHITECTURE.md §9
 */

import { z } from "zod";

export const envSchema = z.object({
  NEAR_RPC_URL: z.string().url().optional(),
  FACTORY_ACCOUNT_ID: z.string().optional(),
  USDC_CONTRACT_ID: z.string().optional(),
  KEEPER_ACCOUNT_ID: z.string().optional(),
  KEEPER_PRIVATE_KEY: z.string().optional(),
  ONECLICK_BASE_URL: z.string().url().default("https://1click.chaindefuser.com"),
  ONECLICK_JWT: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

/** Variables real mode cannot run without. Demo mode needs none of them. */
export const REQUIRED_FOR_REAL_MODE = [
  "NEAR_RPC_URL",
  "FACTORY_ACCOUNT_ID",
  "USDC_CONTRACT_ID",
  "KEEPER_ACCOUNT_ID",
  "KEEPER_PRIVATE_KEY",
  "ONECLICK_JWT",
  "SESSION_SECRET",
] as const satisfies readonly (keyof Env)[];

export function missingForRealMode(source: Record<string, string | undefined> = process.env): string[] {
  return REQUIRED_FOR_REAL_MODE.filter((name) => !source[name]);
}

// Empty strings from .env files mean "unset", not "invalid".
const cleaned = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""));

export const env: Env = envSchema.parse(cleaned);
