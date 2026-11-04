import "server-only";

/**
 * Validated environment. Everything optional so `pnpm demo` runs with no .env.
 * Roadmap: K0.6 · Spec: ARCHITECTURE.md §9
 * Status: scaffold — not implemented yet.
 */

import { z } from "zod";

const schema = z.object({
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

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
