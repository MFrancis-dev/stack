# ARCHITECTURE ESSENTIALS — Stack (track 01)

> Quick reference for coding agents. Full: `ARCHITECTURE.md`. Product: `PRD.md`. Layout: `project_structure.md`. Work left: `ROADMAP.md`.
> **Every contribution updates `ROADMAP.md`.** If code disagrees with a rule here, stop and ask.

## One line
Fund a personal NEAR vault from any token on any chain → it buys BTC/ETH/NEAR on schedule within a cost limit → coins land in the owner's own address. Track `defi`.

## One project
Stack is the team's only submission (the planned second project was dropped 2026-11-05). No sister project to name or link.

## ✅ Decided
- Factory + one vault per owner; keeper creates vaults after NEP-413 sign-in; new vault paused, no plan
- No relayer; owner actions are wallet transactions
- Everything in a vault is the owner's savings: no split, no locks, buy refunds return to the vault
- Single Next.js app + `worker/` + `contracts/` (no monorepo)
- PGlite local/demo, Postgres when `DATABASE_URL` is set
- **KD-5** No vault upgrades: vaults are immutable; owners withdraw and open a new vault instead
- **KD-6** Targets: BTC `nep141:btc.omft.near`, ETH `nep141:eth.omft.near`, NEAR `nep141:wrap.near`
- **KD-7** Name: Stack
- **KD-8** Regular deploy: admin uploads the vault wasm to the factory once (`set_vault_code`); ~1.5 NEAR locked per 137 KB vault. Never a global contract by account

## ⛔ Pending — don't build until the human decides
_None._

## ✅ Verified 2026-11-04 (details: ARCHITECTURE §12)
- USDC on NEAR `nep141:17208628…133a1` (6 dec) · BTC `nep141:btc.omft.near` · ETH `nep141:eth.omft.near` · NEAR `nep141:wrap.near`. Match on assetId, never symbol.
- Quote has `amountInUsd`/`amountOutUsd` → cost check works. $10 BTC buy ≈ 15% cost, $100 ≈ 1.6%.
- Status enum = the 7 values in `lib/core/status.ts`.
- `refundTo` must exist or 1Click returns "Internal server error".
- No refund if a NEAR receiver isn't storage-registered → vault on USDC and owner on `wrap.near` **must** be registered.
- Wallet: `@hot-labs/near-connect` + `near-api-js` (`nep413.verifyMessage`).
- Global contracts exist (NEP-591) → KD-8.

## 🔍 Still to verify
1. Does 1Click storage-register NEAR deposit addresses? (K-B1) — needs a real deposit; the vault registers the address anyway
2. Deposits arriving after the quote deadline
3. **K3.5** Quote signatures — real quotes work without a JWT (about 0.25% extra), but `verifyQuoteSignature()` is false on them with SDK 0.1.26: **blocked on 1Click confirming the key or hash**. Real quotes fail closed; dry previews skip the check

## Stack
Rust near-sdk =5.30.0 + cargo-near 0.22 + near-workspaces =0.24.0 · Next.js 15.5 + TS strict · Tailwind + shadcn/ui · TanStack Query · zod · Drizzle (PGlite/Postgres) · 1Click SDK 0.1.26 · `@hot-labs/near-connect` 0.12.0 + `near-api-js` 7.4.0 · vitest + Playwright · pnpm 11 (worker/scripts run with `--conditions=react-server` so `server-only` works)

## Contract rules (non-negotiable)
1. USDC leaves only via `withdraw` (to owner) or `execute_buy` (bounded).
2. `execute_buy`: keeper · not paused · plan set · once per `interval_s` · `amount ≤ amount_per_run` · keeper attaches ~0.013 NEAR so the deposit address gets registered before `ft_transfer` · callback restores `last_run_at_s` on failure.
3. `set_plan`, `resume`, `withdraw`, `recover_token`: owner + 1 yocto. `pause`: owner, no deposit.
4. `create_vault_for`: keeper only · one per owner · daily cap · vault code uploaded once by the admin (`set_vault_code`, future vaults only) · USDC registration chained after deploy.
6. Callbacks on calls that return data read `env::promise_result_checked`, never `Result<(), _>`.
5. No admin path to funds. Checked math. Events for every state change.

## 1Click rules
- Funding: `EXACT_INPUT` → USDC on NEAR · recipient = vault · refundTo = user's origin address
- Buy: `EXACT_INPUT` USDC → target · recipient = destination_address · **refundTo = vault** · slippageTolerance = max_cost_bps
- `verifyQuoteSignature()` before using `depositAddress`; quote recipient + asset must match `get_state()`
- Cost: `(1 − outUsd/inUsd) × 10_000` > max → `skipped_cost`, no tx
- Ids + decimals from `/v0/tokens`; `/v0/deposit/submit` after sending; poll `/v0/status`

## Status mapping
| 1Click | Funding | Buy |
|---|---|---|
| PENDING_DEPOSIT | awaiting_deposit | sent |
| KNOWN_DEPOSIT_TX | detected | sent |
| PROCESSING | processing | processing |
| SUCCESS | credited | success |
| INCOMPLETE_DEPOSIT | underpaid | failed |
| REFUNDED | refunded | refunded (back in vault) |
| FAILED | failed | failed |
| deadline, no deposit | expired | expired |
| no route | – | no_quote |

## Data model (amounts numeric(78,0))
`users` (near_account_id, vault_account_id, is_demo, sessions_valid_after) · `funding_attempts` (deposit_address uniq, quote_raw, signature, status) · `buys` (quote_ref uniq, cost_bps, deposit_address, status) · `rate_limits` (key, window_start, count; shared by all instances)
On-chain vault = truth for plan + balance.

## API
- Every route uses `getServices()` (lib/server/adapters.ts); tests/demo inject fakes via `setServicesForTest`
- Sign-in: GET /api/session challenge → wallet `signMessage` → POST verifies (full-access key) → signed HTTP-only cookie
- Statuses: 400 · 401 · 404 (not yours) · 409 (no vault) · 429 · 502 (1Click) · 503 (real mode not configured)
- Funding status refreshes from 1Click on read; plan preview refunds to the user's own account before a vault exists

## Worker
`pollFunding` 5 s · `scheduleBuys` 60 s · `pollBuys` 10 s · `expireQuotes` 60 s · keeper gas alert 10 min · `cleanupDemo` 60 min (demo users > 24 h)
- Hosted (serverless): one pass of each loop per `GET /api/cron/tick` every 5 min (`worker/tick.ts`, GitHub workflow, off until `WORKER_ENABLED=true`)
- NEAR plans: the destination must be registered on `wrap.near` first (`/api/storage-check`, `wnearRegisterTx`)
- Log errors through `redact()`; security headers live in next.config.ts (CSP: two directives enforced, full policy report-only until a real-wallet test, K13.10)
- Every loop is `(deps) => Promise` (worker/deps.ts) — test one tick with fakes
- scheduleBuys order: due? → not in flight / not in 15-min backoff → amount = min(per-run, balance) → quote → cost → plan match → **insert row** → execute_buy → submit
- Every skip/refusal/failure writes `buys.note`; refusals and failures `log.alert`

## Demo & dry-run
`pnpm demo` = zero secrets, PGlite (verified from a fresh clone). `/demo` → per-visitor demo saver + demo session; Never moves funds.
- Demo sessions use `servicesFor(session)` → demo quotes (live dry first, calibrated model fallback in `lib/core/feeModel.ts`, also used by the landing page's fee check), demo status (time-based), demo vault (`demo_vaults` + balance from rows)
- Owner actions in demo → `POST /api/demo/owner-tx`, same rules as the contract; `fast-forward` 30 days, `reset`; every demo action capped in Postgres (`lib/server/demoLimits.ts`)
- Real worker queries **exclude demo users**; `demo-` hashes never link to explorers
- `pnpm e2e` = Playwright PRD §8 journey on demo mode, desktop + phone, in CI
- Keep `@electric-sql/pglite` in `serverExternalPackages`; keep the dev session secret on `globalThis`

## Never
Add an admin withdraw path · use an unverified quote · show unconfirmed statuses · commit secrets · deploy, sign with real keys, send funds, post, push or submit without the human's explicit OK · finish a contribution without updating `ROADMAP.md`

## Env
`NEAR_RPC_URL FACTORY_ACCOUNT_ID USDC_CONTRACT_ID KEEPER_ACCOUNT_ID KEEPER_PRIVATE_KEY ONECLICK_BASE_URL ONECLICK_JWT DATABASE_URL SESSION_SECRET PUBLIC_APP_URL CRON_SECRET`

## Hosting
Vercel (web; `pnpm vercel-build` migrates only on production builds, and Preview/Development never use production's `DATABASE_URL`, only `PREVIEW_DATABASE_URL`) + Neon Postgres + daily cron `/api/cron/cleanup-demo`. Hosted demo: https://stack-savings.vercel.app/demo. Worker needs a long-running host (real mode only).
