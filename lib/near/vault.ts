/**
 * Typed vault bindings: views (anyone) and execute_buy (keeper). Roadmap: K3.3 · Spec: ARCHITECTURE.md §3.3
 */

import { actions } from "near-api-js";
import { asBaseUnits } from "../core/money";
import type { BaseUnits, VaultState } from "../core/types";
import { eventsOf, txHash, type NearEvent, type TxOutcomeLike } from "./events";
import { view, type NearProvider } from "./rpc";

/** Raw `get_state` (contracts/vault/src/lib.rs VaultView). */
export interface VaultViewRaw {
  owner: string;
  keeper: string;
  usdc: string;
  target_asset: string | null;
  destination_address: string | null;
  amount_per_run: string;
  interval_s: number;
  max_cost_bps: number;
  paused: boolean;
  last_run_at_s: number;
  next_run_at_s: number | null;
}

export function toVaultState(v: VaultViewRaw): VaultState {
  return {
    owner: v.owner,
    keeper: v.keeper,
    usdc: v.usdc,
    targetAsset: v.target_asset,
    destinationAddress: v.destination_address,
    amountPerRun: asBaseUnits(v.amount_per_run),
    intervalS: v.interval_s,
    maxCostBps: v.max_cost_bps,
    paused: v.paused,
    lastRunAtS: v.last_run_at_s,
    nextRunAtS: v.next_run_at_s,
  };
}

export async function getVaultState(provider: Pick<NearProvider, "callFunction">, vaultId: string): Promise<VaultState> {
  return toVaultState(await view<VaultViewRaw>(provider, vaultId, "get_state"));
}

export async function getUsdcBalance(provider: Pick<NearProvider, "callFunction">, usdcContractId: string, accountId: string): Promise<BaseUnits> {
  return asBaseUnits(await view<string>(provider, usdcContractId, "ft_balance_of", { account_id: accountId }));
}

/** Gas and the deposit that registers the 1Click deposit address on USDC (refunded if already registered). */
export const EXECUTE_BUY_GAS = 150_000_000_000_000n;
export const DEPOSIT_ADDRESS_STORAGE = 13_000_000_000_000_000_000_000n; // 0.013 NEAR

export interface KeeperAccount {
  signAndSendTransaction(args: { receiverId: string; actions: ReturnType<typeof actions.functionCall>[] }): Promise<unknown>;
}

export interface BuyResult {
  txHash: string;
  sent: boolean;
  events: NearEvent[];
}

export async function executeBuy(
  keeper: KeeperAccount,
  input: { vaultAccountId: string; quoteRef: string; depositAddress: string; amount: BaseUnits },
): Promise<BuyResult> {
  const res = (await keeper.signAndSendTransaction({
    receiverId: input.vaultAccountId,
    actions: [
      actions.functionCall(
        "execute_buy",
        { quote_ref: input.quoteRef, deposit_address: input.depositAddress, amount: input.amount },
        EXECUTE_BUY_GAS,
        DEPOSIT_ADDRESS_STORAGE,
      ),
    ],
  })) as TxOutcomeLike;
  const events = eventsOf(res);
  return { txHash: txHash(res), sent: events.some((e) => e.event === "buy_sent"), events };
}
