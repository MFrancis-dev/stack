/**
 * Typed factory bindings. Roadmap: K3.3 · Spec: ARCHITECTURE.md §3.2
 */

import { actions } from "near-api-js";
import { eventsOf, txHash, type NearEvent, type TxOutcomeLike } from "./events";
import { view, type NearProvider } from "./rpc";
import type { KeeperAccount } from "./vault";

export const CREATE_VAULT_GAS = 300_000_000_000_000n;

export async function getVault(provider: Pick<NearProvider, "callFunction">, factoryId: string, owner: string): Promise<string | null> {
  return (await view<string | null>(provider, factoryId, "get_vault", { owner })) ?? null;
}

export interface CreateVaultResult {
  txHash: string;
  /** Account id when the factory emitted `vault_created`. */
  vaultAccountId: string | null;
  /** Created but USDC registration failed: keeper should call `retry_registration`. */
  registrationFailed: boolean;
  events: NearEvent[];
}

export async function createVaultFor(keeper: KeeperAccount, factoryId: string, owner: string): Promise<CreateVaultResult> {
  const res = (await keeper.signAndSendTransaction({
    receiverId: factoryId,
    actions: [actions.functionCall("create_vault_for", { owner }, CREATE_VAULT_GAS, 0n)],
  })) as TxOutcomeLike;
  const events = eventsOf(res);
  const created = events.find((e) => e.event === "vault_created");
  const data = (created?.data as { vault?: string }[] | { vault?: string } | undefined) ?? undefined;
  const vault = Array.isArray(data) ? data[0]?.vault : data?.vault;
  return {
    txHash: txHash(res),
    vaultAccountId: vault ?? null,
    registrationFailed: events.some((e) => e.event === "vault_registration_failed"),
    events,
  };
}
