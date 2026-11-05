import { beforeEach, describe, expect, it, vi } from "vitest";
import { USDC_ON_NEAR } from "../lib/core/assets";
import { asBaseUnits } from "../lib/core/money";
import type { OneClickStatus } from "../lib/core/status";
import type { QuoteSummary, VaultState } from "../lib/core/types";
import { createDb, type Db } from "../lib/db/client";
import { insertBuy, listBuysByUser } from "../lib/db/queries/buys";
import { getFundingAttempt, insertFundingAttempt } from "../lib/db/queries/fundingAttempts";
import { setVault, upsertUser } from "../lib/db/queries/users";
import { checkKeeperBalance } from "./alerts";
import type { Logger, WorkerDeps } from "./deps";
import { expireQuotes } from "./expireQuotes";
import { pollBuys } from "./pollBuys";
import { pollFunding } from "./pollFunding";
import { startLoops } from "./runner";
import { RETRY_BACKOFF_MS, scheduleBuys } from "./scheduleBuys";

// Roadmap: K5.1–K5.5
const VAULT = "vabc0123456789def.factory.stack.near";
const NOW = Date.parse("2026-11-10T12:00:00Z");
const DEST = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";

let db: Db;
let userId: string;
let statusOf: (depositAddress: string) => OneClickStatus;
let rawStatus: unknown;
let state: VaultState;
let balance: string;

const logs: { level: string; msg: string }[] = [];
const log: Logger = {
  info: (msg) => logs.push({ level: "info", msg }),
  warn: (msg) => logs.push({ level: "warn", msg }),
  alert: (msg) => logs.push({ level: "alert", msg }),
};

const goodQuote = (amountIn: string, over: Partial<QuoteSummary> = {}): QuoteSummary => ({
  dry: false,
  originAsset: USDC_ON_NEAR,
  refundTo: VAULT,
  depositAddress: "dep-buy-1",
  amountIn: asBaseUnits(amountIn),
  amountOut: asBaseUnits("121000"),
  minAmountOut: asBaseUnits("119000"),
  timeEstimateS: 465,
  amountInUsd: "100.00",
  amountOutUsd: "98.40",
  recipient: DEST,
  destinationAsset: "nep141:btc.omft.near",
  deadline: new Date(NOW + 600_000).toISOString(),
  signature: "ed25519:sig",
  raw: {},
  ...over,
});

const fakes = {
  buyQuote: vi.fn(async (input: { amountIn: string }) => goodQuote(input.amountIn)),
  executeBuy: vi.fn(async () => ({ txHash: "NEARTX" })),
  submitDepositTx: vi.fn(async () => {}),
};

function deps(over: Partial<WorkerDeps> = {}): WorkerDeps {
  return {
    db,
    quotes: { fundingQuote: vi.fn(), buyQuote: fakes.buyQuote } as never,
    status: { getStatus: async (a: string) => ({ status: statusOf(a), raw: rawStatus }), submitDepositTx: fakes.submitDepositTx },
    vault: {
      findVault: vi.fn(),
      createVaultFor: vi.fn(),
      getState: async () => state,
      usdcBalance: async () => asBaseUnits(balance),
      executeBuy: fakes.executeBuy,
    },
    near: null,
    keeperAccountId: null,
    now: () => NOW,
    log,
    ...over,
  };
}

beforeEach(async () => {
  db = createDb({ pgliteDataDir: "memory://" });
  await db.migrate();
  const u = await upsertUser(db, "alice.near");
  await setVault(db, u.id, VAULT);
  userId = u.id;
  statusOf = () => "PENDING_DEPOSIT";
  rawStatus = {};
  balance = "500000000";
  state = {
    owner: "alice.near",
    keeper: "keeper.near",
    usdc: "usdc.near",
    targetAsset: "nep141:btc.omft.near",
    destinationAddress: DEST,
    amountPerRun: asBaseUnits("100000000"),
    intervalS: 86_400,
    maxCostBps: 300,
    paused: false,
    lastRunAtS: NOW / 1000 - 86_400,
    nextRunAtS: NOW / 1000,
  };
  logs.length = 0;
  vi.clearAllMocks();
});

describe("scheduleBuys (K5.3)", () => {
  it("runs the full chain: quote → cost → plan match → execute_buy → submit", async () => {
    const out = await scheduleBuys(deps());
    expect(out.get(userId)).toBe("sent");
    expect(fakes.executeBuy).toHaveBeenCalledWith({ vaultAccountId: VAULT, quoteRef: expect.stringMatching(/^b_/), depositAddress: "dep-buy-1", amount: "100000000" });
    expect(fakes.submitDepositTx).toHaveBeenCalledWith("dep-buy-1", "NEARTX");
    const [b] = await listBuysByUser(db, userId);
    expect(b).toMatchObject({ status: "sent", nearTxHash: "NEARTX", costBps: 160, depositAddress: "dep-buy-1" });
  });

  it("buys only what the vault holds when the balance is below one run", async () => {
    balance = "40000000";
    await scheduleBuys(deps());
    expect(fakes.executeBuy).toHaveBeenCalledWith(expect.objectContaining({ amount: "40000000" }));
  });

  it("does nothing when not due, paused, or empty", async () => {
    state = { ...state, nextRunAtS: NOW / 1000 + 60 };
    expect((await scheduleBuys(deps())).get(userId)).toBe("not_due");
    state = { ...state, nextRunAtS: NOW / 1000, paused: true };
    expect((await scheduleBuys(deps())).get(userId)).toBe("not_due");
    state = { ...state, paused: false };
    balance = "0";
    expect((await scheduleBuys(deps())).get(userId)).toBe("empty");
    expect(fakes.buyQuote).not.toHaveBeenCalled();
  });

  it("skips (and records why) when the cost is over the limit", async () => {
    fakes.buyQuote.mockImplementationOnce(async (i) => goodQuote(i.amountIn, { amountInUsd: "10.00", amountOutUsd: "8.46" }));
    expect((await scheduleBuys(deps())).get(userId)).toBe("skipped_cost");
    expect(fakes.executeBuy).not.toHaveBeenCalled();
    const [b] = await listBuysByUser(db, userId);
    expect(b).toMatchObject({ status: "skipped_cost", costBps: 1540, note: "Fees were 15.40%, above your 3.00% limit" });
  });

  it("refuses and alerts when the quote doesn't match the on-chain plan", async () => {
    fakes.buyQuote.mockImplementationOnce(async (i) => goodQuote(i.amountIn, { recipient: "bc1qattacker" }));
    expect((await scheduleBuys(deps())).get(userId)).toBe("refused");
    expect(fakes.executeBuy).not.toHaveBeenCalled();
    expect((await listBuysByUser(db, userId))[0]?.note).toBe("refused: recipient differs from plan");
    expect(logs.some((l) => l.level === "alert" && l.msg === "buy quote refused")).toBe(true);
  });

  it("records no_quote when 1Click can't quote", async () => {
    fakes.buyQuote.mockRejectedValueOnce(new Error("No quote available"));
    expect((await scheduleBuys(deps())).get(userId)).toBe("no_quote");
    expect((await listBuysByUser(db, userId))[0]).toMatchObject({ status: "no_quote", note: "No quote available" });
  });

  it("marks the row failed (and alerts) when execute_buy fails", async () => {
    fakes.executeBuy.mockRejectedValueOnce(new Error("Buy transfer failed on-chain (tx X)"));
    expect((await scheduleBuys(deps())).get(userId)).toBe("failed");
    expect((await listBuysByUser(db, userId))[0]).toMatchObject({ status: "failed", note: "Buy transfer failed on-chain (tx X)" });
  });

  it("waits while a buy is in flight, and backs off after a skip", async () => {
    await insertBuy(db, { userId, quoteRef: "inflight", amountIn: asBaseUnits("1"), targetAsset: "t", destinationAddress: "d", status: "sent" });
    expect((await scheduleBuys(deps())).get(userId)).toBe("in_flight");

    db = createDb({ pgliteDataDir: "memory://" });
    await db.migrate();
    const u = await upsertUser(db, "alice.near");
    await setVault(db, u.id, VAULT);
    userId = u.id;
    fakes.buyQuote.mockImplementationOnce(async (i) => goodQuote(i.amountIn, { amountInUsd: "10.00", amountOutUsd: "8.46" }));
    expect((await scheduleBuys(deps({ now: () => NOW + 1_000 }))).get(userId)).toBe("skipped_cost");
    expect((await scheduleBuys(deps({ now: () => NOW + 60_000 }))).get(userId)).toBe("backoff");
    expect((await scheduleBuys(deps({ now: () => NOW + 1_000 + RETRY_BACKOFF_MS + 1 }))).get(userId)).toBe("sent");
  });

  it("does nothing without a keeper", async () => {
    expect((await scheduleBuys(deps({ vault: null }))).size).toBe(0);
  });
});

describe("pollBuys (K5.4)", () => {
  async function sentBuy() {
    return insertBuy(db, { userId, quoteRef: "q1", amountIn: asBaseUnits("100000000"), targetAsset: "nep141:btc.omft.near", destinationAddress: DEST, depositAddress: "dep-buy-1", amountOut: asBaseUnits("121000"), status: "sent" });
  }

  it("finalises a successful buy with the actual amount and destination tx", async () => {
    await sentBuy();
    statusOf = () => "SUCCESS";
    rawStatus = { swapDetails: { amountOut: "120500", destinationChainTxHashes: [{ hash: "btc-tx-1", explorerUrl: "" }] } };
    await pollBuys(deps());
    expect((await listBuysByUser(db, userId))[0]).toMatchObject({ status: "success", amountOut: "120500", destinationTxHash: "btc-tx-1" });
  });

  it("records refunds back to the vault with the reason", async () => {
    await sentBuy();
    statusOf = () => "REFUNDED";
    rawStatus = { swapDetails: { refundReason: "price moved" } };
    await pollBuys(deps());
    expect((await listBuysByUser(db, userId))[0]).toMatchObject({ status: "refunded", note: "refunded to the vault: price moved" });
  });

  it("keeps polling processing buys", async () => {
    await sentBuy();
    statusOf = () => "PROCESSING";
    await pollBuys(deps());
    const [b] = await listBuysByUser(db, userId);
    expect(b).toMatchObject({ status: "processing", completedAt: null });
  });
});

describe("pollFunding + expireQuotes (K5.2, K5.5)", () => {
  const attempt = (depositAddress: string, deadline: number) =>
    insertFundingAttempt(db, {
      userId,
      originAsset: "nep141:sol.omft.near",
      amountIn: asBaseUnits("1000000000"),
      expectedOut: asBaseUnits("95000000"),
      refundTo: "So1",
      depositAddress,
      quoteDeadline: new Date(deadline),
      quoteSignature: "s",
      quoteRaw: {},
    });

  it("credits, flags underpaid, expires, and keeps going past errors", async () => {
    const ok = await attempt("dep-ok", NOW + 600_000);
    const short = await attempt("dep-short", NOW + 600_000);
    const stale = await attempt("dep-stale", NOW - 1);
    const broken = await attempt("dep-broken", NOW + 600_000);
    statusOf = (a) => {
      if (a === "dep-broken") throw new Error("1Click down");
      return a === "dep-ok" ? "SUCCESS" : a === "dep-short" ? "INCOMPLETE_DEPOSIT" : "PENDING_DEPOSIT";
    };
    await pollFunding(deps());
    expect((await getFundingAttempt(db, ok.id, userId))?.status).toBe("credited");
    expect((await getFundingAttempt(db, short.id, userId))?.status).toBe("underpaid");
    expect((await getFundingAttempt(db, stale.id, userId))?.status).toBe("expired");
    expect((await getFundingAttempt(db, broken.id, userId))?.status).toBe("awaiting_deposit");
    expect(logs.some((l) => l.level === "alert" && l.msg === "funding underpaid")).toBe(true);
  });

  it("expires unpaid quotes without calling 1Click", async () => {
    const a = await attempt("dep-old", NOW - 1);
    const b = await attempt("dep-new", NOW + 1);
    await expireQuotes(deps());
    expect((await getFundingAttempt(db, a.id, userId))?.status).toBe("expired");
    expect((await getFundingAttempt(db, b.id, userId))?.status).toBe("awaiting_deposit");
  });
});

describe("alerts (K5.5)", () => {
  it("alerts when the keeper's NEAR balance is low", async () => {
    const near = { viewAccount: vi.fn(async () => ({ amount: 5n * 10n ** 23n })) };
    expect(await checkKeeperBalance(deps({ near: near as never, keeperAccountId: "keeper.near" }))).toBe(5n * 10n ** 23n);
    expect(logs.some((l) => l.level === "alert")).toBe(true);
    logs.length = 0;
    near.viewAccount.mockResolvedValueOnce({ amount: 3n * 10n ** 24n });
    await checkKeeperBalance(deps({ near: near as never, keeperAccountId: "keeper.near" }));
    expect(logs).toHaveLength(0);
  });
});

describe("runner (K5.1)", () => {
  it("never overlaps a tick, survives errors, and waits for running ticks on stop", async () => {
    let active = 0;
    let maxActive = 0;
    let calls = 0;
    const runner = startLoops(
      [
        {
          name: "slow",
          everyMs: 5,
          tick: async () => {
            calls++;
            active++;
            maxActive = Math.max(maxActive, active);
            await new Promise((r) => setTimeout(r, 30));
            active--;
            if (calls === 1) throw new Error("boom");
          },
        },
      ],
      log,
    );
    await new Promise((r) => setTimeout(r, 100));
    await runner.stop();
    expect(maxActive).toBe(1);
    expect(calls).toBeGreaterThan(1);
    expect(active).toBe(0);
    expect(logs.some((l) => l.msg === "slow tick failed")).toBe(true);
  });
});
