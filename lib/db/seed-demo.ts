/**
 * Demo data: a fresh fictional saver per visitor (never shared), with a weekly $100 BTC plan, two
 * deposits and three weeks of buys including one skipped for fees. Fast-forward simulates the next
 * 30 days of the plan. Everything is marked demo and never touches real services.
 * Roadmap: K7.2, K7.4
 */

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { TARGET_ASSETS, USDC_DECIMALS } from "../core/assets";
import { costSkipNote } from "../core/cost";
import { asBaseUnits } from "../core/money";
import type { DemoVaultState } from "../near/demo";
import { DemoRuleError, demoBalance, loadDemoVault, saveDemoVaultState } from "../near/demo";
import { FALLBACK_TOKENS, fromBase, modelCostBps, toBase } from "../oneclick/demo";
import type { Db } from "./client";
import { buys, demoVaults, fundingAttempts, users, type User } from "./schema";

const DAY_S = 86_400;
const BTC = TARGET_ASSETS.btc;
/** BIP-173 test vector — a valid address nobody's funds depend on. */
export const DEMO_BTC_ADDRESS = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";
const priceOf = (assetId: string) => FALLBACK_TOKENS.find((t) => t.assetId === assetId)?.priceUsd ?? 1;

const usdc = (dollars: number) => toBase(dollars, USDC_DECIMALS);
const fakeHash = (kind: string) => `demo-${kind}-${randomUUID().slice(0, 12)}`;

function buyRow(userId: string, s: DemoVaultState, atS: number, amountIn: string, spikeBps = 0) {
  const usd = fromBase(amountIn, USDC_DECIMALS);
  const cost = modelCostBps(s.targetAsset!, usd, spikeBps);
  const base = {
    userId,
    quoteRef: `demo_${randomUUID()}`,
    amountIn: asBaseUnits(amountIn),
    targetAsset: s.targetAsset!,
    destinationAddress: s.destinationAddress!,
    costBps: cost,
    amountInUsd: usd.toFixed(2),
    createdAt: new Date(atS * 1000),
    completedAt: new Date(atS * 1000 + 8 * 60_000),
  };
  if (cost > s.maxCostBps) {
    return { ...base, status: "skipped_cost" as const, note: costSkipNote(cost, s.maxCostBps), completedAt: new Date(atS * 1000) };
  }
  const target = Object.values(TARGET_ASSETS).find((t) => t.assetId === s.targetAsset)!;
  const amountOut = toBase((usd * (1 - cost / 10_000)) / priceOf(target.assetId), target.decimals);
  return { ...base, status: "success" as const, amountOut, depositAddress: fakeHash("dep"), nearTxHash: fakeHash("near"), destinationTxHash: fakeHash("dest") };
}

async function writeHistory(db: Db, userId: string, nowS: number): Promise<DemoVaultState> {
  const state: DemoVaultState = {
    targetAsset: BTC.assetId,
    destinationAddress: DEMO_BTC_ADDRESS,
    amountPerRun: usdc(100),
    intervalS: 7 * DAY_S,
    maxCostBps: 300,
    paused: false,
    lastRunAtS: nowS - 6 * DAY_S,
  };
  const deposit = (daysAgo: number, originAsset: string, amountIn: string, dollars: number) => ({
    userId,
    originAsset,
    amountIn: asBaseUnits(amountIn),
    expectedOut: usdc(dollars),
    refundTo: "demo-refund-address",
    depositAddress: fakeHash("fund"),
    quoteDeadline: new Date((nowS - daysAgo * DAY_S + 1800) * 1000),
    quoteSignature: "demo",
    quoteRaw: { demo: true },
    status: "credited" as const,
    createdAt: new Date((nowS - daysAgo * DAY_S) * 1000),
    updatedAt: new Date((nowS - daysAgo * DAY_S) * 1000),
  });
  await db.insert(fundingAttempts).values([
    deposit(28, "nep141:sol.omft.near", "10600000000", 997.1),
    deposit(9, "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near", "300000000", 299.6),
  ]);
  await db.insert(buys).values([
    buyRow(userId, state, nowS - 27 * DAY_S, usdc(100)),
    buyRow(userId, state, nowS - 20 * DAY_S, usdc(100), 220), // fee spike → skipped, nothing spent
    buyRow(userId, state, nowS - 13 * DAY_S, usdc(100)),
    buyRow(userId, state, nowS - 6 * DAY_S, usdc(100)),
  ]);
  return state;
}

/** Creates a new demo saver with a vault and history. */
export async function seedDemoUser(db: Db, now = Date.now()): Promise<User> {
  const id = randomUUID().slice(0, 8);
  const [user] = await db
    .insert(users)
    .values({ nearAccountId: `saver-${id}.demo`, vaultAccountId: `v${id}.vaults.demo`, isDemo: true })
    .returning();
  const state = await writeHistory(db, user!.id, Math.floor(now / 1000));
  await db.insert(demoVaults).values({ vaultAccountId: user!.vaultAccountId!, userId: user!.id, state });
  return user!;
}

/** Back to the starting story for this demo user. */
export async function resetDemoUser(db: Db, user: User, now = Date.now()): Promise<void> {
  if (!user.isDemo || !user.vaultAccountId) throw new DemoRuleError("Not a demo user");
  await db.delete(buys).where(eq(buys.userId, user.id));
  await db.delete(fundingAttempts).where(eq(fundingAttempts.userId, user.id));
  const state = await writeHistory(db, user.id, Math.floor(now / 1000));
  await db.update(demoVaults).set({ state, withdrawn: "0" }).where(and(eq(demoVaults.vaultAccountId, user.vaultAccountId), eq(demoVaults.userId, user.id)));
}

/**
 * Simulates the plan for the next `days`: one buy per interval while there's money, the same cost check
 * as the real scheduler, and one fee spike so a skip shows up. Rows are dated in the future.
 */
export async function fastForward(db: Db, user: User, days = 30, now = Date.now()): Promise<{ bought: number; skipped: number; stoppedEmpty: boolean }> {
  if (!user.isDemo || !user.vaultAccountId) throw new DemoRuleError("Not a demo user");
  const { state } = await loadDemoVault(db, user.vaultAccountId);
  if (state.paused || !state.targetAsset || !state.destinationAddress) throw new DemoRuleError("Resume your plan first: a paused vault doesn't buy");
  const nowS = Math.floor(now / 1000);
  const endS = nowS + days * DAY_S;
  let t = Math.max(nowS, state.lastRunAtS + state.intervalS);
  let balance = BigInt(await demoBalance(db, user.vaultAccountId));
  let bought = 0;
  let skipped = 0;
  let runs = 0;
  let stoppedEmpty = false;
  const rows = [];
  while (t <= endS && runs < 200) {
    if (balance < BigInt(usdc(1))) {
      stoppedEmpty = true;
      break;
    }
    const amount = balance < BigInt(state.amountPerRun) ? balance.toString() : state.amountPerRun;
    const row = buyRow(user.id, state, t, amount, runs === 1 ? 260 : 0);
    rows.push(row);
    if (row.status === "success") {
      balance -= BigInt(amount);
      bought++;
      state.lastRunAtS = t;
      t += state.intervalS;
    } else {
      skipped++;
      t += Math.max(15 * 60, Math.min(state.intervalS, DAY_S)); // retry the next day, like the scheduler's backoff
    }
    runs++;
  }
  if (rows.length) await db.insert(buys).values(rows);
  await saveDemoVaultState(db, user.vaultAccountId, state);
  return { bought, skipped, stoppedEmpty };
}

