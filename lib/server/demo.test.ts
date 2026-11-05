import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as demoRoute from "@/app/api/demo/[action]/route";
import * as fundQuoteRoute from "@/app/api/fund/quote/route";
import * as vaultRoute from "@/app/api/vault/route";
import { planTx, pauseTx, recoverTokenTx, resumeTx, withdrawTx } from "../client/ownerTx";
import { asBaseUnits } from "../core/money";
import { createDb, type Db } from "../db/client";
import { listBuysByUser } from "../db/queries/buys";
import { listActiveFunding, insertFundingAttempt } from "../db/queries/fundingAttempts";
import { listInFlightBuys, insertBuy } from "../db/queries/buys";
import { listUsersWithVault, upsertUser } from "../db/queries/users";
import { fastForward, seedDemoUser } from "../db/seed-demo";
import { applyOwnerTx, demoBalance, demoVaultClient, DemoRuleError } from "../near/demo";
import { demoStatusAt, modelCostBps } from "../oneclick/demo";
import { setServicesForTest, type Services } from "./adapters";
import { resetRateLimits } from "./rateLimit";
import { sessionCookie } from "./session";

// Roadmap: K7.1–K7.4
let db: Db;
beforeEach(async () => {
  db = createDb({ pgliteDataDir: "memory://" });
  await db.migrate();
  resetRateLimits();
  // Real-mode services that must never be touched by a demo session.
  const untouchable = () => {
    throw new Error("real service used in demo mode");
  };
  setServicesForTest({
    db,
    quotes: { fundingQuote: untouchable, buyQuote: untouchable },
    status: { getStatus: untouchable, submitDepositTx: untouchable },
    listTokens: async () => [],
    near: null,
    vault: null,
  } as unknown as Services);
});
afterAll(() => setServicesForTest(null));

const cookieOf = (res: Response) => res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
const req = (path: string, init: { method?: string; cookie?: string; body?: unknown } = {}) =>
  new Request(`http://localhost:3000${path}`, {
    method: init.method ?? "POST",
    headers: { "content-type": "application/json", ...(init.cookie ? { cookie: init.cookie } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
const action = (a: string) => ({ params: Promise.resolve({ action: a }) });

describe("seed (K7.2)", () => {
  it("creates a private demo saver with a running plan, deposits and history", async () => {
    const u = await seedDemoUser(db);
    expect(u.isDemo).toBe(true);
    expect(await demoBalance(db, u.vaultAccountId!)).toBe("996700000"); // $997.10 + $299.60 − 3 × $100
    const rows = await listBuysByUser(db, u.id);
    expect(rows.map((b) => b.status).sort()).toEqual(["skipped_cost", "success", "success", "success"]);
    expect(rows.find((b) => b.status === "skipped_cost")?.note).toMatch(/^Fees were/);
    const state = await demoVaultClient(db).getState(u.vaultAccountId!);
    expect(state).toMatchObject({ paused: false, targetAsset: "nep141:btc.omft.near" });
  });

  it("keeps demo users out of every real worker query", async () => {
    const demo = await seedDemoUser(db);
    await insertFundingAttempt(db, { userId: demo.id, originAsset: "x", amountIn: asBaseUnits("1"), expectedOut: asBaseUnits("1"), refundTo: "r", depositAddress: "demo-1-a", quoteDeadline: new Date(Date.now() + 60_000), quoteSignature: "s", quoteRaw: {} });
    await insertBuy(db, { userId: demo.id, quoteRef: "demo-q", amountIn: asBaseUnits("1"), targetAsset: "t", destinationAddress: "d", status: "sent" });
    await upsertUser(db, "real.near");
    expect(await listUsersWithVault(db)).toHaveLength(0);
    expect(await listActiveFunding(db)).toHaveLength(0);
    expect(await listInFlightBuys(db)).toHaveLength(0);
  });
});

describe("owner actions without a wallet (K7.1)", () => {
  it("follows the contract's rules", async () => {
    const u = await seedDemoUser(db);
    const v = u.vaultAccountId!;
    expect((await applyOwnerTx(db, v, pauseTx(v))).paused).toBe(true);
    expect((await applyOwnerTx(db, v, resumeTx(v))).paused).toBe(false);
    const s = await applyOwnerTx(db, v, planTx(v, { targetAsset: "nep141:eth.omft.near", destinationAddress: "0xabc", amountPerRun: asBaseUnits("50000000"), intervalS: 86_400, maxCostBps: 200 }));
    expect(s).toMatchObject({ targetAsset: "nep141:eth.omft.near", amountPerRun: "50000000", paused: false });
    await expect(applyOwnerTx(db, v, planTx(v, { targetAsset: "a", destinationAddress: "b", amountPerRun: asBaseUnits("1"), intervalS: 59, maxCostBps: 100 }))).rejects.toThrow(/interval_s too short/);
    await expect(applyOwnerTx(db, v, withdrawTx(v, asBaseUnits("996700001")))).rejects.toThrow(DemoRuleError);
    await applyOwnerTx(db, v, withdrawTx(v, asBaseUnits("100000000")));
    expect(await demoBalance(db, v)).toBe("896700000");
    await expect(applyOwnerTx(db, v, recoverTokenTx(v, "t.near", asBaseUnits("1")))).rejects.toThrow(/no other tokens/);
    await expect(applyOwnerTx(db, v, pauseTx("someone-else.vaults.demo"))).rejects.toThrow(/different vault/);
  });
});

describe("fast-forward (K7.4)", () => {
  it("simulates the next 30 days: weekly buys, one fee-spike skip, balance spent", async () => {
    const u = await seedDemoUser(db);
    const r = await fastForward(db, u, 30);
    expect(r.bought).toBeGreaterThanOrEqual(4);
    expect(r.skipped).toBe(1);
    expect(BigInt(await demoBalance(db, u.vaultAccountId!))).toBe(996_700_000n - BigInt(r.bought) * 100_000_000n);
  });

  it("refuses while paused", async () => {
    const u = await seedDemoUser(db);
    await applyOwnerTx(db, u.vaultAccountId!, pauseTx(u.vaultAccountId!));
    await expect(fastForward(db, u, 30)).rejects.toThrow(/Resume your plan/);
  });
});

describe("demo model (K7.3)", () => {
  it("advances demo deposits with time", () => {
    const t = 1_000_000;
    const addr = `demo-${t}-abc`;
    expect([0, 25, 45, 70].map((s) => demoStatusAt(addr, t + s * 1000))).toEqual(["PENDING_DEPOSIT", "KNOWN_DEPOSIT_TX", "PROCESSING", "SUCCESS"]);
  });

  it("is calibrated on real quotes: $10 BTC ≈ 15%, $100 BTC ≈ 1.75%", () => {
    expect(modelCostBps("nep141:btc.omft.near", 10)).toBe(1525);
    expect(modelCostBps("nep141:btc.omft.near", 100)).toBe(175);
  });
});

describe("demo routes", () => {
  it("start signs in a fresh demo saver and every route then uses demo adapters", async () => {
    const start = await demoRoute.POST(req("/api/demo/start"), action("start"));
    expect(start.status).toBe(201);
    const cookie = cookieOf(start);
    expect(await (await vaultRoute.GET(req("/api/vault", { method: "GET", cookie }))).json()).toMatchObject({ demo: true, usdcBalance: "996700000" });
    const q = await fundQuoteRoute.POST(req("/api/fund/quote", { cookie, body: { originAsset: "nep141:sol.omft.near", amountIn: "2000000000", refundTo: "So1", dry: false } }));
    expect(q.status).toBe(201);
    expect((await q.json()).attempt.depositAddress).toMatch(/^demo-/);
  });

  it("applies owner-tx, fast-forward and reset for demo sessions only", async () => {
    const cookie = cookieOf(await demoRoute.POST(req("/api/demo/start"), action("start")));
    const v = (await (await vaultRoute.GET(req("/api/vault", { method: "GET", cookie }))).json()).vaultAccountId;
    expect((await demoRoute.POST(req("/api/demo/owner-tx", { cookie, body: { tx: pauseTx(v) } }), action("owner-tx"))).status).toBe(200);
    expect((await demoRoute.POST(req("/api/demo/fast-forward", { cookie }), action("fast-forward"))).status).toBe(409); // paused
    expect((await demoRoute.POST(req("/api/demo/reset", { cookie }), action("reset"))).status).toBe(200);
    expect((await demoRoute.POST(req("/api/demo/fast-forward", { cookie }), action("fast-forward"))).status).toBe(200);

    const real = await upsertUser(db, "alice.near");
    const realCookie = sessionCookie({ userId: real.id, accountId: "alice.near", demo: false }).split(";")[0];
    expect((await demoRoute.POST(req("/api/demo/reset", { cookie: realCookie }), action("reset"))).status).toBe(403);
    expect((await demoRoute.POST(req("/api/demo/nope", { cookie }), action("nope"))).status).toBe(404);
  });

  it("rejects a session whose demo flag doesn't match the user", async () => {
    const u = await seedDemoUser(db);
    const forged = sessionCookie({ userId: u.id, accountId: u.nearAccountId, demo: false }).split(";")[0];
    expect((await vaultRoute.GET(req("/api/vault", { method: "GET", cookie: forged }))).status).toBe(401);
  });
});

vi.setConfig({ testTimeout: 20_000 });
