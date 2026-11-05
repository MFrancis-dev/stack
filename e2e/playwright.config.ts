import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// Runs against demo mode only (zero config, no wallet, no funds). Roadmap: K7.6, K9.2
// E2E_BASE_URL=https://… runs the same journey against a deployed copy instead of a local server.
const remote = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: ".",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: remote ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: remote
    ? undefined
    : {
        command: "pnpm demo",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        cwd: path.resolve(import.meta.dirname, ".."),
        timeout: 180_000,
      },
});
