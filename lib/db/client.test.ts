import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { asBaseUnits } from "../core/money";
import { createDb, type Db } from "./client";
import { insertBuy, listBuysByUser, listInFlightBuys, updateBuy } from "./queries/buys";
import { getFundingAttempt, insertFundingAttempt, listActiveFunding, updateFundingStatus } from "./queries/fundingAttempts";
import { getUserByAccount, listUsersWithVault, setVault, upsertUser } from "./queries/users";

// Roadmap: K0.6, K3.4 — runs the real migrations on in-memory PGlite
let db: Db;
beforeEach(async () => {
  db = createDb({ pgliteDataDir: "memory://" });
  await db.migrate();
});

const funding = (userId: string, depositAddress: string) => ({
  userId,
  originAsset: "nep141:sol.omft.near",
  amountIn: asBaseUnits("1000000000"),
  expectedOut: asBaseUnits("95000000"),
  refundTo: "So1Refund",
  depositAddress,
  quoteDeadline: new Date("2026-11-04T20:00:00Z"),
  quoteSignature: "ed25519:x",
  quoteRaw: { any: "json" },
});

describe("db", () => {
  it("runs a query on in-memory PGlite with no DATABASE_URL", async () => {
    const rows = await db.execute(sql`select 1 + 1 as two`);
    expect(JSON.stringify(rows)).toContain("2");
  });

  it("upserts users and records their vault", async () => {
    const u = await upsertUser(db, "alice.near");
    expect((await upsertUser(db, "alice.near")).id).toBe(u.id);
    expect(await listUsersWithVault(db)).toHaveLength(0);
    await setVault(db, u.id, "vabc.factory.near");
    expect((await getUserByAccount(db, "alice.near"))?.vaultAccountId).toBe("vabc.factory.near");
    expect(await listUsersWithVault(db)).toHaveLength(1);
  });

  it("tracks funding attempts until they are terminal, scoped to the user", async () => {
    const alice = await upsertUser(db, "alice.near");
    const bob = await upsertUser(db, "bob.near");
    const a = await insertFundingAttempt(db, funding(alice.id, "dep1"));
    expect(a.status).toBe("awaiting_deposit");
    expect(a.amountIn).toBe("1000000000");
    expect(await listActiveFunding(db)).toHaveLength(1);
    expect(await getFundingAttempt(db, a.id, bob.id)).toBeUndefined();
    await updateFundingStatus(db, a.id, { status: "underpaid", oneclickStatus: "INCOMPLETE_DEPOSIT" });
    expect(await listActiveFunding(db)).toHaveLength(1); // underpaid can still be topped up
    await updateFundingStatus(db, a.id, { status: "credited", oneclickStatus: "SUCCESS" });
    expect(await listActiveFunding(db)).toHaveLength(0);
  });

  it("enforces unique deposit addresses", async () => {
    const u = await upsertUser(db, "alice.near");
    await insertFundingAttempt(db, funding(u.id, "dep1"));
    await expect(insertFundingAttempt(db, funding(u.id, "dep1"))).rejects.toThrow();
  });

  it("records buys incl. skipped ones and lists in-flight buys", async () => {
    const u = await upsertUser(db, "alice.near");
    const base = { userId: u.id, amountIn: asBaseUnits("100000000"), targetAsset: "nep141:btc.omft.near", destinationAddress: "bc1q" };
    await insertBuy(db, { ...base, quoteRef: "q-skip", status: "skipped_cost", costBps: 1542 });
    const b = await insertBuy(db, { ...base, quoteRef: "q-1", status: "sent", depositAddress: "dep9" });
    expect((await listInFlightBuys(db)).map((x) => x.quoteRef)).toEqual(["q-1"]);
    await updateBuy(db, b.id, { status: "success", completedAt: new Date() });
    expect(await listInFlightBuys(db)).toHaveLength(0);
    expect(await listBuysByUser(db, u.id)).toHaveLength(2);
    await expect(insertBuy(db, { ...base, quoteRef: "q-1", status: "sent" })).rejects.toThrow();
  });
});
