import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "./client";

// Roadmap: K0.6
describe("db client", () => {
  it("runs a query on in-memory PGlite with no DATABASE_URL", async () => {
    const db = createDb({ pgliteDataDir: "memory://" });
    const rows = await db.execute(sql`select 1 + 1 as two`);
    expect(JSON.stringify(rows)).toContain("2");
  });
});
