# ARCHITECTURE — Stack (track 01)

> Companion to `PRD.md`. Short version: `ARCHITECTURE_ESSENTIALS.md`. File layout: `project_structure.md`. Remaining work: `ROADMAP.md`.
> Items marked **[verify]** must be confirmed against current docs before coding against them.
> Every contribution updates `ROADMAP.md`.

---

## 1. Overview

```
 User wallet (any chain)            Stack (one Next.js app + worker script)
 ───────────────────────            ───────────────────────────────────────
 funds vault ──► 1Click deposit ─┐  App: onboarding, funding quotes, plan UI
                                 │  Worker: deposit poller, scheduler, buy poller
                                 │        └──► DB (PGlite local / Postgres hosted)
                                 ▼
                    NEAR Intents ──► USDC ──► ┌──────────────────────────────┐
                                              │ NEAR                         │
                                              │ factory.stack.near           │
            keeper txs (create, buy) ───────► │  └─ v<hash>.factory… (Vault) │
            owner wallet txs (plan, withdraw)►│     holds the owner's USDC   │
                                              └──────────────┬───────────────┘
                                                             │ scheduled buy (bounded)
                                                             ▼
                                         1Click deposit → NEAR Intents (solvers)
                                                             │
                                                             ▼
                                 Owner's own BTC / ETH / NEAR address
```

### Money flow
1. **Fund:** any token (any chain) → 1Click → **USDC to the vault**. Or a direct USDC transfer.
2. **Buy:** vault → USDC to a 1Click deposit address (bounded on-chain) → **target asset to the owner's address**.
3. **Refunds:** funding refunds → the user's origin address; buy refunds → **back to the vault**.
4. **Withdraw:** vault → USDC to the owner's NEAR account.

Everything in a vault belongs to its owner. There is no split and no shared balance, so the contract needs no locks and no refund bookkeeping.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Contracts | **Rust**, `near-sdk` 5.x, `cargo-near`; tests with `near-workspaces` (local sandbox) |
| App | **Next.js 15** (App Router) + TypeScript strict, Tailwind, shadcn/ui, TanStack Query, zod |
| Wallet | **`@hot-labs/near-connect` 0.12.0** (NEAR docs' current recommendation, replaces wallet selector): `signMessage` (NEP-413 sign-in), `signAndSendTransaction` with several FunctionCall actions in one tx |
| NEAR JS | **`near-api-js` 7.4.0**: `JsonRpcProvider` for views, `near-api-js/nep413` `verifyMessage` for sign-in, keeper transactions |
| 1Click | `@defuse-protocol/one-click-sdk-typescript` ≥ 0.1.24 |
| DB | Drizzle: **PGlite** local/demo, **Postgres** when `DATABASE_URL` is set |
| Worker | `worker/index.ts` via `tsx`, interval loops, long-running host |
| Tests | cargo test + near-workspaces, vitest, Playwright |
| Package manager | pnpm (single app + `contracts/` Cargo workspace) |

---

## 3. Contracts

### 3.1 Accounts
| Account | Role |
|---|---|
| `factory.stack.near` (placeholder) | Creates vaults (keeper only), pays storage |
| `v<sha256(owner)[0..16]>.factory.stack.near` | One vault per owner |
| `keeper.stack.near` | Backend signer: `create_vault_for`, `execute_buy`. Gas-only balance, no user funds |
| USDC | Native USDC NEP-141 `17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1`, 6 decimals (verified via `/v0/tokens`, §12) |

### 3.2 Factory
```rust
pub struct Factory {
    admin: AccountId,        // uploads vault code for FUTURE vaults only; no path to funds (I5)
    keeper: AccountId,
    usdc: AccountId,
    vault_code: LazyOption<Vec<u8>>, // vault wasm uploaded once by the admin; regular deploy (KD-8)
    vaults: LookupMap<AccountId, AccountId>,
    created_today: (u64 /*day*/, u32 /*count*/),
    daily_cap: u32,
}
```
| Method | Caller | Behaviour |
|---|---|---|
| `set_vault_code()` | admin | Raw wasm as the call input (not JSON). Emits `vault_code_updated {sha256, size}`. Affects only vaults created afterwards |
| `create_vault_for(owner)` | keeper | One per owner; daily cap. Batch: create `v<sha256(owner)[0..16]>.<factory>` → fund (code storage + 0.1 NEAR) → deploy → `new(owner, keeper, usdc)`. Then `on_vault_deployed`: on failure forget the vault and free the day's slot; on success `storage_deposit` the vault on USDC (registration_only) → `on_vault_registered` emits `vault_created` or `vault_registration_failed` |
| `retry_registration(owner)` | keeper | Re-run the USDC registration for an existing vault |
| `get_vault(owner)` · `get_vault_code_hash()` · `get_config()` | view | Code hash lets anyone compare it with a vault's on-chain code hash |

### 3.3 Vault
```rust
pub struct Vault {
    owner: AccountId,
    keeper: AccountId,
    usdc: AccountId,
    target_asset: Option<String>,        // 1Click assetId, e.g. "nep141:btc.omft.near" (§12)
    destination_address: Option<String>, // owner's address on the target chain
    amount_per_run: u128,                // USDC base units
    interval_s: u64,
    max_cost_bps: u16,
    paused: bool,                        // true at creation
    last_run_at_s: u64,
}
```
| Method | Caller | Deposit | Behaviour |
|---|---|---|---|
| `new(owner, keeper, usdc)` | factory | – | paused, no plan |
| `ft_on_transfer(sender, amount, msg)` | any NEP-141 | – | Accept (return `"0"`); emit `deposited`. Non-USDC tokens are kept and recoverable |
| `set_plan(target_asset, destination_address, amount_per_run, interval_s, max_cost_bps)` | owner | **1 yocto** | Validates ranges; emits `plan_updated` |
| `resume()` | owner | **1 yocto** | Requires a complete plan |
| `pause()` | owner | – | Always available |
| `execute_buy(quote_ref, deposit_address, amount)` | keeper | storage deposit if needed | Requires `!paused`, plan set, `now ≥ last_run_at_s + interval_s`, `amount ≤ amount_per_run`. Sets `last_run_at_s = now`. If the keeper attaches NEAR, first `storage_deposit(deposit_address, registration_only)` with it (refunded if already registered); with no deposit, an unregistered address makes the transfer fail cleanly. Then `ft_transfer(deposit_address, amount)`; callback `on_buy_transfer`: success → `buy_sent`; failure → restore `last_run_at_s`, `buy_failed`. **[verify whether 1Click pre-registers, K0.9]** |
| `withdraw(amount)` | owner | **1 yocto** | `ft_transfer(owner, amount)` USDC |
| `recover_token(token, amount)` | owner | **1 yocto** | Send any other NEP-141 to the owner; refuses USDC (use `withdraw`) |
| `get_state()` | view | – | Plan, paused, `next_run_at_s` |

Balance is read with `ft_balance_of(vault)` by the app; the contract doesn't track it. An `execute_buy` larger than the balance simply fails in the USDC contract and the callback restores state.

### 3.4 Invariants (each has a test)
- I1. Vault USDC leaves only to `owner` (`withdraw`) or to a deposit address via `execute_buy`.
- I2. At most one `execute_buy` per `interval_s`, each ≤ `amount_per_run`.
- I3. No buy while paused or without a complete plan.
- I4. `set_plan`, `resume`, `withdraw`, `recover_token` require owner + 1 yocto; `pause` requires owner only.
- I5. Factory admin and keeper have no path to vault funds other than I2.
- I6. A failed transfer leaves the vault able to run at the next interval.
- I7. A new vault is paused with no plan.

### 3.5 Events (NEP-297)
Vault (`standard: stack_vault`): `deposited`, `plan_updated`, `paused`, `resumed`, `buy_sent`, `buy_failed`, `withdrawn`, `withdraw_failed`, `token_recovered`.
Factory (`standard: stack_factory`): `vault_code_updated`, `vault_created`, `vault_create_failed`, `vault_registration_failed`.

Plan limits enforced on-chain: `interval_s ≥ 60`, `0 < max_cost_bps ≤ 5000`, `amount_per_run > 0`, string fields ≤ 128 chars.

**Callback rule:** a callback awaiting a call that returns data (e.g. `storage_deposit` → StorageBalance) must read `env::promise_result_checked` instead of `#[callback_result] Result<(), _>`, which would panic on deserialization.

### 3.6 Known trust assumption (README)
The keeper chooses `deposit_address`. A stolen keeper key could redirect at most one `amount_per_run` per interval per vault until the owner pauses. Off-chain: the worker verifies the quote signature and that its recipient/asset match `get_state()` before calling `execute_buy`. Stretch: verify the signature in the contract.

---

## 4. App and worker

### 4.1 API routes
| Route | Auth | Purpose |
|---|---|---|
| `GET /api/session` | public | Challenge: 32-byte nonce + message + recipient (app host), in a signed 5-min cookie |
| `POST /api/session` | NEP-413 | Verify signature (full-access key, matching nonce/message/recipient) → upsert user → HMAC-signed HTTP-only session cookie (7 days) |
| `DELETE /api/session` | – | Sign out |
| `POST /api/onboard` | session | Keeper `create_vault_for(owner)` (once) |
| `GET /api/vault` | session | `get_state()` + `ft_balance_of` + next run |
| `GET /api/tokens` | public | Cached token list |
| `POST /api/fund/quote` | session, rate-limited | `{originAsset, amount, refundTo, dry}` → preview or FundingAttempt |
| `POST /api/fund/:id/submit-tx` · `GET /api/fund/:id/status` | session | |
| `POST /api/plan/preview` | session | Dry buy quote → expected cost % for a buy size |
| `GET /api/storage-check?account=` | session, rate-limited | Is the account registered on `wrap.near`? A NEAR plan can't be saved until it is (no refund otherwise); the UI offers a one-tap `storage_deposit` (0.00125 NEAR). Demo: always yes |
| `GET /api/buys` | session | History |
| `GET /api/export.csv` | session | CSV |
| `POST /api/demo/:action` | demo session | `fast-forward`, `reset` |
| `GET /api/cron/cleanup-demo` | `Bearer $CRON_SECRET` | Vercel Cron (daily 03:00 UTC): same `cleanupDemo` as the worker loop, for hosts without the worker |
| `GET /api/cron/tick` | `Bearer $CRON_SECRET` | One pass of every worker loop (`worker/tick.ts`), in order: pollFunding → pollBuys → expireQuotes → scheduleBuys → keeper gas. Called every 5 min by `.github/workflows/worker-tick.yml` when `WORKER_ENABLED=true`. Each loop isolated |

Owner contract calls (`set_plan`, `resume`, `pause`, `withdraw`, `recover_token`) are wallet transactions built in the browser; no server involvement.

All routes go through `lib/server/adapters.ts#getServices()` (DB, 1Click, NEAR, token list). Real mode builds it from env; tests and demo mode inject their own. A missing real-mode dependency returns **503** with what to set. Errors: 400 validation, 401 session, 404 not yours, 409 no vault yet, 429 rate limit, 502 1Click.
Sessions: `SESSION_SECRET` (≥ 32 chars) is required in production; locally a per-process secret is used.

### 4.2 1Click requests

Funding (`EXACT_INPUT`): origin = user's asset, destination = USDC on NEAR, recipient = vault, refundTo = user's origin address, `recipientType: DESTINATION_CHAIN`, `refundType: ORIGIN_CHAIN`.

Buy (`EXACT_INPUT`): origin = USDC on NEAR, amount = run amount, destination = `target_asset`, recipient = `destination_address`, refundTo = **vault**, `slippageTolerance = max_cost_bps`, deadline now + 10 min.

Rules: `verifyQuoteSignature()` before using `depositAddress`; ids/decimals from `/v0/tokens`; `/v0/deposit/submit` after sending; poll `/v0/status`.

**Cost check:** `cost_bps = (1 − amountOutUsd / amountInUsd) × 10_000` from the quote (fields verified, §12). Over `max_cost_bps` → `skipped_cost`, no transaction.

**`refundTo` must be an existing NEAR account**, or 1Click answers "Internal server error". Buy quotes use the vault (exists); plan previews before a vault exists use the owner's own account.

### 4.3 Status mapping (enum verified against SDK 0.1.26, §12)
| 1Click | FundingAttempt | Buy |
|---|---|---|
| PENDING_DEPOSIT | awaiting_deposit | sent |
| KNOWN_DEPOSIT_TX | detected | sent |
| PROCESSING | processing | processing |
| SUCCESS | credited | success |
| INCOMPLETE_DEPOSIT | underpaid | failed (alert) |
| REFUNDED | refunded | refunded (USDC back in vault) |
| FAILED | failed | failed |
| deadline, no deposit | expired | expired |
| no route / API down | – | no_quote (retry next loop) |

### 4.4 Worker loops
On a long-running host `pnpm worker` runs the loops below on their intervals. On the serverless host the same loops run once per `GET /api/cron/tick` (every 5 minutes), which is enough for plans that run at most every few minutes and for funding status, which also refreshes whenever the user opens it.

| Loop | Every | Does |
|---|---|---|
| `pollFunding` | 5 s | Non-final funding attempts → 1Click status; PENDING past deadline → `expired`; alert on `underpaid`. One failing attempt never stops the others |
| `scheduleBuys` | 60 s | Per vault: skip if paused / not due / a buy is in flight / within the 15-min backoff after a skip or failure / vault empty. Amount = min(`amount_per_run`, balance). Real quote (fails closed on signature, K3.5) → cost check (`skipped_cost` + note) → plan match (`failed` "refused: …" + alert) → **insert row first** → `execute_buy` → `submitDepositTx` (best effort) |
| `pollBuys` | 10 s | In-flight buys → final status; on success the actual `amountOut` and destination tx from `swapDetails`; refunds noted with 1Click's reason |
| `expireQuotes` | 60 s | DB-only expiry of unpaid funding quotes (works while 1Click is down) |
| `keeperBalance` | 10 min | Alert below 1 NEAR — buys stop without gas |
| `cleanupDemo` | 60 min | Delete demo users older than 24 h with their rows (never real users) |

Runner: a loop never overlaps itself, errors are logged and the loop continues, SIGINT/SIGTERM wait for running ticks. Logs are JSON lines with no secrets or personal data. Rows are timestamped with the worker clock (`deps.now`), never the DB's.

---

## 5. Data model (amounts numeric(78,0) base units)

```sql
users (id uuid pk, near_account_id text unique not null, vault_account_id text unique,
       is_demo boolean default false, created_at timestamptz default now())

funding_attempts (id uuid pk, user_id uuid fk, origin_asset text not null, amount_in numeric(78,0) not null,
       expected_out numeric(78,0) not null, refund_to text not null, deposit_address text unique not null,
       quote_deadline timestamptz not null, quote_signature text not null, quote_raw jsonb not null,
       oneclick_status text, status text not null, deposit_tx_hash text, created_at timestamptz default now(),
       updated_at timestamptz default now())

buys (id uuid pk, user_id uuid fk, quote_ref text unique not null, amount_in numeric(78,0) not null,
       target_asset text not null, destination_address text not null, cost_bps int,
       amount_in_usd numeric, amount_out numeric(78,0), deposit_address text unique,
       quote_signature text, quote_raw jsonb, near_tx_hash text, oneclick_status text,
       status text not null,          -- skipped_cost|no_quote|sent|processing|success|refunded|failed|expired
       note text,                     -- why it was skipped, refused, failed or refunded (migration 0001)
       destination_tx_hash text, created_at timestamptz default now(), completed_at timestamptz)
```
On-chain vault = truth for plan and balance. DB = history and metadata.

---

## 6. Flows
- **Onboard:** sign in (NEP-413) → `POST /api/onboard` → vault created paused → dashboard.
- **Plan:** form → `POST /api/plan/preview` (cost %) → wallet tx `set_plan` + `resume` (one batched tx).
- **Fund:** pick asset + amount + refund address → dry preview → real quote → verify → send → poll → credited.
- **Buy:** scheduler (4.4) → history row → poll to final.
- **Withdraw / recover:** wallet tx.

---

## 7. Security
| Threat | Control |
|---|---|
| Stolen keeper key | I2 bounds, owner pause, signature + plan match off-chain |
| Stolen sign-in key | Can't attach 1 yocto → worst case `pause()` |
| Factory spam | Session, one vault per account, daily cap |
| Tampered quote | `verifyQuoteSignature()` |
| Admin rug | No admin path to funds (I5) |
| Secrets | `.env` only; logged errors pass through `redact()` (env secret values, URL credentials, private-key strings) |
| Clickjacking, sniffing, leaky referrers | Security headers on every response: `X-Frame-Options: DENY`, `nosniff`, `strict-origin-when-cross-origin`, restrictive `Permissions-Policy`, `COOP: same-origin-allow-popups`, HSTS in production. No CSP yet (wallet connector iframes) |
| CSRF on state-changing routes | Session cookie is `SameSite=Lax` + HTTP-only, so cross-site POSTs carry no session |
| Request floods | In-memory rate limits on quote, plan preview, onboard, storage check and demo start (single instance) |

---

## 8. Demo and dry-run
`pnpm demo` = migrate the local PGlite DB, then `next dev`. Zero secrets, no external DB (verified from a fresh clone, K7.5).

- **Per-visitor demo:** `/demo` → `POST /api/demo/start` creates a fresh `isDemo` user (`saver-<id>.demo`, vault `v<id>.vaults.demo`) with a weekly $100 BTC plan, two credited deposits ($1,296.70) and four weeks of buys including one `skipped_cost`, then signs the visitor in with a demo session. Visitors never share data.
- **Same routes, demo adapters:** `servicesFor(session)` (lib/server/adapters.ts) swaps in `demoQuotes`, `demoStatus` (lib/oneclick/demo.ts) and `demoVaultClient` (lib/near/demo.ts) on the same DB. A session whose demo flag doesn't match the user is rejected.
- **Quotes:** dry quotes try live 1Click first (stand-in refund account `near`; dry quotes move nothing) and fall back to a fee model calibrated on real quotes ($10 BTC ≈ 15%, $100 ≈ 1.75%). Non-dry demo quotes get a `demo-<ms>-<rand>` deposit address whose status advances on its own (~20 s per step → `SUCCESS`).
- **Vault:** plan in `demo_vaults.state` (migration 0002); balance derived from the user's rows (credited deposits − sent/success buys − withdrawn). Owner transactions from the UI go to `POST /api/demo/owner-tx` and follow the contract's rules (1-yocto rules aside): `set_plan` ranges, `resume` needs a plan, `withdraw` ≤ balance, `recover_token` refused.
- **Controls:** `fast-forward` (next 30 days of the plan, same cost check, one fee spike → skip) and `reset`.
- **Isolation:** real worker queries exclude demo users (`listUsersWithVault`, `listActiveFunding`, `listInFlightBuys`); demo tx hashes start with `demo-` and the UI shows "Example only" instead of explorer links.
- **Token list:** `GET /api/tokens` falls back to a small built-in list (`offline: true`) when 1Click is unreachable.

Two production bugs found by this phase's browser run (both fixed): PGlite must be a Next `serverExternalPackages` entry (bundling breaks its WebAssembly path); the dev session secret lives on `globalThis` because each Next route is its own bundle.

---

## 9. Configuration
```
NEAR_RPC_URL=
FACTORY_ACCOUNT_ID=
USDC_CONTRACT_ID=
KEEPER_ACCOUNT_ID=
KEEPER_PRIVATE_KEY=
ONECLICK_BASE_URL=https://1click.chaindefuser.com
ONECLICK_JWT=
DATABASE_URL=                # empty → PGlite
SESSION_SECRET=
PUBLIC_APP_URL=
CRON_SECRET=                 # ≥ 16 chars; Vercel sends it to the cron route
```

**Hosting (K9.1, decided 2026-11-05):** web on Vercel (project `stack-savings`, Node 22), Postgres on Neon (via the Vercel integration, pooled `DATABASE_URL`). `pnpm vercel-build` runs `drizzle-kit migrate` before `next build`; migrations SQL is traced into the API functions; `getDb()` refuses to start hosted without `DATABASE_URL`. `.vercelignore` keeps contracts and local data out of the upload. The worker needs a long-running host; it is only needed for real mode.

---

## 10. Testing
- Contracts: unit + near-workspaces for I1–I7, failed-transfer callback, deposit-address registration, stray-token recovery, daily cap.
- TS: cost check, status mapping, plan-match check, signature fixtures, NEP-413.
- E2E: PRD §8 journey in demo mode (locally, in CI, and against the hosted demo with `E2E_BASE_URL`).
- Manual: one small real deposit + buy for the video (human approval).

---

## 11. Design review: hard questions

### What would break?
| # | Break | Fix |
|---|---|---|
| K-B1 | Every buy fails: deposit address not registered on USDC | Register before `ft_transfer` 🔍 |
| K-B2 | Callback out of gas | Explicit gas; state restored; no locks to get stuck |
| K-B3 | Small BTC buys mostly fees | Cost shown at plan time; cost guard skips |
| K-B4 | AI screener can't run it | `pnpm demo`: zero secrets, PGlite |
| K-B5 | Vault creation too expensive / spammed | Regular deploy locks ~1.1 NEAR per 110 KB vault (recoverable); global contract burns ~11 NEAR once. Decision KD-8. Daily cap; shrink wasm |
| K-B6 | Funding quote expires on slow chains | Deadline per origin chain; 1Click docs: Bitcoin deposits may need ~1 hour |
| K-B7 | Contract bug can't be fixed | Accepted (KD-5): vaults are immutable; owners withdraw and open a new vault from a fixed factory |

### Edge cases
Destination typo → validate, typed twice, chain named · NEAR target → owner registered on `wrap.near` · withdraw during a buy → buy transfer fails, retried next interval · stray tokens → `recover_token` · balance < buy amount → remainder only if it passes the cost check · paused with buy in flight → completes, UI says so · plan changed mid-interval → next buy uses the new plan · 1Click no route → `no_quote`.

### Overengineering avoided
No savings/spending split · no locks · no refund bookkeeping · no relayer · single app · no reconcile job.

---

## 12. Verified facts (2026-11-04, Phase 0)

Sources: live `GET /v0/tokens`, dry `POST /v0/quote` calls (no deposit address, no funds), the installed `@defuse-protocol/one-click-sdk-typescript` 0.1.26 types, and docs.near.org.

### Asset ids (`/v0/tokens`, 215 tokens)
| Asset | 1Click assetId | Decimals | Notes |
|---|---|---|---|
| USDC on NEAR | `nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1` | 6 | vault currency |
| BTC (native) | `nep141:btc.omft.near` | 8 | blockchain `btc`; delivered to a bc1… address |
| ETH (Ethereum) | `nep141:eth.omft.near` | 18 | also ETH on Arbitrum `nep141:arb.omft.near`, Base `nep141:base.omft.near` |
| NEAR | `nep141:wrap.near` (wNEAR) | 24 | delivered as wNEAR to a NEAR account |
Watch out: some tokens share a symbol and "near" blockchain label (e.g. `miden-…` wrapped assets), and some ids use a new `1cs_v1:` prefix. Always match on **assetId**, never symbol.

### Buy cost from dry quotes (USDC on NEAR → target, slippage 1%)
| Buy size | BTC | ETH | NEAR |
|---|---|---|---|
| $10 | **1542 bps (15.4%)** | 101 bps (1.0%) | – |
| $100 | 163 bps (1.6%) | 27 bps (0.27%) | ~53 bps |
BTC's fixed network fee dominates small buys → plan UI must show this and suggest **≥ $100 per BTC buy** (K6.3). `timeEstimate`: BTC 465 s, ETH 27 s.

### Quote response shape
Top level: `correlationId`, `quote`, `quoteRequest`, `signature`, `timestamp`. `quote`: `amountIn`, `amountInFormatted`, `amountInUsd`, `amountOut`, `amountOutFormatted`, `amountOutUsd`, `minAmountIn`, `minAmountOut`, `refundFee`, `timeEstimate`, `withdrawFee` (+ `depositAddress`, `deadline` on non-dry).

### Status enum (SDK `GetExecutionStatusResponse.status`)
`KNOWN_DEPOSIT_TX`, `PENDING_DEPOSIT`, `INCOMPLETE_DEPOSIT`, `PROCESSING`, `SUCCESS`, `REFUNDED`, `FAILED` — exactly what `lib/core/status.ts` maps. Status responses also carry `quoteResponse`, `updatedAt`, `swapDetails`.

### Behaviour found
- Real (non-dry) quotes work without a JWT, with about 0.25% extra fee (tested 2026-11-05: $100 USDC → BTC ≈ 2.0%). Re-verified: `depositAddress` returned.
- Real quotes fail with "Failed to get quote" for `refundTo` = `wrap.near` or `usdt.tether-token.near`, and work for `near`, `intents.near`, `aurora` (contracts included). Likely cause, not confirmed: the refund account must be registered on the origin token. Vaults are registered on USDC by the factory; recheck with a real vault.
- `verifyQuoteSignature()` (SDK 0.1.26, the newest) is false on dry and real quotes. Hashing every combination of the extra request fields (`depositMode`, `confidentiality`, `insured`, `appFees`, `quoteWaitingTimeMs`) and optional quote fields (1,024 tries) against the SDK's key also failed, so the key or hash has likely changed (K3.5).
- 1Click refused every pair for a few hours on 2026-11-05 ("Quoting for this pair is not available"), dry quotes included; the demo fell back to the calibrated model.
- `refundTo` that doesn't exist → "Internal server error" (looks like an outage; it isn't).
- wNEAR can be delivered to named or implicit accounts, not to a contract like `wrap.near`.
- Intents withdrawals to a NEAR account **give no refund if the receiver isn't storage-registered** on the token → the factory must register the vault on USDC (K1.7) and owners must be registered on `wrap.near` before a NEAR plan (K8.2). Non-negotiable.
- `customRecipientMsg` (marked "highly experimental") delivers with `ft_transfer_call`; not needed by the vault design.
- Optional `insured: true` adds 0.02%; a LIMIT-order API exists in the SDK (relevant to the "buy the dip" stretch).
- **Quote signatures (K3.5):** SDK 0.1.26 `verifyQuoteSignature()` returns false for real, untampered unauthenticated dry quotes (the SDK hashes a fixed field list; the API now echoes `confidentiality`, `insured`, `depositMode`). Real quotes therefore **fail closed** until verification is confirmed with a partner JWT.
- Non-dry quotes without a partner JWT returned "Failed to get quote" → **K0.9 (deposit-address storage) is blocked on K0.8 (JWT)**.

### Global contracts (docs.near.org, NEP-591)
Available. Publishing burns **10 NEAR per 100 KB** (≈ 11 NEAR for the 110 KB vault, non-refundable); each user account then needs < 0.001 NEAR. A regular deploy locks ~1 NEAR per 100 KB per vault (recoverable). Docs suggest global contracts only beyond ~10 accounts. Reference **by hash** is immutable (fits invariant I5); reference by account would let the publisher change every vault's code — **never use by-account** for vaults.

### Wallet (docs.near.org "Wallet Login")
`@hot-labs/near-connect` + `near-api-js`. `wallet.signMessage({message, recipient, nonce})` for NEP-413; `wallet.signAndSendTransaction({receiverId, actions})` accepts several FunctionCall actions (so `set_plan` + `resume` is one approval). Server verification: `verifyMessage` from `near-api-js/nep413`.
