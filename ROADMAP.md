# ROADMAP — Stack (track 01 · `defi`)

> All remaining work to get this repo to **100% readiness** (submitted, public, demoable, judged-ready).
> **Every contribution updates this file in the same change** (AGENTS.md §0): task status, phase %, Readiness table, Blockers if any, and one Update-log line.
> **GitHub issues:** every task, open decision and stretch item has an issue on https://github.com/MFrancis-dev/stack/issues (linked next to its id). Hackathon rules checklist: [#1](https://github.com/MFrancis-dev/stack/issues/1). Keep issues and this file in sync (AGENTS.md §0.6).
> Deadline: **2026-11-14 23:59 UTC**. Target submission: **2026-11-14 12:00 UTC** (sister project Settle submits on the 13th).

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done (add date) · `[!]` blocked (reason in Blockers) · `[-]` dropped (reason) · 👤 = human-only task · 🔍 = verify in docs · ⛔ = needs a human decision

---

## Readiness

| Phase | Target dates | Progress | Status |
|---|---|---|---|
| D. Design & docs | Nov 4 | 100% | ✅ done |
| 0. Setup & verification | Nov 4–5 | 80% | in progress (K0.9 blocked on K0.8; K0.8, K0.14 👤) |
| 1. Contracts | Nov 5–7 | 92% | in progress (K1.13 deploy is 👤) |
| 2. Core logic (`lib/core`) | Nov 6–7 | 100% | ✅ done |
| 3. Integrations (1Click, NEAR, DB) | Nov 7–8 | 80% | in progress (K3.5 blocked on K0.8) |
| 4. API routes | Nov 8–9 | 100% | ✅ done |
| 5. Worker (scheduler) | Nov 9–10 | 100% | ✅ done |
| 6. UI | Nov 9–11 | 100% | ✅ done |
| 7. Demo mode & dry-run | Nov 11 | 100% | ✅ done |
| 8. Hardening & edge cases | Nov 11–12 | 89% | in progress (K8.8 blocked on deploy) |
| 9. Deploy & real run | Nov 12 | 17% | in progress (hosted demo live; worker + real run need K1.13/K0.8) |
| 10. README & public repo | Nov 12–13 | 100% | ✅ done (hosted URL added) |
| 11. Launch: video, post, submission | Nov 13–14 | 0% | not started |
| 12. After submission | Nov 14–25 | 0% | not started |
| **Overall (MVP)** | | **~76%** | |

Phase % = done tasks ÷ non-dropped tasks in that phase. Overall = average of all 14 rows (D + phases 0–12). (Earlier entries over-estimated the overall %; recalculated 2026-11-04.)

## Definition of 100% readiness

- [ ] Every MVP task in phases 0–11 is `[x]` or `[-]` with a reason
- [ ] `cargo test` passes, with one test per invariant I1–I7
- [ ] `pnpm demo` works on a fresh clone with no `.env`, no keys, no external DB
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e` pass in CI
- [ ] Contracts deployed; hosted demo URL up and in the README
- [ ] One real deposit + one real scheduled buy completed and linked
- [ ] README: what, problem, how NEAR is used, "do X → see Y", keeper trust assumption, libraries, names **Settle**
- [ ] Repo public with MIT LICENSE
- [ ] Demo post live on X (@NEARProtocol, #NEARHackathon)
- [ ] Submission accepted (HTTP 201) with track `defi`

## Blockers

- [K0.9] Real (non-dry) 1Click quotes need a partner JWT · 👤 human via K0.8 (partners.near-intents.org) · since 2026-11-04
- [K8.8] Re-running invariant tests against the deployed code needs the contracts deployed (K1.13) · 👤 human · since 2026-11-05
- [K3.5] Confirming quote-signature verification needs a real quote → needs the partner JWT (K0.8) · 👤 human · since 2026-11-04

Format: `- [task id] what blocks it · who can unblock · since date`

## Decisions

| ID | Decision | Status |
|---|---|---|
| KD-1 | Factory + one vault per owner; keeper creates; new vault paused | ✅ decided |
| KD-2 | No relayer; owner actions are wallet txs | ✅ decided |
| KD-3 | No split, no locks; buy refunds return to the vault | ✅ decided |
| KD-4 | Single Next.js app + worker + `contracts/`; PGlite local/demo, Postgres hosted | ✅ decided |
| KD-5 [#2](https://github.com/MFrancis-dev/stack/issues/2) | Owner-approved vault upgrades in MVP? → **No.** Vaults are immutable; an owner can always withdraw and open a new vault | ✅ decided 2026-11-04 |
| KD-6 [#3](https://github.com/MFrancis-dev/stack/issues/3) | MVP target assets → **BTC (native) `nep141:btc.omft.near`, ETH (Ethereum) `nep141:eth.omft.near`, NEAR `nep141:wrap.near`** | ✅ decided 2026-11-04 |
| KD-7 [#4](https://github.com/MFrancis-dev/stack/issues/4) | Working name → **"Stack" is final** | ✅ decided 2026-11-04 |
| KD-8 [#106](https://github.com/MFrancis-dev/stack/issues/106) | Vault deploy → **regular deploy** (admin uploads the vault wasm to the factory once; ~1.5 NEAR locked per 137 KB vault, recoverable). Never a global contract by account | ✅ decided 2026-11-04 |

---

## Phase 0 — Setup & verification (Nov 4–5)

- [x] **K0.1** [#5](https://github.com/MFrancis-dev/stack/issues/5) 👤 Confirm product name · 2026-11-04: "Stack" confirmed (KD-7)
- [x] **K0.2** [#6](https://github.com/MFrancis-dev/stack/issues/6) `git init`, `.gitignore`, MIT `LICENSE`, README stub naming Settle (👤 approves first commit) · 2026-11-04: first commit approved and made; README links Settle; PR + issue templates added
- [x] **K0.3** [#7](https://github.com/MFrancis-dev/stack/issues/7) 👤 Create the GitHub repo + remote · 2026-11-04: created **public** at https://github.com/MFrancis-dev/stack on the human's instruction; `origin` set; `main` pushed
- [x] **K0.4** [#8](https://github.com/MFrancis-dev/stack/issues/8) (2026-11-04: installed with pnpm 11.17, exact versions pinned (Next 15.5.28, zod 3.25.76, Drizzle 0.36.4, PGlite 0.2.17, 1Click SDK 0.1.26); typecheck, lint, test (11 todo) and `next build` (18 pages, 11 API routes) all pass) Scaffold Next.js 15 + TS strict + Tailwind + shadcn/ui + ESLint/Prettier + vitest + Playwright; scripts per AGENTS.md §5
- [x] **K0.5** [#9](https://github.com/MFrancis-dev/stack/issues/9) (2026-11-04: rustc 1.98.1, cargo-near 0.22.0; near-sdk pinned =5.30.0, near-workspaces =0.24.0; `cargo check` clean; `pnpm contracts:build` → vault 110.5 KB, factory 107.6 KB wasm; `cargo test` 15 ignored stubs) `contracts/` Cargo workspace (factory, vault, tests) with `cargo-near` + near-workspaces; `rust-toolchain.toml`
- [x] **K0.6** [#10](https://github.com/MFrancis-dev/stack/issues/10) (2026-11-04: drizzle switch, env.ts, .env.example done; db client + check-env stubs) Drizzle with PGlite / Postgres switch; `lib/server/env.ts`, `.env.example`, `scripts/check-env.ts` · 2026-11-04: `lib/db/client.ts` (PGlite ↔ Postgres, in-memory test passes), `missingForRealMode()` + `pnpm check-env` (names only); worker/scripts run with `--conditions=react-server` so `server-only` doesn't throw in plain Node
- [x] **K0.7** [#11](https://github.com/MFrancis-dev/stack/issues/11) CI: typecheck, lint, test, `cargo test`, gitleaks · 2026-11-04: `.github/workflows/ci.yml` (web: typecheck/lint/test/build · contracts: cargo check + test · gitleaks); first run on `main` green (run 41886755850)
- [ ] **K0.8** [#12](https://github.com/MFrancis-dev/stack/issues/12) 👤 Register a 1Click partner JWT
- [!] **K0.9** [#13](https://github.com/MFrancis-dev/stack/issues/13) 🔍 Does 1Click storage-register NEAR deposit addresses? (K-B1) · 2026-11-04: non-dry quotes return "Failed to get quote" without a partner JWT → needs K0.8. Vault registers the deposit address anyway (safe default)
- [x] **K0.10** [#14](https://github.com/MFrancis-dev/stack/issues/14) 🔍 + ⛔ Asset ids/decimals for USDC (NEAR), BTC, ETH, NEAR from `/v0/tokens` → KD-6 · 2026-11-04: ids/decimals verified (ARCHITECTURE §12): USDC `nep141:17208628…133a1` (6), BTC `nep141:btc.omft.near` (8), ETH `nep141:eth.omft.near` (18), NEAR `nep141:wrap.near` (24). KD-6 decided: BTC, ETH, NEAR
- [x] **K0.11** [#15](https://github.com/MFrancis-dev/stack/issues/15) 🔍 Quote USD field names for the cost check; `/v0/status` enum; deposits after deadline · 2026-11-04: quote has `amountInUsd`/`amountOutUsd` (+ minAmountOut, withdrawFee, refundFee, timeEstimate, signature, timestamp); status enum = 7 values already in `status.ts`; `refundTo` must exist; BTC deposits may need ~1 h (deadline). Late-deposit behaviour still unverified
- [x] **K0.12** [#16](https://github.com/MFrancis-dev/stack/issues/16) 🔍 Global contracts availability + cost per vault (K-B5) · 2026-11-04: NEP-591 available: global publish burns 10 NEAR/100 KB (~11 NEAR for the vault), use < 0.001 NEAR; regular deploy locks ~1.1 NEAR per vault → decision KD-8
- [x] **K0.13** [#17](https://github.com/MFrancis-dev/stack/issues/17) 🔍 Wallet selector package + NEP-413 + batched owner transactions · 2026-11-04: NEAR docs now recommend `@hot-labs/near-connect` (0.12.0) + `near-api-js` (7.4.0, `nep413.verifyMessage`); both added and pinned
- [ ] **K0.14** [#18](https://github.com/MFrancis-dev/stack/issues/18) 👤 Create factory and keeper NEAR accounts; fund the factory for vault storage and the keeper for gas
- [x] **K0.15** [#19](https://github.com/MFrancis-dev/stack/issues/19) Scaffold full folder structure: every file from `project_structure.md` as a stub with its roadmap id, data models + contract state drafted · 2026-11-04

## Phase 1 — Contracts (Nov 5–7) — **critical path**

- [x] **K1.1** [#20](https://github.com/MFrancis-dev/stack/issues/20) (2026-11-04: `Vault` + `VaultView` structs and `new` written; `get_state` stubbed) Vault state + `new` + `get_state` (paused, no plan) · 2026-11-04: state, `new`, `get_state` (next_run_at_s) + unit tests
- [x] **K1.2** [#21](https://github.com/MFrancis-dev/stack/issues/21) `set_plan` (1 yocto, range checks), `resume` (1 yocto, plan required), `pause` (owner) · 2026-11-04: range checks (interval ≥ 60 s, 0 < cost ≤ 5000 bps), set_plan never unpauses
- [x] **K1.3** [#22](https://github.com/MFrancis-dev/stack/issues/22) `ft_on_transfer` (accept any NEP-141, event) · 2026-11-04: accepts any NEP-141, emits `deposited`
- [x] **K1.4** [#23](https://github.com/MFrancis-dev/stack/issues/23) `execute_buy`: keeper, bounds, deposit-address storage registration, `ft_transfer`, failure callback restoring `last_run_at_s` · 2026-11-04: bounds, optional storage_deposit for the deposit address, `on_buy_transfer` restores schedule on failure
- [x] **K1.5** [#24](https://github.com/MFrancis-dev/stack/issues/24) `withdraw`, `recover_token` (owner, 1 yocto) · 2026-11-04: `withdraw` (always available), `recover_token` (refuses USDC), both with result events
- [x] **K1.6** [#25](https://github.com/MFrancis-dev/stack/issues/25) NEP-297 events for every state change · 2026-11-04: NEP-297 `stack_vault` + `stack_factory` events
- [x] **K1.7** [#26](https://github.com/MFrancis-dev/stack/issues/26) (2026-11-04: `Factory` state, `new`, `get_vault` written; `create_vault_for` stubbed) Factory: `create_vault_for` (keeper, one per owner, daily cap), deploy (global or embedded), USDC storage for the vault, `get_vault` · 2026-11-04: USDC storage registration for the vault is **mandatory**: Intents gives no refund to an unregistered receiver (§12). Deploy method per KD-8 · 2026-11-04: admin uploads code once (`set_vault_code`, future vaults only), keeper `create_vault_for`, rollback on failed deploy, chained USDC registration + `retry_registration`
- [x] **K1.8** [#27](https://github.com/MFrancis-dev/stack/issues/27) near-workspaces setup with mock USDC · 2026-11-04: near-workspaces sandbox + `compile_project` + `mock-ft` crate
- [x] **K1.9** [#28](https://github.com/MFrancis-dev/stack/issues/28) Tests: I1–I7 one each · 2026-11-04: I1–I7 + private callbacks, all passing on the sandbox
- [x] **K1.10** [#29](https://github.com/MFrancis-dev/stack/issues/29) Tests: failed transfer callback, insufficient balance, stray token recovery, daily cap, unauthorized callers · 2026-11-04: deposit-address registration, insufficient balance, factory rules, recovery, withdraw, non-owner — 49 contract tests total (24 vault unit, 9 factory unit, 16 sandbox)
- [-] **K1.11** [#30](https://github.com/MFrancis-dev/stack/issues/30) If KD-5 = yes: owner-approved `upgrade_to(hash)` + tests · 2026-11-04: dropped: KD-5 = no upgrades in MVP
- [x] **K1.12** [#31](https://github.com/MFrancis-dev/stack/issues/31) `contracts/README.md`: methods, build, test · 2026-11-04: `contracts/README.md` build/test/deploy order; method tables in ARCHITECTURE §3
- [ ] **K1.13** [#32](https://github.com/MFrancis-dev/stack/issues/32) 👤 Approve deployment; deploy factory (+ global vault code if used); record account ids

## Phase 2 — Core logic `lib/core` (Nov 6–7)

- [x] **K2.1** [#33](https://github.com/MFrancis-dev/stack/issues/33) `money.ts` · tests · 2026-11-04: bigint `toBaseUnits`/`formatAmount`/`parseScaled`, tests incl. 0, 1 unit, > 2^64
- [x] **K2.2** [#34](https://github.com/MFrancis-dev/stack/issues/34) `cost.ts`: `cost_bps` from quote USD values · tests · 2026-11-04: `costBps` (rounded up, null when unknown) + `checkCost`, tested with real quote numbers
- [x] **K2.3** [#35](https://github.com/MFrancis-dev/stack/issues/35) `planMatch.ts`: quote recipient/asset/amount vs `get_state()` · tests incl. mismatches · 2026-11-04: `quoteMatchesPlan` checks paused/plan, dry, deposit address, origin USDC, asset, recipient, refundTo = vault, amount ≤ per-run
- [x] **K2.4** [#36](https://github.com/MFrancis-dev/stack/issues/36) (2026-11-04: unions + both mappings written) `status.ts`: funding + buy unions and mapping · tests for every status · 2026-11-04: unions + both mappings, tested against the 7-value SDK enum
- [x] **K2.5** [#37](https://github.com/MFrancis-dev/stack/issues/37) `address.ts`: validators for BTC, ETH (per chain), NEAR · tests · 2026-11-04: checksummed: BTC bech32/bech32m + base58check, EVM EIP-55, NEAR named/implicit (BIP-173/350, EIP-55 vectors); adds `@noble/hashes` 2.2.0 + `@scure/base` 2.4.0
- [x] **K2.6** [#38](https://github.com/MFrancis-dev/stack/issues/38) (2026-11-04: interfaces + schemas drafted) `adapters.ts` interfaces (`QuoteProvider`, `StatusProvider`, `VaultClient`), `schemas.ts` · 2026-11-04: adapters (QuoteSummary echoes originAsset/refundTo), schemas (plan form: address twice + checksum + on-chain limits), `assets.ts` with KD-6 ids

## Phase 3 — Integrations (Nov 7–8)

- [x] **K3.1** [#39](https://github.com/MFrancis-dev/stack/issues/39) `lib/oneclick`: client, tokens cache, funding + buy quotes (dry/real), verify, status, submit · 2026-11-04: `lib/oneclick`: configure, tokens (10-min cache, stale on outage), funding/buy EXACT_INPUT requests, per-chain deadlines, `requestQuote` (real quotes fail closed on bad signature), status + submit, readable errors
- [x] **K3.2** [#40](https://github.com/MFrancis-dev/stack/issues/40) Fixtures for every status + valid/tampered signatures · 2026-11-04: real dry-quote fixtures (BTC $100, ETH $10) + status fixtures for all 7 values; tampered/unknown cases tested
- [x] **K3.3** [#41](https://github.com/MFrancis-dev/stack/issues/41) `lib/near`: rpc (`get_state`, `ft_balance_of`), nep413 verify, factory + vault bindings, keeper signer (server only), event parsing · 2026-11-04: `lib/near`: rpc views, NEP-297 event parsing, vault/factory bindings, keeper signer (server-only), NEP-413 `verifySignIn` (tested with a real signature), `nearVaultClient` adapter
- [x] **K3.4** [#42](https://github.com/MFrancis-dev/stack/issues/42) (2026-11-04: all 3 tables written; migration not generated) `lib/db`: schema (users, funding_attempts, buys) + migration + queries · 2026-11-04: first migration (`drizzle/0000_…sql`), `db.migrate()` for PGlite + Postgres, queries for users/funding/buys, terminal-status sets; tested on in-memory PGlite
- [!] **K3.5** [#110](https://github.com/MFrancis-dev/stack/issues/110) 🔍 Verify 1Click quote signatures on real quotes · 2026-11-04: SDK 0.1.26 `verifyQuoteSignature` fails on real unauthenticated dry quotes; real quotes fail closed until verified with the partner JWT (K0.8)

## Phase 4 — API routes (Nov 8–9)

- [x] **K4.1** [#43](https://github.com/MFrancis-dev/stack/issues/43) Session + `middleware.ts` · 2026-11-04: NEP-413 challenge (signed 5-min cookie) + verify + HMAC session cookie; middleware redirects signed-out page visits
- [x] **K4.2** [#44](https://github.com/MFrancis-dev/stack/issues/44) `POST /api/onboard` (keeper `create_vault_for`, once) · 2026-11-04: keeper `create_vault_for` once per user (findVault first), rate-limited; 503 with guidance when not configured
- [x] **K4.3** [#45](https://github.com/MFrancis-dev/stack/issues/45) `GET /api/vault`, `GET /api/tokens` · 2026-11-04: `GET /api/vault` (state + USDC balance), `GET /api/tokens` (public, cached)
- [x] **K4.4** [#46](https://github.com/MFrancis-dev/stack/issues/46) Funding: quote (dry/real, rate limit), submit-tx, status · 2026-11-04: dry preview (nothing stored) / real attempt with deposit address; submit-tx; status refreshed from 1Click on read incl. expiry; 20/min rate limit
- [x] **K4.5** [#47](https://github.com/MFrancis-dev/stack/issues/47) `POST /api/plan/preview` (cost % for a buy size) · 2026-11-04: dry quotes need an existing `refundTo` → use the owner's account before the vault exists · 2026-11-04: dry buy quote → cost bps + suggested minimum; example recipients; refund to the user's account before a vault exists
- [x] **K4.6** [#48](https://github.com/MFrancis-dev/stack/issues/48) `GET /api/buys`, `GET /api/export.csv` · 2026-11-04: `GET /api/buys`; CSV export (UTC, USD value per buy, formula-safe)
- [x] **K4.7** [#49](https://github.com/MFrancis-dev/stack/issues/49) Route tests (happy + validation + auth) · 2026-11-04: 16 route tests on real handlers (in-memory PGlite, fake 1Click/NEAR, real NEP-413 signature); 84 TS tests total

## Phase 5 — Worker (Nov 9–10)

- [x] **K5.1** [#50](https://github.com/MFrancis-dev/stack/issues/50) `worker/index.ts`, graceful shutdown · 2026-11-04: entry + `startLoops` runner (no overlap, errors logged, SIGINT/SIGTERM wait for ticks); smoke-run OK with no env
- [x] **K5.2** [#51](https://github.com/MFrancis-dev/stack/issues/51) `pollFunding` · tests · 2026-11-04: status mapping, expiry past deadline, underpaid alert, per-attempt error isolation
- [x] **K5.3** [#52](https://github.com/MFrancis-dev/stack/issues/52) `scheduleBuys`: due check → quote → verify → plan match → cost check → `execute_buy` → submit · tests for skip, no_quote, mismatch, success · 2026-11-04: due/in-flight/backoff/empty checks, min(per-run, balance), cost → plan match → insert-then-execute → submit; every skip/refusal/failure recorded with a note (new `buys.note`, migration 0001)
- [x] **K5.4** [#53](https://github.com/MFrancis-dev/stack/issues/53) `pollBuys` · tests · 2026-11-04: final status, actual amountOut + destination tx from swapDetails, refund reason
- [x] **K5.5** [#54](https://github.com/MFrancis-dev/stack/issues/54) `expireQuotes`; low keeper-gas alert · 2026-11-04: DB-only quote expiry; keeper balance alert below 1 NEAR

## Phase 6 — UI (Nov 9–11)

- [x] **K6.1** [#55](https://github.com/MFrancis-dev/stack/issues/55) Landing, sign-in, onboarding (vault created) · 2026-11-05: built and reviewed in the browser (landing, redirect and signed-out states); signed-in views re-checked with demo data in Phase 7
- [x] **K6.2** [#56](https://github.com/MFrancis-dev/stack/issues/56) Fund page: token picker, amount, refund address, dry preview, deposit panel, live status · 2026-11-05: built and reviewed in the browser (landing, redirect and signed-out states); signed-in views re-checked with demo data in Phase 7
- [x] **K6.3** [#57](https://github.com/MFrancis-dev/stack/issues/57) Plan page: target asset, address typed twice + chain name, amount, interval, max cost, **cost preview**, one batched wallet tx (`set_plan` + `resume`) · 2026-11-05: built and reviewed in the browser (landing, redirect and signed-out states); signed-in views re-checked with demo data in Phase 7
- [x] **K6.4** [#58](https://github.com/MFrancis-dev/stack/issues/58) Pause / resume always visible · 2026-11-05: built and reviewed in the browser (landing, redirect and signed-out states); signed-in views re-checked with demo data in Phase 7
- [x] **K6.5** [#59](https://github.com/MFrancis-dev/stack/issues/59) Dashboard: balance, next buy, totals, average price, where-is-my-money · 2026-11-05: built and reviewed in the browser (landing, redirect and signed-out states); signed-in views re-checked with demo data in Phase 7
- [x] **K6.6** [#60](https://github.com/MFrancis-dev/stack/issues/60) History: deposits, buys, skips (with reason), withdrawals; tx links · 2026-11-05: built and reviewed in the browser (landing, redirect and signed-out states); signed-in views re-checked with demo data in Phase 7
- [x] **K6.7** [#61](https://github.com/MFrancis-dev/stack/issues/61) Settings: withdraw, recover tokens · 2026-11-05: built and reviewed in the browser (landing, redirect and signed-out states); signed-in views re-checked with demo data in Phase 7
- [x] **K6.8** [#62](https://github.com/MFrancis-dev/stack/issues/62) Mobile + accessibility pass · 2026-11-05: browser-reviewed at 1280 px and 390 px (no horizontal overflow, focus styles, labels); signed-in pages to be reviewed again with demo data in Phase 7

## Phase 7 — Demo mode & dry-run (Nov 11)

- [x] **K7.1** [#63](https://github.com/MFrancis-dev/stack/issues/63) Demo adapters (`DemoVaultClient`, demo quote/status) · 2026-11-05: demo quotes (live dry first, calibrated model fallback), time-based demo status, demo vault client (`demo_vaults`, balance from rows), owner actions without a wallet; routes pick adapters by session
- [x] **K7.2** [#64](https://github.com/MFrancis-dev/stack/issues/64) `seed-demo.ts`: vault with plan, deposits, 3 weeks of buys incl. `skipped_cost` · 2026-11-05: per-visitor demo saver: weekly $100 BTC plan, 2 deposits, 4 weeks of buys incl. a fee-spike skip
- [x] **K7.3** [#65](https://github.com/MFrancis-dev/stack/issues/65) `pnpm demo`: PGlite + seed + banner; real dry quotes online, fixtures offline · 2026-11-05: `pnpm demo` + `/demo` entry + banner; token list falls back offline; browser-reviewed at 1280/390 px
- [x] **K7.4** [#66](https://github.com/MFrancis-dev/stack/issues/66) "Fast-forward 30 days" · 2026-11-05: fast-forward 30 days (same cost check, one skip) + start over
- [x] **K7.5** [#67](https://github.com/MFrancis-dev/stack/issues/67) Fresh-clone check with no `.env` · 2026-11-05: fresh `git clone` → `pnpm install` → `pnpm demo` with no `.env`: demo page 200, start 201, vault/fast-forward/CSV all OK
- [x] **K7.6** [#68](https://github.com/MFrancis-dev/stack/issues/68) Playwright journey = PRD §8, in CI · 2026-11-05: Playwright PRD §8 journey on desktop + phone (4 passing), CI job with trace upload on failure

## Phase 8 — Hardening & edge cases (Nov 11–12)

- [x] **K8.1** [#69](https://github.com/MFrancis-dev/stack/issues/69) Destination address safety (typed twice, chain named, validation) · 2026-11-05: address typed twice, checksummed per chain (BTC bech32/base58check, EIP-55, NEAR), chain named; schemas/address tests
- [x] **K8.2** [#70](https://github.com/MFrancis-dev/stack/issues/70) NEAR target: owner registered on `wrap.near` · 2026-11-04: mandatory, not nice-to-have: no refund if the owner isn't registered on `wrap.near` · 2026-11-05: `GET /api/storage-check` + plan form blocks a NEAR plan until the destination is registered on wrap.near; one-tap `storage_deposit` (0.00125 NEAR, read on-chain) from the wallet; route + tx tests
- [x] **K8.3** [#71](https://github.com/MFrancis-dev/stack/issues/71) Withdraw during an in-flight buy (clean failure, retried next interval) · 2026-11-05: contract fails the buy cleanly and retries next interval (sandbox test); Settings warns when a buy is in flight
- [x] **K8.4** [#72](https://github.com/MFrancis-dev/stack/issues/72) Balance below buy amount (remainder only if it passes the cost check) · 2026-11-05: scheduler buys min(per-run, balance) and still applies the cost check; worker test
- [x] **K8.5** [#73](https://github.com/MFrancis-dev/stack/issues/73) Funding underpaid from an exchange: warning + status · 2026-11-05: exchange-fee warning on the deposit panel, underpaid status copy, worker alert; pollFunding test
- [x] **K8.6** [#74](https://github.com/MFrancis-dev/stack/issues/74) 1Click down / no route → `no_quote` · 2026-11-05: `no_quote` recorded with a note and retried after backoff; token list falls back offline; readable 1Click errors
- [x] **K8.7** [#75](https://github.com/MFrancis-dev/stack/issues/75) Rate limits; logs without secrets · 2026-11-04: in-memory rate limits on quote, preview and onboard routes; log hygiene still to review · 2026-11-05: rate limits on quote/preview/onboard/demo-start/storage-check; log review (ids only) + `redact()` for library errors (env secrets, URL credentials, private keys); security headers (nosniff, DENY framing, referrer, permissions, COOP, HSTS in prod). No CSP yet: wallet iframes
- [!] **K8.8** [#76](https://github.com/MFrancis-dev/stack/issues/76) Re-run all contract invariant tests against the deployed code hash · 2026-11-05: blocked on K1.13 (contracts not deployed yet)
- [x] **K8.9** [#116](https://github.com/MFrancis-dev/stack/issues/116) Remove demo users older than a day · 2026-11-05: hourly `cleanupDemo` loop; test keeps fresh demo and real users

## Phase 9 — Deploy & real run (Nov 12)

- [x] **K9.1** [#77](https://github.com/MFrancis-dev/stack/issues/77) 👤 Pick hosting (web, worker, Postgres); set production env vars · 2026-11-05: human picked Vercel (account mallison031, project `stack-savings`) + Neon via the Vercel integration (new free `stack-savings-db`); `SESSION_SECRET`, `CRON_SECRET`, `PUBLIC_APP_URL` set (secrets never printed). Worker host to pick with real mode
- [~] **K9.2** [#78](https://github.com/MFrancis-dev/stack/issues/78) Deploy app + worker; hosted demo reachable · 2026-11-05: app deployed, hosted demo live at https://stack-savings.vercel.app/demo (migrations at build, daily demo-cleanup cron, cron route 401 without its secret, security headers on); Playwright journey passes against it (desktop + phone, `E2E_BASE_URL`). Fixed: overview/history showed "no buys" while the list was still loading. Left: worker on a long-running host, needed only once contracts are deployed (K1.13)
- [ ] **K9.3** [#79](https://github.com/MFrancis-dev/stack/issues/79) 👤 Approve one small real deposit (any chain → vault)
- [ ] **K9.4** [#80](https://github.com/MFrancis-dev/stack/issues/80) 👤 Approve one small real scheduled buy (short interval) → asset lands in the owner's address
- [ ] **K9.5** [#81](https://github.com/MFrancis-dev/stack/issues/81) 👤 Approve a withdraw test
- [ ] **K9.6** [#82](https://github.com/MFrancis-dev/stack/issues/82) Record all tx links; fix anything found

## Phase 10 — README & public repo (Nov 12–13)

- [x] **K10.1** [#83](https://github.com/MFrancis-dev/stack/issues/83) README: what, problem, how NEAR Intents + vault contracts are used, "do X → see Y", demo URL · 2026-11-05: what it is, the problem, how NEAR Intents + vault contracts are used, two-minute demo with a do/see table · 2026-11-05: hosted demo URL added
- [x] **K10.2** [#84](https://github.com/MFrancis-dev/stack/issues/84) README: architecture summary, invariants, **keeper trust assumption**, limitations · 2026-11-05: architecture summary, invariants I1–I7, keeper trust assumption, honest status/limitations (not deployed yet, K3.5 fail-closed, no CSP)
- [x] **K10.3** [#85](https://github.com/MFrancis-dev/stack/issues/85) README: libraries/templates used; code written in the hackathon window · 2026-11-05: libraries and tools with versions (Q-005); all code written in the hackathon window, first commit 2026-11-04
- [x] **K10.4** [#86](https://github.com/MFrancis-dev/stack/issues/86) (2026-11-04: README links the Settle repo; keep it in the final README) README names **Settle** as the team's other, independent project (Q-015) · 2026-11-05: README names Settle with a link (Q-015)
- [x] **K10.5** [#87](https://github.com/MFrancis-dev/stack/issues/87) LICENSE; `.env.example` complete; gitleaks clean · 2026-11-05: MIT LICENSE; `.env.example` complete (added `NEXT_PUBLIC_NEAR_NETWORK`); CI secret scan green
- [x] **K10.6** [#88](https://github.com/MFrancis-dev/stack/issues/88) 👤 Make the repo public · 2026-11-04: public from creation; must stay public through judging (Q-014)
- [x] **K10.7** [#89](https://github.com/MFrancis-dev/stack/issues/89) Fresh-clone check from the public URL · 2026-11-05: cloned https://github.com/MFrancis-dev/stack, no .env, `pnpm install && pnpm demo`, followed every README step: all 10 checks matched

## Phase 11 — Launch (Nov 13–14)

- [ ] **K11.1** [#90](https://github.com/MFrancis-dev/stack/issues/90) Video script: saver's problem → fund from another chain → buy lands in own wallet → NEAR's role → next step
- [ ] **K11.2** [#91](https://github.com/MFrancis-dev/stack/issues/91) 👤 Record the video
- [ ] **K11.3** [#92](https://github.com/MFrancis-dev/stack/issues/92) Draft the X post (@NEARProtocol #NEARHackathon, optional @NearLegion @NearBuilders, repo + demo links)
- [ ] **K11.4** [#93](https://github.com/MFrancis-dev/stack/issues/93) 👤 Publish; paste URL here
- [ ] **K11.5** [#94](https://github.com/MFrancis-dev/stack/issues/94) Re-read live HACKATHON.md
- [ ] **K11.6** [#95](https://github.com/MFrancis-dev/stack/issues/95) Draft submission payload (track `defi`); print it for the human
- [ ] **K11.7** [#96](https://github.com/MFrancis-dev/stack/issues/96) 👤 Confirm; submit once (keep `requestId`); record the 201

## Phase 12 — After submission (Nov 14–25)

- [ ] **K12.1** [#97](https://github.com/MFrancis-dev/stack/issues/97) Keep hosted demo + worker running until at least Nov 18 (ideally Nov 25)
- [ ] **K12.2** [#98](https://github.com/MFrancis-dev/stack/issues/98) Keep the keeper funded; monitor alerts
- [ ] **K12.3** [#99](https://github.com/MFrancis-dev/stack/issues/99) Repo public through judging; no breaking changes to the demo
- [ ] **K12.4** [#100](https://github.com/MFrancis-dev/stack/issues/100) Watch Discord/X for judge questions

---

## Stretch (only after Phase 11 or explicitly approved)
- [ ] Chain Signatures: vault controls its own BTC address
- [ ] In-contract quote signature verification
- [ ] Multiple targets (e.g. 70% BTC / 30% ETH)
- [ ] "Buy more when price drops X%" rule
- [ ] Withdraw to any chain via 1Click

---

## Update log
One line per contribution, newest first: `YYYY-MM-DD · who/agent · what changed · tasks`

- 2026-11-05 · agent · Hosted the demo on Vercel + Neon (build-time migrations, hosted DB guard, daily cleanup cron, .vercelignore, Node 22); loading states on overview/history; `E2E_BASE_URL` runs the journey against the live site (4/4 pass); README hosted URL; docs synced; `.gitleaksignore` for one fake test value (false positive) · K9.1, K9.2, K10.1
- 2026-11-05 · agent · Phase 10 README for judges and AI screeners; .env.example completed; README steps verified from a fresh clone of the public repo · K10.1–K10.5, K10.7
- 2026-11-05 · agent · Phase 8 hardening: wNEAR registration gate for NEAR plans, in-flight withdraw warning, log redaction + security headers, demo cleanup loop (new K8.9); K8.1/4/5/6 verified against existing tests; K8.8 blocked on deploy · K8.1–K8.9
- 2026-11-05 · agent · Phase 7 demo mode: per-visitor demo, demo adapters, owner actions without a wallet, fast-forward/reset, worker isolation, offline token fallback, Playwright journey in CI; fixed PGlite bundling + per-route dev session secret found in the browser; 119 unit/route tests + 4 e2e · K7.1–K7.6
- 2026-11-05 · agent · Phase 6 UI reviewed in the browser (desktop + phone, redirect and signed-out states, no server errors); sign-in button width fix · K6.1–K6.8
- 2026-11-04 · agent · Phase 6 UI built on branch feat/ui (landing, sign-in, vault creation, fund, plan + cost preview, pause/resume, overview stack, history, settings); visual review pending · K6.1–K6.8
- 2026-11-04 · agent · Phase 5 worker: pollFunding, scheduleBuys (full safety chain, backoff, insert-before-execute), pollBuys, expireQuotes, keeper gas alert, no-overlap runner; `buys.note` migration; 100 TS tests · K5.1–K5.5
- 2026-11-04 · agent · Phase 4 API: NEP-413 sessions, onboard, vault, tokens, funding (dry/real/status/submit), plan preview, buys, CSV; services seam for tests/demo; 84 TS tests · K4.1–K4.7, K8.7
- 2026-11-04 · agent · Phase 3 integrations: 1Click layer (fail-closed signatures), NEAR bindings + NEP-413 sign-in, first DB migration + queries; 66 TS tests; new K3.5 (signature verification) blocked on K0.8 · K3.1–K3.5
- 2026-11-04 · agent · Phase 2 core logic: money, cost, planMatch, address (checksums), assets, schemas; 33 TS tests · K2.1–K2.6
- 2026-11-04 · agent · Rewrote `main` history (approved force-push) to drop tool attribution lines from commit messages; every commit's files unchanged · —
- 2026-11-04 · agent · Phase 1 contracts: vault + factory implemented, mock-ft crate, 49 contract tests passing (unit + near-workspaces sandbox); wasm vault 137 KB / factory 146 KB · K1.1–K1.10, K1.12
- 2026-11-04 · agent · Decisions accepted by the human: KD-5 no upgrades, KD-6 BTC/ETH/NEAR, KD-7 name Stack, KD-8 regular deploy; K1.11 dropped; update-log actor made neutral · K0.1, K0.10, K1.11
- 2026-11-04 · agent · CI green on main (web, contracts, gitleaks) · K0.7
- 2026-11-04 · agent · Phase 0 verification: live `/v0/tokens` + dry quotes (cost data), SDK status enum, NEAR docs (global contracts, near-connect); added near-connect + near-api-js; db client + check-env + test; react-server condition for worker/scripts; CI workflow; ARCHITECTURE §12 + ESSENTIALS updated; new decision KD-8 · K0.6, K0.7, K0.9, K0.10, K0.11, K0.12, K0.13, K1.7, K4.5, K6.3, K8.2
- 2026-11-04 · agent · Created public repo MFrancis-dev/stack and pushed; GitHub labels, phase milestones and one issue per ROADMAP task, decision, stretch item + a hackathon-rules compliance issue · K0.3, K10.6
- 2026-11-04 · agent · First commit (approved): README cross-links Settle, PR template with ROADMAP + hackathon-rule checklist, issue template · K0.2, K10.4
- 2026-11-04 · agent · Installed deps (pnpm 11, esbuild approved), pinned exact JS + Rust versions, ESM package, lint config allows `_` stub params, build-contracts.sh now builds both wasm; typecheck/lint/test/build/cargo check/wasm build all green · K0.4, K0.5
- 2026-11-04 · agent · Scaffolded the repo (126 files): configs, contracts workspace (vault + factory state, method stubs, I1–I7 test stubs), every route/page/component/lib/worker stub with roadmap ids, Drizzle schema, core types + statuses, zod env/schemas, test todos, `git init` (no commit, deps not installed, nothing compiled) · K0.2, K0.4–K0.6, K0.15, K1.1, K1.7, K2.4, K2.6, K3.4
- 2026-11-04 · agent · Split from the combined design into its own project; wrote PRD, ARCHITECTURE, ESSENTIALS, AGENTS, CLAUDE, project_structure, ROADMAP · D
