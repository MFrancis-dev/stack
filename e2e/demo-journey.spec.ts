import { expect, test } from "@playwright/test";

// PRD §8 judge journey, demo mode only. Roadmap: K7.6
test("a judge can try Stack end to end with no wallet and no funds", async ({ page }) => {
  // 1. Landing → demo → own example vault
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Put your savings on a schedule." })).toBeVisible();
  await page.getByRole("link", { name: "See it with example data" }).click();
  await page.getByRole("button", { name: "Open the demo" }).click();
  await expect(page.getByText("Your stack")).toBeVisible();
  await expect(page.getByLabel("Demo mode")).toBeVisible();
  await expect(page.getByText(/From 3 buys totalling \$300/)).toBeVisible();

  // 2. Fund preview: SOL on Solana → dollars in the vault
  const nav = page.getByRole("navigation", { name: "Sections" });
  await nav.getByRole("link", { name: "Add funds" }).click();
  await page.getByLabel("You send").selectOption("nep141:sol.omft.near");
  await page.getByLabel("How much SOL").fill("2");
  await page.getByLabel(/Your refund address/).fill("4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T");
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByText(/2 SOL becomes about \$/)).toBeVisible();

  // 3. Plan: a $10 BTC buy is mostly fees, and the page says so
  await nav.getByRole("link", { name: "Plan", exact: true }).click();
  await page.getByLabel("Each buy, in US dollars").fill("10");
  await expect(page.getByText(/Small BTC buys are mostly network fees/)).toBeVisible();

  // 4. Fast-forward 30 days: more buys, one skipped for fees
  await page.getByRole("button", { name: "Fast-forward 30 days" }).click();
  await expect(page.getByText(/30 days later: \d+ buys, 1 skipped for fees/)).toBeVisible();

  // 5. History explains skips; CSV export works
  await nav.getByRole("link", { name: "History" }).click();
  await expect(page.getByText("Skipped: fees too high").first()).toBeVisible();
  await expect(page.getByText(/Fees were .*% limit\. Nothing was spent\./).first()).toBeVisible();
  const csv = await page.request.get("/api/export.csv");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect((await csv.text()).split("\r\n")[0]).toBe("date_utc,type,status,amount_in,asset_in,amount_out,asset_out,usd_value_in,cost_bps,deposit_address,near_tx,destination_tx");

  // Pause is one tap and always visible
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();

});

test("signed-out visits to app pages land on the landing page", async ({ page }) => {
  await page.goto("/plan");
  await expect(page).toHaveURL(/\/\?next=%2Fplan$/);
});
