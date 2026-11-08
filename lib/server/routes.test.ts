import { Account, KeyPair, KeyPairSigner } from "near-api-js";
import { signMessage } from "near-api-js/nep413";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as buysRoute from "@/app/api/buys/route";
import * as csvRoute from "@/app/api/export.csv/route";
import * as fundQuoteRoute from "@/app/api/fund/quote/route";
import * as fundListRoute from "@/app/api/fund/route";
import * as fundStatusRoute from "@/app/api/fund/[id]/status/route";
import * as submitTxRoute from "@/app/api/fund/[id]/submit-tx/route";
import * as onboardRoute from "@/app/api/onboard/route";
import * as planPreviewRoute from "@/app/api/plan/preview/route";
import * as sessionRoute from "@/app/api/session/route";
import * as storageCheckRoute from "@/app/api/storage-check/route";
import * as tokensRoute from "@/app/api/tokens/route";
import * as vaultRoute from "@/app/api/vault/route";
import { USDC_ON_NEAR } from "../core/assets";
import { asBaseUnits } from "../core/money";
import type { OneClickStatus } from "../core/status";
import type { QuoteSummary, VaultState } from "../core/types";
import { createDb, type Db } from "../db/client";
import { insertBuy } from "../db/queries/buys";
import { getUserByAccount } from "../db/queries/users";
import { setServicesForTest, type Services } from "./adapters";
import { resetRateLimits } from "./rateLimit";

// Roadmap: K4.7 — real handlers, in-memory PGlite, fake 1Click/NEAR
const BASE = "http://localhost:3000";
const VAULT = "vabc0123456789def.factory.stack.near";

let db: Db;
let depositCounter = 0;
let oneClickStatus: OneClickStatus = "PENDING_DEPOSIT";

const quote = (over: Partial<QuoteSummary>): QuoteSummary => ({
  dry: true,
  originAsset: USDC_ON_NEAR,
  refundTo: VAULT,
  depositAddress: null,
  amountIn: asBaseUnits("10000000"),
  amountOut: asBaseUnits("9900000"),
  minAmountOut: asBaseUnits("9800000"),
  timeEstimateS: 30,
  amountInUsd: "10.00",
  amountOutUsd: "9.90",
  recipient: VAULT,
  destinationAsset: USDC_ON_NEAR,
  deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
  signature: "ed25519:sig",
  raw: { fake: true },
  ...over,
});

const vaultState: VaultState = {
  owner: "alice.near",
  keeper: "keeper.near",
  usdc: "usdc.near",
  targetAsset: null,
  destinationAddress: null,
  amountPerRun: asBaseUnits("0"),
  intervalS: 0,
  maxCostBps: 0,
  paused: true,
  lastRunAtS: 0,
  nextRunAtS: null,
};

const fakes = {
  fundingQuote: vi.fn(async (input: { refundTo: string; vault: string }, { dry }: { dry: boolean }) =>
    quote({ dry, refundTo: input.refundTo, recipient: input.vault, depositAddress: dry ? null : `dep-${++depositCounter}` }),
  ),
  buyQuote: vi.fn(async (input: { vault: VaultState; vaultAccountId: string; amountIn: string }) =>
    quote({ amountIn: asBaseUnits(input.amountIn), refundTo: input.vaultAccountId, recipient: input.vault.destinationAddress!, destinationAsset: input.vault.targetAsset!, amountInUsd: "10.00", amountOutUsd: "8.46" }),
  ),
  submitDepositTx: vi.fn(async () => {}),
  createVaultFor: vi.fn(async () => ({ vaultAccountId: VAULT, txHash: "TX" })),
};

function services(over: Partial<Services> = {}): Services {
  return {
    db,
    quotes: { fundingQuote: fakes.fundingQuote, buyQuote: fakes.buyQuote } as Services["quotes"],
    status: { getStatus: async () => ({ status: oneClickStatus, raw: {} }), submitDepositTx: fakes.submitDepositTx },
    listTokens: async () => [{ assetId: "nep141:sol.omft.near", symbol: "SOL", blockchain: "sol", decimals: 9, priceUsd: 95 }],
    near: { viewAccessKey: vi.fn(async () => ({ permission: "FullAccess" })), callFunction: vi.fn() } as never,
    vault: {
      findVault: async () => null,
      createVaultFor: fakes.createVaultFor,
      getState: async () => vaultState,
      usdcBalance: async () => asBaseUnits("500000000"),
      executeBuy: vi.fn(),
    },
    ...over,
  };
}

beforeEach(async () => {
  db = createDb({ pgliteDataDir: "memory://" });
  await db.migrate();
  setServicesForTest(services());
  resetRateLimits();
  oneClickStatus = "PENDING_DEPOSIT";
  vi.clearAllMocks();
});
afterAll(() => setServicesForTest(null));

const cookiesOf = (res: Response) => res.headers.getSetCookie().map((c) => c.split(";")[0]!).filter((c) => !c.endsWith("="));
const req = (path: string, init: { method?: string; cookie?: string; body?: unknown } = {}) =>
  new Request(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", ...(init.cookie ? { cookie: init.cookie } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function signIn(accountId = "alice.near"): Promise<string> {
  const challengeRes = await sessionRoute.GET();
  const challenge = (await challengeRes.json()) as { nonce: string; message: string; recipient: string };
  const challengeCookie = cookiesOf(challengeRes).join("; ");
  const key = KeyPair.fromRandom("ed25519");
  const account = new Account(accountId, "http://127.0.0.1:1", new KeyPairSigner(key));
  const signed = await signMessage({
    signerAccount: account,
    payload: { message: challenge.message, recipient: challenge.recipient, nonce: Uint8Array.from(Buffer.from(challenge.nonce, "base64")) },
  });
  const res = await sessionRoute.POST(
    req("/api/session", {
      method: "POST",
      cookie: challengeCookie,
      body: { accountId, publicKey: key.getPublicKey().toString(), signature: Buffer.from(signed.signature).toString("base64"), message: challenge.message, nonce: challenge.nonce },
    }),
  );
  expect(res.status).toBe(200);
  return cookiesOf(res).join("; ");
}

describe("session (K4.1)", () => {
  it("signs in with a valid NEP-413 signature and creates the user", async () => {
    const cookie = await signIn();
    expect(cookie).toContain("stack_session=");
    expect(await getUserByAccount(db, "alice.near")).toBeDefined();
  });

  it("rejects a missing challenge, a swapped nonce and a non-full-access key", async () => {
    const body = { accountId: "alice.near", publicKey: "ed25519:x", signature: "AA==", message: "Sign in to Stack", nonce: "AA==" };
    expect((await sessionRoute.POST(req("/api/session", { method: "POST", body }))).status).toBe(401);

    const ch = await sessionRoute.GET();
    const cookie = cookiesOf(ch).join("; ");
    expect((await sessionRoute.POST(req("/api/session", { method: "POST", cookie, body }))).status).toBe(401);

    setServicesForTest(services({ near: { viewAccessKey: async () => ({ permission: { FunctionCall: {} } }), callFunction: vi.fn() } as never }));
    await expect(signIn()).rejects.toThrow();
  });

  it("requires a session for user routes", async () => {
    expect((await vaultRoute.GET(req("/api/vault"))).status).toBe(401);
    expect((await onboardRoute.POST(req("/api/onboard", { method: "POST", cookie: "stack_session=forged.token" }))).status).toBe(401);
  });

  it("signs out", async () => {
    const res = await sessionRoute.DELETE(req("/api/session", { method: "DELETE" }));
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("signing out revokes the session everywhere, even if the cookie was copied (K13.4)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-11-08T10:00:00Z"));
      const stolen = await signIn();
      expect((await vaultRoute.GET(req("/api/vault", { cookie: stolen }))).status).toBe(200);

      vi.setSystemTime(new Date("2026-11-08T10:05:00Z"));
      expect((await sessionRoute.DELETE(req("/api/session", { method: "DELETE", cookie: stolen }))).status).toBe(200);
      expect((await vaultRoute.GET(req("/api/vault", { cookie: stolen }))).status).toBe(401);

      vi.setSystemTime(new Date("2026-11-08T10:06:00Z"));
      const fresh = await signIn();
      expect((await vaultRoute.GET(req("/api/vault", { cookie: fresh }))).status).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("onboard + vault (K4.2, K4.3)", () => {
  it("creates the vault once and reports state + balance", async () => {
    const cookie = await signIn();
    expect(await (await vaultRoute.GET(req("/api/vault", { cookie }))).json()).toMatchObject({ vaultAccountId: null });

    const first = await onboardRoute.POST(req("/api/onboard", { method: "POST", cookie }));
    expect(first.status).toBe(201);
    const second = await onboardRoute.POST(req("/api/onboard", { method: "POST", cookie }));
    expect(await second.json()).toMatchObject({ vaultAccountId: VAULT, created: false });
    expect(fakes.createVaultFor).toHaveBeenCalledTimes(1);

    const v = await (await vaultRoute.GET(req("/api/vault", { cookie }))).json();
    expect(v).toMatchObject({ vaultAccountId: VAULT, usdcBalanceFormatted: "500", state: { paused: true } });
  });

  it("returns 503 with guidance when the keeper isn't configured", async () => {
    setServicesForTest(services({ vault: null }));
    const cookie = await signIn();
    const res = await onboardRoute.POST(req("/api/onboard", { method: "POST", cookie }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/check-env/);
  });

  it("serves the token list publicly", async () => {
    expect((await (await tokensRoute.GET()).json()).tokens[0].symbol).toBe("SOL");
  });
});

describe("funding (K4.4)", () => {
  async function onboarded() {
    const cookie = await signIn();
    await onboardRoute.POST(req("/api/onboard", { method: "POST", cookie }));
    return cookie;
  }
  const body = (dry: boolean) => ({ originAsset: "nep141:sol.omft.near", amountIn: "1000000000", refundTo: "So1Refund", dry });

  it("needs a vault first", async () => {
    const cookie = await signIn();
    expect((await fundQuoteRoute.POST(req("/api/fund/quote", { method: "POST", cookie, body: body(true) }))).status).toBe(409);
  });

  it("previews without storing, then stores a real attempt with its deposit address", async () => {
    const cookie = await onboarded();
    const dry = await (await fundQuoteRoute.POST(req("/api/fund/quote", { method: "POST", cookie, body: body(true) }))).json();
    expect(dry).toMatchObject({ dry: true });
    expect(dry.attempt).toBeUndefined();

    const res = await fundQuoteRoute.POST(req("/api/fund/quote", { method: "POST", cookie, body: body(false) }));
    expect(res.status).toBe(201);
    const real = await res.json();
    expect(real.attempt.depositAddress).toMatch(/^dep-/);
    expect(fakes.fundingQuote).toHaveBeenLastCalledWith(expect.objectContaining({ vault: VAULT, refundTo: "So1Refund" }), { dry: false });
  });

  it("validates the body and rate-limits", async () => {
    const cookie = await onboarded();
    expect((await fundQuoteRoute.POST(req("/api/fund/quote", { method: "POST", cookie, body: { ...body(true), amountIn: "1.5" } }))).status).toBe(400);
    let last = 0;
    for (let i = 0; i < 21; i++) last = (await fundQuoteRoute.POST(req("/api/fund/quote", { method: "POST", cookie, body: body(true) }))).status;
    expect(last).toBe(429);
  });

  it("refreshes status from 1Click, expires stale quotes, and scopes to the owner", async () => {
    const cookie = await onboarded();
    const { attempt } = await (await fundQuoteRoute.POST(req("/api/fund/quote", { method: "POST", cookie, body: body(false) }))).json();

    oneClickStatus = "SUCCESS";
    expect(await (await fundStatusRoute.GET(req(`/api/fund/${attempt.id}/status`, { cookie }), params(attempt.id))).json()).toMatchObject({ status: "credited" });

    const other = await signIn("bob.near");
    expect((await fundStatusRoute.GET(req(`/api/fund/${attempt.id}/status`, { cookie: other }), params(attempt.id))).status).toBe(404);
  });

  it("marks a pending attempt past its deadline as expired", async () => {
    const cookie = await onboarded();
    fakes.fundingQuote.mockImplementationOnce(async (input, { dry }) =>
      quote({ dry, refundTo: input.refundTo, recipient: input.vault, depositAddress: "dep-old", deadline: new Date(Date.now() - 60_000).toISOString() }),
    );
    const { attempt } = await (await fundQuoteRoute.POST(req("/api/fund/quote", { method: "POST", cookie, body: body(false) }))).json();
    oneClickStatus = "PENDING_DEPOSIT";
    expect(await (await fundStatusRoute.GET(req(`/api/fund/${attempt.id}/status`, { cookie }), params(attempt.id))).json()).toMatchObject({ status: "expired" });
  });

  it("lists the user's own funding attempts", async () => {
    const cookie = await onboarded();
    await fundQuoteRoute.POST(req("/api/fund/quote", { method: "POST", cookie, body: body(false) }));
    const mine = await (await fundListRoute.GET(req("/api/fund", { cookie }))).json();
    expect(mine.attempts).toHaveLength(1);
    const other = await signIn("bob.near");
    expect((await (await fundListRoute.GET(req("/api/fund", { cookie: other }))).json()).attempts).toHaveLength(0);
  });

  it("forwards the deposit tx hash", async () => {
    const cookie = await onboarded();
    const { attempt } = await (await fundQuoteRoute.POST(req("/api/fund/quote", { method: "POST", cookie, body: body(false) }))).json();
    const res = await submitTxRoute.POST(req(`/api/fund/${attempt.id}/submit-tx`, { method: "POST", cookie, body: { txHash: "5xYzTxHash123" } }), params(attempt.id));
    expect(res.status).toBe(200);
    expect(fakes.submitDepositTx).toHaveBeenCalledWith(attempt.depositAddress, "5xYzTxHash123");
  });
});

describe("plan preview (K4.5)", () => {
  it("shows that a $10 BTC buy is mostly fees, refunding to the user's own account before a vault exists", async () => {
    const cookie = await signIn();
    const res = await planPreviewRoute.POST(req("/api/plan/preview", { method: "POST", cookie, body: { target: "btc", amountPerRun: "10000000" } }));
    const p = await res.json();
    expect(p).toMatchObject({ target: "btc", costBps: 1540, belowSuggestedMin: true, suggestedMinPerRunUsd: 100 });
    expect(fakes.buyQuote).toHaveBeenLastCalledWith(expect.objectContaining({ vaultAccountId: "alice.near" }), { dry: true });
  });

  it("rejects unknown targets", async () => {
    const cookie = await signIn();
    expect((await planPreviewRoute.POST(req("/api/plan/preview", { method: "POST", cookie, body: { target: "doge", amountPerRun: "1" } }))).status).toBe(400);
  });
});

describe("wNEAR registration check (K8.2)", () => {
  it("reports whether a NEAR account can receive wNEAR", async () => {
    const callFunction = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ total: "1250000000000000000000", available: "0" });
    setServicesForTest(services({ near: { viewAccessKey: vi.fn(async () => ({ permission: "FullAccess" })), callFunction } as never }));
    const cookie = await signIn();
    expect(await (await storageCheckRoute.GET(req("/api/storage-check?account=bob.near", { cookie }))).json()).toMatchObject({ registered: false });
    expect(await (await storageCheckRoute.GET(req("/api/storage-check?account=bob.near", { cookie }))).json()).toMatchObject({ registered: true });
    expect(callFunction).toHaveBeenLastCalledWith({ contractId: "wrap.near", method: "storage_balance_of", args: { account_id: "bob.near" } });
    expect((await storageCheckRoute.GET(req("/api/storage-check?account=Bad..Name", { cookie }))).status).toBe(400);
  });
});

describe("history (K4.6)", () => {
  it("lists buys and exports a CSV with USD values", async () => {
    const cookie = await signIn();
    const user = (await getUserByAccount(db, "alice.near"))!;
    await insertBuy(db, {
      userId: user.id,
      quoteRef: "q1",
      amountIn: asBaseUnits("100000000"),
      targetAsset: "nep141:btc.omft.near",
      destinationAddress: "bc1q",
      amountOut: asBaseUnits("121000"),
      amountInUsd: "99.96",
      costBps: 161,
      status: "success",
    });
    const list = await (await buysRoute.GET(req("/api/buys", { cookie }))).json();
    expect(list.buys[0]).toMatchObject({ quoteRef: "q1", costBps: 161 });

    const csv = await csvRoute.GET(req("/api/export.csv", { cookie }));
    expect(csv.headers.get("content-type")).toContain("text/csv");
    const text = await csv.text();
    expect(text.split("\r\n")[0]).toBe("date_utc,type,status,amount_in,asset_in,amount_out,asset_out,usd_value_in,cost_bps,deposit_address,near_tx,destination_tx");
    expect(text).toContain(",buy,success,100,USDC,0.00121,BTC,99.96,161,");
  });
});
