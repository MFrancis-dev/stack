/**
 * Demo-mode VaultClient. The fake vault's plan lives in `demo_vaults`; its USDC balance is derived from
 * the demo user's rows (credited deposits − buys − withdrawals), so there is one source of truth.
 * Owner actions (set_plan, resume, pause, withdraw) arrive from the UI instead of a wallet and follow
 * the same rules as contracts/vault. Roadmap: K7.1
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import type { VaultClient } from "../core/adapters";
import { asBaseUnits } from "../core/money";
import type { BaseUnits, VaultState } from "../core/types";
import type { OwnerTx } from "../client/ownerTx";
import type { Db } from "../db/client";
import { buys, demoVaults, fundingAttempts, users } from "../db/schema";

export interface DemoVaultState {
  targetAsset: string | null;
  destinationAddress: string | null;
  amountPerRun: string;
  intervalS: number;
  maxCostBps: number;
  paused: boolean;
  lastRunAtS: number;
}

export class DemoRuleError extends Error {}

export async function loadDemoVault(db: Db, vaultAccountId: string) {
  const row = (await db.select().from(demoVaults).where(eq(demoVaults.vaultAccountId, vaultAccountId)).limit(1))[0];
  if (!row) throw new DemoRuleError("Demo vault not found");
  return { row, state: row.state as DemoVaultState };
}

export function toVaultState(owner: string, s: DemoVaultState): VaultState {
  const hasPlan = !!s.targetAsset && !!s.destinationAddress && BigInt(s.amountPerRun) > 0n && s.intervalS > 0;
  return {
    owner,
    keeper: "demo-keeper",
    usdc: "demo-usdc",
    targetAsset: s.targetAsset,
    destinationAddress: s.destinationAddress,
    amountPerRun: asBaseUnits(s.amountPerRun),
    intervalS: s.intervalS,
    maxCostBps: s.maxCostBps,
    paused: s.paused,
    lastRunAtS: s.lastRunAtS,
    nextRunAtS: s.paused || !hasPlan ? null : s.lastRunAtS + s.intervalS,
  };
}

export async function demoBalance(db: Db, vaultAccountId: string): Promise<BaseUnits> {
  const { row } = await loadDemoVault(db, vaultAccountId);
  const [inRow] = await db
    .select({ v: sql<string>`coalesce(sum(${fundingAttempts.expectedOut}), 0)` })
    .from(fundingAttempts)
    .where(and(eq(fundingAttempts.userId, row.userId), eq(fundingAttempts.status, "credited")));
  const [outRow] = await db
    .select({ v: sql<string>`coalesce(sum(${buys.amountIn}), 0)` })
    .from(buys)
    .where(and(eq(buys.userId, row.userId), inArray(buys.status, ["sent", "processing", "success"])));
  const bal = BigInt(String(inRow?.v ?? "0").split(".")[0]!) - BigInt(String(outRow?.v ?? "0").split(".")[0]!) - BigInt(row.withdrawn);
  return asBaseUnits((bal > 0n ? bal : 0n).toString());
}

async function save(db: Db, vaultAccountId: string, state: DemoVaultState, withdrawn?: string) {
  await db
    .update(demoVaults)
    .set(withdrawn === undefined ? { state } : { state, withdrawn })
    .where(eq(demoVaults.vaultAccountId, vaultAccountId));
}

/** Applies an owner transaction with the contract's rules (ARCHITECTURE §3.3). */
export async function applyOwnerTx(db: Db, vaultAccountId: string, tx: OwnerTx): Promise<VaultState> {
  if (tx.receiverId !== vaultAccountId) throw new DemoRuleError("Transaction is for a different vault");
  const { row, state } = await loadDemoVault(db, vaultAccountId);
  let s = { ...state };
  let withdrawn = BigInt(row.withdrawn);
  for (const { params } of tx.actions) {
    const args = params.args as Record<string, unknown>;
    switch (params.methodName) {
      case "set_plan": {
        const amount = String(args.amount_per_run ?? "");
        const interval = Number(args.interval_s);
        const cost = Number(args.max_cost_bps);
        if (!/^\d+$/.test(amount) || BigInt(amount) <= 0n) throw new DemoRuleError("amount_per_run must be positive");
        if (!(interval >= 60)) throw new DemoRuleError("interval_s too short");
        if (!(cost > 0 && cost <= 5_000)) throw new DemoRuleError("max_cost_bps out of range");
        s = { ...s, targetAsset: String(args.target_asset), destinationAddress: String(args.destination_address), amountPerRun: amount, intervalS: interval, maxCostBps: cost };
        break;
      }
      case "resume":
        if (!s.targetAsset || !s.destinationAddress) throw new DemoRuleError("Set a plan first");
        s.paused = false;
        break;
      case "pause":
        s.paused = true;
        break;
      case "withdraw": {
        const amount = BigInt(String(args.amount ?? "0"));
        const balance = BigInt(await demoBalance(db, vaultAccountId));
        if (amount <= 0n || amount > balance) throw new DemoRuleError("Withdraw amount is more than the vault holds");
        withdrawn += amount;
        break;
      }
      case "recover_token":
        throw new DemoRuleError("The demo vault holds no other tokens");
      default:
        throw new DemoRuleError(`Unknown method ${params.methodName}`);
    }
  }
  await save(db, vaultAccountId, s, withdrawn.toString());
  return toVaultState(await ownerOf(db, row.userId), s);
}

async function ownerOf(db: Db, userId: string): Promise<string> {
  return (await db.select({ a: users.nearAccountId }).from(users).where(eq(users.id, userId)).limit(1))[0]?.a ?? "demo";
}

export function demoVaultClient(db: Db): VaultClient {
  return {
    async findVault(owner) {
      return (await db.select({ v: users.vaultAccountId }).from(users).where(eq(users.nearAccountId, owner)).limit(1))[0]?.v ?? null;
    },
    async createVaultFor() {
      throw new DemoRuleError("Demo vaults are created when the demo starts");
    },
    async getState(vaultAccountId) {
      const { row, state } = await loadDemoVault(db, vaultAccountId);
      return toVaultState(await ownerOf(db, row.userId), state);
    },
    usdcBalance: (vaultAccountId) => demoBalance(db, vaultAccountId),
    async executeBuy() {
      return { txHash: `demo-tx-${Date.now()}` };
    },
  };
}

export { save as saveDemoVaultState };
