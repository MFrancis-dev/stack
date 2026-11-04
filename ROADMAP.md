# ROADMAP — Stack (track 01 · `defi`)

> All remaining work to get this repo to **100% readiness** (submitted, public, demoable, judged-ready).
> **Every contribution updates this file in the same change** (AGENTS.md §0): task status, phase %, Readiness table, Blockers if any, and one Update-log line.
> Deadline: **2026-11-14 23:59 UTC**. Target submission: **2026-11-14 12:00 UTC** (sister project Settle submits on the 13th).

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done (add date) · `[!]` blocked (reason in Blockers) · `[-]` dropped (reason) · 👤 = human-only task · 🔍 = verify in docs · ⛔ = needs a human decision

---

## Readiness

| Phase | Target dates | Progress | Status |
|---|---|---|---|
| D. Design & docs | Nov 4 | 100% | ✅ done |
| 0. Setup & verification | Nov 4–5 | 20% | in progress |
| 1. Contracts | Nov 5–7 | 0% | in progress (state drafted) |
| 2. Core logic (`lib/core`) | Nov 6–7 | 0% | in progress (drafted) |
| 3. Integrations (1Click, NEAR, DB) | Nov 7–8 | 0% | in progress (schema drafted) |
| 4. API routes | Nov 8–9 | 0% | not started |
| 5. Worker (scheduler) | Nov 9–10 | 0% | not started |
| 6. UI | Nov 9–11 | 0% | not started |
| 7. Demo mode & dry-run | Nov 11 | 0% | not started |
| 8. Hardening & edge cases | Nov 11–12 | 0% | not started |
| 9. Deploy & real run | Nov 12 | 0% | not started |
| 10. README & public repo | Nov 12–13 | 0% | not started |
| 11. Launch: video, post, submission | Nov 13–14 | 0% | not started |
| 12. After submission | Nov 14–25 | 0% | not started |
| **Overall (MVP)** | | **~10%** | |

Phase % = done tasks ÷ non-dropped tasks in that phase. Overall = average of phases, with D counted.

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

_None yet._ Format: `- [task id] what blocks it · who can unblock · since date`

## Decisions

| ID | Decision | Status |
|---|---|---|
| KD-1 | Factory + one vault per owner; keeper creates; new vault paused | ✅ decided |
| KD-2 | No relayer; owner actions are wallet txs | ✅ decided |
| KD-3 | No split, no locks; buy refunds return to the vault | ✅ decided |
| KD-4 | Single Next.js app + worker + `contracts/`; PGlite local/demo, Postgres hosted | ✅ decided |
| KD-5 | Owner-approved vault upgrades in MVP? | ⛔ open → decide by Nov 6 (affects K1.x) |
| KD-6 | MVP target assets (BTC, ETH, NEAR) and chains | ⛔ open → K0.10 |
| KD-7 | Working name "Stack" final? | ⛔ open → K0.1 |

---

## Phase 0 — Setup & verification (Nov 4–5)

- [ ] **K0.1** 👤 Confirm product name
- [x] **K0.2** `git init`, `.gitignore`, MIT `LICENSE`, README stub naming Settle (👤 approves first commit) · 2026-11-04: first commit approved and made; README links Settle; PR + issue templates added
- [ ] **K0.3** 👤 Create a **private** GitHub repo + remote (public in K10.6)
- [x] **K0.4** (2026-11-04: installed with pnpm 11.17, exact versions pinned (Next 15.5.28, zod 3.25.76, Drizzle 0.36.4, PGlite 0.2.17, 1Click SDK 0.1.26); typecheck, lint, test (11 todo) and `next build` (18 pages, 11 API routes) all pass) Scaffold Next.js 15 + TS strict + Tailwind + shadcn/ui + ESLint/Prettier + vitest + Playwright; scripts per AGENTS.md §5
- [x] **K0.5** (2026-11-04: rustc 1.98.1, cargo-near 0.22.0; near-sdk pinned =5.30.0, near-workspaces =0.24.0; `cargo check` clean; `pnpm contracts:build` → vault 110.5 KB, factory 107.6 KB wasm; `cargo test` 15 ignored stubs) `contracts/` Cargo workspace (factory, vault, tests) with `cargo-near` + near-workspaces; `rust-toolchain.toml`
- [~] **K0.6** (2026-11-04: drizzle switch, env.ts, .env.example done; db client + check-env stubs) Drizzle with PGlite / Postgres switch; `lib/server/env.ts`, `.env.example`, `scripts/check-env.ts`
- [ ] **K0.7** CI: typecheck, lint, test, `cargo test`, gitleaks
- [ ] **K0.8** 👤 Register a 1Click partner JWT
- [ ] **K0.9** 🔍 Does 1Click storage-register NEAR deposit addresses? (K-B1)
- [ ] **K0.10** 🔍 + ⛔ Asset ids/decimals for USDC (NEAR), BTC, ETH, NEAR from `/v0/tokens` → KD-6
- [ ] **K0.11** 🔍 Quote USD field names for the cost check; `/v0/status` enum; deposits after deadline
- [ ] **K0.12** 🔍 Global contracts availability + cost per vault (K-B5)
- [ ] **K0.13** 🔍 Wallet selector package + NEP-413 + batched owner transactions
- [ ] **K0.14** 👤 Create factory and keeper NEAR accounts; fund the factory for vault storage and the keeper for gas
- [x] **K0.15** Scaffold full folder structure: every file from `project_structure.md` as a stub with its roadmap id, data models + contract state drafted · 2026-11-04

## Phase 1 — Contracts (Nov 5–7) — **critical path**

- [~] **K1.1** (2026-11-04: `Vault` + `VaultView` structs and `new` written; `get_state` stubbed) Vault state + `new` + `get_state` (paused, no plan)
- [ ] **K1.2** `set_plan` (1 yocto, range checks), `resume` (1 yocto, plan required), `pause` (owner)
- [ ] **K1.3** `ft_on_transfer` (accept any NEP-141, event)
- [ ] **K1.4** `execute_buy`: keeper, bounds, deposit-address storage registration, `ft_transfer`, failure callback restoring `last_run_at_s`
- [ ] **K1.5** `withdraw`, `recover_token` (owner, 1 yocto)
- [ ] **K1.6** NEP-297 events for every state change
- [~] **K1.7** (2026-11-04: `Factory` state, `new`, `get_vault` written; `create_vault_for` stubbed) Factory: `create_vault_for` (keeper, one per owner, daily cap), deploy (global or embedded), USDC storage for the vault, `get_vault`
- [ ] **K1.8** near-workspaces setup with mock USDC
- [ ] **K1.9** Tests: I1–I7 one each
- [ ] **K1.10** Tests: failed transfer callback, insufficient balance, stray token recovery, daily cap, unauthorized callers
- [ ] **K1.11** If KD-5 = yes: owner-approved `upgrade_to(hash)` + tests
- [ ] **K1.12** `contracts/README.md`: methods, build, test
- [ ] **K1.13** 👤 Approve deployment; deploy factory (+ global vault code if used); record account ids

## Phase 2 — Core logic `lib/core` (Nov 6–7)

- [ ] **K2.1** `money.ts` · tests
- [ ] **K2.2** `cost.ts`: `cost_bps` from quote USD values · tests
- [ ] **K2.3** `planMatch.ts`: quote recipient/asset/amount vs `get_state()` · tests incl. mismatches
- [~] **K2.4** (2026-11-04: unions + both mappings written) `status.ts`: funding + buy unions and mapping · tests for every status
- [ ] **K2.5** `address.ts`: validators for BTC, ETH (per chain), NEAR · tests
- [~] **K2.6** (2026-11-04: interfaces + schemas drafted) `adapters.ts` interfaces (`QuoteProvider`, `StatusProvider`, `VaultClient`), `schemas.ts`

## Phase 3 — Integrations (Nov 7–8)

- [ ] **K3.1** `lib/oneclick`: client, tokens cache, funding + buy quotes (dry/real), verify, status, submit
- [ ] **K3.2** Fixtures for every status + valid/tampered signatures
- [ ] **K3.3** `lib/near`: rpc (`get_state`, `ft_balance_of`), nep413 verify, factory + vault bindings, keeper signer (server only), event parsing
- [~] **K3.4** (2026-11-04: all 3 tables written; migration not generated) `lib/db`: schema (users, funding_attempts, buys) + migration + queries

## Phase 4 — API routes (Nov 8–9)

- [ ] **K4.1** Session + `middleware.ts`
- [ ] **K4.2** `POST /api/onboard` (keeper `create_vault_for`, once)
- [ ] **K4.3** `GET /api/vault`, `GET /api/tokens`
- [ ] **K4.4** Funding: quote (dry/real, rate limit), submit-tx, status
- [ ] **K4.5** `POST /api/plan/preview` (cost % for a buy size)
- [ ] **K4.6** `GET /api/buys`, `GET /api/export.csv`
- [ ] **K4.7** Route tests (happy + validation + auth)

## Phase 5 — Worker (Nov 9–10)

- [ ] **K5.1** `worker/index.ts`, graceful shutdown
- [ ] **K5.2** `pollFunding` · tests
- [ ] **K5.3** `scheduleBuys`: due check → quote → verify → plan match → cost check → `execute_buy` → submit · tests for skip, no_quote, mismatch, success
- [ ] **K5.4** `pollBuys` · tests
- [ ] **K5.5** `expireQuotes`; low keeper-gas alert

## Phase 6 — UI (Nov 9–11)

- [ ] **K6.1** Landing, sign-in, onboarding (vault created)
- [ ] **K6.2** Fund page: token picker, amount, refund address, dry preview, deposit panel, live status
- [ ] **K6.3** Plan page: target asset, address typed twice + chain name, amount, interval, max cost, **cost preview**, one batched wallet tx (`set_plan` + `resume`)
- [ ] **K6.4** Pause / resume always visible
- [ ] **K6.5** Dashboard: balance, next buy, totals, average price, where-is-my-money
- [ ] **K6.6** History: deposits, buys, skips (with reason), withdrawals; tx links
- [ ] **K6.7** Settings: withdraw, recover tokens
- [ ] **K6.8** Mobile + accessibility pass

## Phase 7 — Demo mode & dry-run (Nov 11)

- [ ] **K7.1** Demo adapters (`DemoVaultClient`, demo quote/status)
- [ ] **K7.2** `seed-demo.ts`: vault with plan, deposits, 3 weeks of buys incl. `skipped_cost`
- [ ] **K7.3** `pnpm demo`: PGlite + seed + banner; real dry quotes online, fixtures offline
- [ ] **K7.4** "Fast-forward 30 days"
- [ ] **K7.5** Fresh-clone check with no `.env`
- [ ] **K7.6** Playwright journey = PRD §8, in CI

## Phase 8 — Hardening & edge cases (Nov 11–12)

- [ ] **K8.1** Destination address safety (typed twice, chain named, validation)
- [ ] **K8.2** NEAR target: owner registered on `wrap.near`
- [ ] **K8.3** Withdraw during an in-flight buy (clean failure, retried next interval)
- [ ] **K8.4** Balance below buy amount (remainder only if it passes the cost check)
- [ ] **K8.5** Funding underpaid from an exchange: warning + status
- [ ] **K8.6** 1Click down / no route → `no_quote`
- [ ] **K8.7** Rate limits; logs without secrets
- [ ] **K8.8** Re-run all contract invariant tests against the deployed code hash

## Phase 9 — Deploy & real run (Nov 12)

- [ ] **K9.1** 👤 Pick hosting (web, worker, Postgres); set production env vars
- [ ] **K9.2** Deploy app + worker; hosted demo reachable
- [ ] **K9.3** 👤 Approve one small real deposit (any chain → vault)
- [ ] **K9.4** 👤 Approve one small real scheduled buy (short interval) → asset lands in the owner's address
- [ ] **K9.5** 👤 Approve a withdraw test
- [ ] **K9.6** Record all tx links; fix anything found

## Phase 10 — README & public repo (Nov 12–13)

- [ ] **K10.1** README: what, problem, how NEAR Intents + vault contracts are used, "do X → see Y", demo URL
- [ ] **K10.2** README: architecture summary, invariants, **keeper trust assumption**, limitations
- [ ] **K10.3** README: libraries/templates used; code written in the hackathon window
- [~] **K10.4** (2026-11-04: README links the Settle repo; keep it in the final README) README names **Settle** as the team's other, independent project (Q-015)
- [ ] **K10.5** LICENSE; `.env.example` complete; gitleaks clean
- [ ] **K10.6** 👤 Make the repo public
- [ ] **K10.7** Fresh-clone check from the public URL

## Phase 11 — Launch (Nov 13–14)

- [ ] **K11.1** Video script: saver's problem → fund from another chain → buy lands in own wallet → NEAR's role → next step
- [ ] **K11.2** 👤 Record the video
- [ ] **K11.3** Draft the X post (@NEARProtocol #NEARHackathon, optional @NearLegion @NearBuilders, repo + demo links)
- [ ] **K11.4** 👤 Publish; paste URL here
- [ ] **K11.5** Re-read live HACKATHON.md
- [ ] **K11.6** Draft submission payload (track `defi`); print it for the human
- [ ] **K11.7** 👤 Confirm; submit once (keep `requestId`); record the 201

## Phase 12 — After submission (Nov 14–25)

- [ ] **K12.1** Keep hosted demo + worker running until at least Nov 18 (ideally Nov 25)
- [ ] **K12.2** Keep the keeper funded; monitor alerts
- [ ] **K12.3** Repo public through judging; no breaking changes to the demo
- [ ] **K12.4** Watch Discord/X for judge questions

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

- 2026-11-04 · Claude · First commit (approved): README cross-links Settle, PR template with ROADMAP + hackathon-rule checklist, issue template · K0.2, K10.4
- 2026-11-04 · Claude · Installed deps (pnpm 11, esbuild approved), pinned exact JS + Rust versions, ESM package, lint config allows `_` stub params, build-contracts.sh now builds both wasm; typecheck/lint/test/build/cargo check/wasm build all green · K0.4, K0.5
- 2026-11-04 · Claude · Scaffolded the repo (126 files): configs, contracts workspace (vault + factory state, method stubs, I1–I7 test stubs), every route/page/component/lib/worker stub with roadmap ids, Drizzle schema, core types + statuses, zod env/schemas, test todos, `git init` (no commit, deps not installed, nothing compiled) · K0.2, K0.4–K0.6, K0.15, K1.1, K1.7, K2.4, K2.6, K3.4
- 2026-11-04 · Claude · Split from the combined design into its own project; wrote PRD, ARCHITECTURE, ESSENTIALS, AGENTS, CLAUDE, project_structure, ROADMAP · D
