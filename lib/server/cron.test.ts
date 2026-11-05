import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import * as cronRoute from "@/app/api/cron/cleanup-demo/route";
import { createDb, type Db } from "../db/client";
import { setServicesForTest, type Services } from "./adapters";

// Roadmap: K8.9, K9.2
let db: Db;
beforeEach(async () => {
  db = createDb({ pgliteDataDir: "memory://" });
  await db.migrate();
  setServicesForTest({ db } as unknown as Services);
  process.env.CRON_SECRET = "test-cron-secret-0123456789";
});
afterEach(() => {
  delete process.env.CRON_SECRET;
});
afterAll(() => setServicesForTest(null));

const call = (auth?: string) => cronRoute.GET(new Request("http://localhost/api/cron/cleanup-demo", { headers: auth ? { authorization: auth } : {} }));

describe("cron: cleanup-demo", () => {
  it("rejects calls without the right bearer token", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
  });

  it("runs the cleanup with the right token", async () => {
    const res = await call("Bearer test-cron-secret-0123456789");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ removed: 0 });
  });

  it("stays closed when CRON_SECRET isn't set", async () => {
    delete process.env.CRON_SECRET;
    expect((await call("Bearer ")).status).toBe(401);
  });
});
