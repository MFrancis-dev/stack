import "server-only";

/**
 * The one seam between routes and the outside world. Real mode wires 1Click, NEAR and the DB from
 * env; tests (and demo mode, K7.1) swap in their own implementations with `setServicesForTest`.
 * Roadmap: K4.x, K7.1
 */

import type { QuoteProvider, StatusProvider, VaultClient } from "../core/adapters";
import { getDb, type Db } from "../db/client";
import { nearVaultClient } from "../near";
import { demoVaultClient } from "../near/demo";
import { createKeeper } from "../near/keeper";
import { createProvider, type NearProvider } from "../near/rpc";
import { configureOneClick, getTokens, oneClickQuotes, oneClickStatus } from "../oneclick";
import { demoQuotes, demoStatus, tokensWithFallback } from "../oneclick/demo";
import type { TokenInfo } from "../oneclick/tokens";
import { NotConfiguredError } from "./http";

export interface Services {
  db: Db;
  quotes: QuoteProvider;
  status: StatusProvider;
  listTokens: () => Promise<TokenInfo[]>;
  /** null until NEAR_RPC_URL is set */
  near: NearProvider | null;
  /** null until the keeper, factory and USDC ids are set */
  vault: VaultClient | null;
}

let override: Services | null = null;
let real: Promise<Services> | null = null;

export function setServicesForTest(s: Services | null): void {
  override = s;
}

async function buildReal(): Promise<Services> {
  const e = process.env;
  configureOneClick({ baseUrl: e.ONECLICK_BASE_URL || undefined, jwt: e.ONECLICK_JWT });
  const db = getDb();
  await db.migrate();
  const near = e.NEAR_RPC_URL ? createProvider(e.NEAR_RPC_URL) : null;
  const vault =
    near && e.KEEPER_ACCOUNT_ID && e.KEEPER_PRIVATE_KEY && e.FACTORY_ACCOUNT_ID && e.USDC_CONTRACT_ID
      ? nearVaultClient({
          provider: near,
          keeper: createKeeper({ accountId: e.KEEPER_ACCOUNT_ID, privateKey: e.KEEPER_PRIVATE_KEY, rpcUrl: e.NEAR_RPC_URL! }),
          factoryId: e.FACTORY_ACCOUNT_ID,
          usdcContractId: e.USDC_CONTRACT_ID,
        })
      : null;
  return { db, quotes: oneClickQuotes, status: oneClickStatus, listTokens: () => getTokens(), near, vault };
}

export async function getServices(): Promise<Services> {
  if (override) return override;
  real ??= buildReal();
  return real;
}

/** Demo sessions get the same routes with demo adapters on the same database (K7.1). */
export function demoServices(base: Services): Services {
  return {
    db: base.db,
    quotes: demoQuotes,
    status: demoStatus,
    listTokens: async () => (await tokensWithFallback()).tokens,
    near: null,
    vault: demoVaultClient(base.db),
  };
}

export async function servicesFor(session: { demo: boolean }): Promise<Services> {
  const base = await getServices();
  return session.demo ? demoServices(base) : base;
}

export function requireVaultClient(s: Services): VaultClient {
  if (!s.vault) throw new NotConfiguredError("NEAR keeper/factory (NEAR_RPC_URL, KEEPER_*, FACTORY_ACCOUNT_ID, USDC_CONTRACT_ID)");
  return s.vault;
}

export function requireNear(s: Services): NearProvider {
  if (!s.near) throw new NotConfiguredError("NEAR_RPC_URL");
  return s.near;
}
