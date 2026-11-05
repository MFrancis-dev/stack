import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as tickRoute from "@/app/api/cron/tick/route";
import { createDb, type Db } from "../lib/db/client";
import { setServicesForTest, type Services } from "../lib/server/adapters";
import type { Logger, WorkerDeps } from "./deps";
import { runTick, TICK_LOOPS } from "./tick";

// Roadmap: K9.2
const SECRET = ["tick", "test", "secret", "0123456789"].join("-");
let db: Db;
const alerts: string[] = [];
const log: Logger = { info: () => {}, warn: () => {}, alert: (msg, data) => alerts.push(`${msg}:${String(data?.loop)}`) };

beforeEach(async () => {
  db = createDb({ pgliteDataDir: "memory://" });
  await db.migrate();
  alerts.length = 0;
  process.env.CRON_SECRET = SECRET;
});
afterEach(() => {
  delete process.env.CRON_SECRET;
});
afterAll(() => setServicesForTest(null));

describe("worker tick", () => {
  it("runs every loop once, in order, and keeps going after a failure", async () => {
    const ran: string[] = [];
    const loops = [
      { name: "a", run: async () => void ran.push("a") },
      { name: "b", run: async () => { ran.push("b"); throw new Error("boom"); } },
      { name: "c", run: async () => void ran.push("c") },
    ];
    const result = await runTick({ db, log } as unknown as WorkerDeps, loops);
    expect(ran).toEqual(["a", "b", "c"]);
    expect(result).toEqual({ a: "ok", b: "failed", c: "ok" });
    expect(alerts).toEqual(["worker tick loop failed:b"]);
  });

  it("settles in-flight work before scheduling new buys", () => {
    const names = TICK_LOOPS.map((l) => l.name);
    expect(names.indexOf("pollBuys")).toBeLessThan(names.indexOf("scheduleBuys"));
    expect(names.indexOf("pollFunding")).toBeLessThan(names.indexOf("scheduleBuys"));
  });

  it("the route needs the cron secret", async () => {
    const res = await tickRoute.GET(new Request("http://localhost/api/cron/tick"));
    expect(res.status).toBe(401);
  });

  it("the route runs a pass with no keeper configured and nothing to do", async () => {
    const status = { status: vi.fn() };
    setServicesForTest({ db, quotes: {}, status, listTokens: async () => [], near: null, vault: null } as unknown as Services);
    const res = await tickRoute.GET(new Request("http://localhost/api/cron/tick", { headers: { authorization: `Bearer ${SECRET}` } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.keeper).toBe("not configured");
    expect(Object.values(body.loops).every((v) => v === "ok")).toBe(true);
  });
});
