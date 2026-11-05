# Stack

Save into Bitcoin, Ether or NEAR on a schedule — funded from any token on any chain, delivered to an address you own.

NEAR HACKATHON · track 01 **Unstoppable DeFi** (`defi`) · MIT license

Stack is a personal savings vault on NEAR. You fund it once from whatever you hold (SOL on Solana, USDC on Base, ETH, …); it arrives as USDC. On your schedule the vault buys BTC, ETH or NEAR through NEAR Intents and the coins go straight to your own wallet on their native chain. Buys that would cost more than your fee limit are skipped. Only you can withdraw or change where coins go.


---

## Try it in two minutes (no wallet, no keys, no funds)

Requirements: Node 22 and pnpm 11.

```bash
git clone https://github.com/MFrancis-dev/stack.git
cd stack
pnpm install
pnpm demo          # migrates an embedded database, then starts the app on http://localhost:3000
```

No `.env` is needed. Open **http://localhost:3000/demo** and press **Open the demo**. You get your own example saver: a weekly $100 Bitcoin plan, $1,296.70 deposited from two chains and four weeks of history.

**Hosted demo:** https://stack-savings.vercel.app/demo — same demo, nothing to install. It runs only demo mode; real mode needs the deployed contracts (see Status). Shared links show a preview card (`app/opengraph-image.tsx`) and the site has its own icon (`app/icon.svg`).

### What to do, and what you should see

| Do | See |
|---|---|
| On the landing page, scroll to **Fees, checked every week**, pick Bitcoin and drag the amount to $30 | "Above your 3% limit: this week is skipped and nothing is spent." At $100 it says the buy goes ahead (about 1.75% in fees). Ether and NEAR stay under 3% at much smaller amounts |
| Open the demo | **Overview**: "Your stack" in BTC from 3 buys, $996.70 ready to buy with, the plan ("$100 of BTC, every week"), the next buy time, and a stack of bars — solid = arrived, dashed = skipped (cost nothing) |
| **Add funds** → pick "SOL on sol", amount `2`, any Solana refund address → **Preview** | "2 SOL becomes about $… in your vault". Prices are live from NEAR Intents when reachable |
| → **Get deposit address** | A demo deposit address with QR code, countdown and warnings. Status moves from waiting to "Done" in about a minute and the balance goes up by the quoted amount |
| **Plan** → change "Each buy" to `10` | The estimate shows ~15% fees and two warnings: above your limit, and "Small BTC buys are mostly network fees" |
| Press **Fast-forward 30 days** (banner) | "30 days later: N buys, 1 skipped for fees" — the stack grows and the balance drops |
| **History** | Every buy incl. "Skipped: fees too high — Fees were 4.xx%, above your 3.00% limit. Nothing was spent." **Download CSV** gives a file with the USD value of each buy |
| Press **Pause** (header) | Status turns to "Paused"; Resume brings it back |

The same journey runs automatically: `pnpm e2e` (Playwright, desktop + phone; also in CI), or against the hosted copy with `E2E_BASE_URL=https://stack-savings.vercel.app pnpm e2e`.

Launch material (demo video script, X post draft, submission guide) is in [`docs/launch/`](docs/launch/).

---

## The problem

Savers in high-inflation countries want to put part of their income into BTC or ETH regularly. The usual route is a centralized exchange that can freeze withdrawals or block a country. Funds also sit on the wrong chain, and small regular buys lose a lot to hidden spreads and fixed network fees — a $10 BTC buy costs about 15% (measured on live NEAR Intents quotes), a $100 buy about 1.6%.

## How Stack uses NEAR

| NEAR piece | Used for |
|---|---|
| **NEAR Intents (1Click API)** | Funding: any token on any chain → USDC on NEAR into the vault (`EXACT_INPUT`). Buys: vault USDC → BTC / ETH / NEAR delivered to the owner's own address on the destination chain. Live dry quotes power the fee preview |
| **Vault + factory contracts** (Rust, `near-sdk` 5.30) | One vault account per user holds their USDC and enforces the rules on-chain (below). The factory creates vaults and registers them on USDC |
| **NEP-141 / NEP-145** | USDC transfers and storage registration (vault on USDC, 1Click deposit addresses, owner on `wrap.near` before a NEAR plan — Intents gives no refund to an unregistered receiver) |
| **NEP-413** | Sign-in: the wallet signs a server-issued nonce; the server checks it's a full-access key of the account |
| **NEP-297** | Every vault/factory state change emits an event the worker parses |
| **near-connect** | Wallet connection; owner actions are signed in the user's own wallet, never by the server |

## Architecture

```
 browser (Next.js app) ──► API routes ──► 1Click API (quotes, status)
        │  owner txs signed in        │
        │  the user's wallet          ├──► DB (PGlite locally / Postgres hosted)
        ▼                             │
 vault contract  ◄── keeper (worker) ─┘   every 60 s: due? → quote → fee check → plan match → execute_buy
 (one per user)        bounded buys        then track the swap to the user's own BTC/ETH/NEAR address
```

- `contracts/` — `vault` (rules, buys, withdraw), `factory` (creates vaults), `mock-ft` (test token), `tests` (near-workspaces sandbox).
- `app/` + `components/` — pages and API routes. `lib/` — core logic, 1Click, NEAR, DB, server plumbing. `worker/` — background loops.
- Details: [ARCHITECTURE.md](ARCHITECTURE.md) · product: [PRD.md](PRD.md) · progress: [ROADMAP.md](ROADMAP.md).

## Safety model

On-chain rules (each has a test, `contracts/tests/src/invariants.rs`):

1. USDC leaves a vault only via `withdraw` (to the owner) or `execute_buy`.
2. At most one `execute_buy` per interval, each ≤ the owner's `amount_per_run`.
3. No buy while paused or without a complete plan.
4. Changing the plan, resuming, withdrawing and recovering tokens need the owner's full-access key (1 yoctoNEAR); pausing is always one plain call.
5. The factory admin and the keeper have no path to vault funds beyond rule 2.
6. A failed transfer leaves the vault able to run at the next interval.
7. A new vault is paused with no plan.

**Trust assumption (the keeper).** A backend "keeper" account triggers scheduled buys and chooses the 1Click deposit address for each one. A stolen keeper key could redirect **at most one `amount_per_run` per interval per vault** until the owner pauses (one tap). Off-chain, before every buy the worker verifies the 1Click quote signature, checks that the quote's recipient, asset, origin, refund address and amount match the vault's on-chain plan, and skips buys above the fee limit. The keeper holds only gas money.

Other protections: real quotes are refused unless their signature verifies (fail closed); destination addresses are entered twice and checksum-validated (BTC bech32/base58check, EIP-55, NEAR); sessions are HMAC-signed HTTP-only `SameSite=Lax` cookies; logs pass through a secret redactor; security headers on every response; rate limits on quote routes.

## Status and known limitations

Being honest about what is and isn't live:

- **Contracts are built and tested but not deployed yet** (ROADMAP K1.13). Real mode needs deployed contracts, funded keeper/factory accounts and a 1Click partner JWT.
- **Quote signatures:** with the newest SDK (0.1.26), `verifyQuoteSignature()` did not verify unauthenticated dry quotes. Real quotes therefore fail closed until this is confirmed with a partner JWT (ROADMAP K3.5).
- **Demo mode** uses live dry quotes when NEAR Intents is reachable and a fee model calibrated on real quotes otherwise; demo deposits complete on a timer. It never moves funds.
- **No Content-Security-Policy yet** — the wallet connector loads wallets in sandboxed iframes.
- Rate limits are in-memory (per app instance).
- **Hosting:** the web app runs on Vercel with a Neon Postgres database; demo cleanup runs as a daily Vercel Cron job. On the hosted app the worker runs as one pass every 5 minutes (`GET /api/cron/tick`, called by the `Worker tick` GitHub workflow). It stays off until real mode is configured: set the repository variable `WORKER_ENABLED=true` and the secret `CRON_SECRET`.

## Running for real

```bash
cp .env.example .env    # fill in the values; never commit .env
pnpm check-env          # lists what real mode still needs (names only, never values)
pnpm dev                # app
pnpm worker             # background loops on a long-running host (serverless hosts: /api/cron/tick, see Hosting above)
```

Contracts: `pnpm contracts:build` (cargo-near 0.22 → `contracts/target/near/`) and `pnpm contracts:test`. Deploy order: factory `new(admin, keeper, usdc, daily_cap)` → admin `set_vault_code` with the vault wasm as raw input → keeper `create_vault_for(owner)` per user (done by `POST /api/onboard`).

## Tests

```bash
pnpm typecheck && pnpm lint && pnpm test   # 127 unit + API route tests (in-memory database, fake 1Click/NEAR)
pnpm e2e                                    # Playwright judge journey on demo mode, desktop + phone
E2E_BASE_URL=https://stack-savings.vercel.app pnpm e2e   # same journey against the hosted demo
pnpm contracts:test                         # 49 contract tests: 24 vault + 9 factory unit, 16 sandbox (I1–I7 and more)
```

CI (GitHub Actions) runs all of the above plus a secret scan on every push and pull request.

## Libraries and tools used

Listed per hackathon rule Q-005. All code in this repository was written during the hackathon (first commit 2026-11-04); no pre-existing project code is included.

- **App:** Next.js 15.5, React 19, TanStack Query 5, zod 3, Tailwind CSS 4, qrcode.react 4, Google Fonts (Bricolage Grotesque, Atkinson Hyperlegible via `next/font`)
- **NEAR:** `@defuse-protocol/one-click-sdk-typescript` 0.1.26 (NEAR Intents 1Click), `near-api-js` 7.4 (RPC, NEP-413 verification, keeper signing), `@hot-labs/near-connect` 0.12 (wallet)
- **Crypto helpers:** `@noble/hashes` 2.2, `@scure/base` 2.4 (address checksums)
- **Data:** Drizzle ORM 0.36 + drizzle-kit, PGlite 0.2 (embedded Postgres), `postgres` 3.4
- **Contracts:** `near-sdk` 5.30, `near-contract-standards` 5.30 (test token only), `near-workspaces` 0.24, `cargo-near` 0.22, tokio, anyhow, serde_json
- **Tooling:** TypeScript 5.9, tsx, Vitest 2, Playwright 1.64, ESLint 9, Prettier 3, pnpm 11, nanoid, server-only
- **Design:** references from land-book.com (finance and savings sites); public-domain and Creative Commons pictures and footage from Wikimedia Commons and The Metropolitan Museum of Art, credited in the page footer and listed in `public/images/credits.json`

## License

[MIT](LICENSE). The team keeps all rights; the organizers may use the name, screenshots, video and repo link for promotion (rule Q-013).
