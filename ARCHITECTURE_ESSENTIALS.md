# ARCHITECTURE ESSENTIALS — Stack (track 01)

> Quick reference for coding agents. Full: `ARCHITECTURE.md`. Product: `PRD.md`. Layout: `project_structure.md`. Work left: `ROADMAP.md`.
> **Every contribution updates `ROADMAP.md`.** If code disagrees with a rule here, stop and ask.

## One line
Fund a personal NEAR vault from any token on any chain → it buys BTC/ETH/NEAR on schedule within a cost limit → coins land in the owner's own address. Track `defi`.

## Independence (hackathon Q-015)
Separate repo from **Settle** (track 08). Never import Settle code; README names Settle.

## ✅ Decided
- Factory + one vault per owner; keeper creates vaults after NEP-413 sign-in; new vault paused, no plan
- No relayer; owner actions are wallet transactions
- Everything in a vault is the owner's savings: no split, no locks, buy refunds return to the vault
- Single Next.js app + `worker/` + `contracts/` (no monorepo)
- PGlite local/demo, Postgres when `DATABASE_URL` is set

## ⛔ Pending — don't build until the human decides
- Owner-approved vault upgrades (K-B7)

## 🔍 Verify before coding against
1. 1Click storage-registers NEAR deposit addresses? (K-B1)
2. Quote USD fields for the cost check
3. `/v0/status` enum · deposits after deadline
4. USDC id/decimals + BTC/ETH asset ids (from `/v0/tokens`)
5. Global contracts (K-B5) · wallet selector package

## Stack
Rust near-sdk 5.x + cargo-near + near-workspaces · Next.js 15 + TS strict · Tailwind + shadcn/ui · TanStack Query · zod · Drizzle (PGlite/Postgres) · 1Click SDK ≥ 0.1.24 · vitest + Playwright · pnpm

## Contract rules (non-negotiable)
1. USDC leaves only via `withdraw` (to owner) or `execute_buy` (bounded).
2. `execute_buy`: keeper · not paused · plan set · once per `interval_s` · `amount ≤ amount_per_run` · register deposit address before `ft_transfer` · callback restores `last_run_at_s` on failure.
3. `set_plan`, `resume`, `withdraw`, `recover_token`: owner + 1 yocto. `pause`: owner, no deposit.
4. `create_vault_for`: keeper only · one per owner · daily cap.
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
`users` (near_account_id, vault_account_id, is_demo) · `funding_attempts` (deposit_address uniq, quote_raw, signature, status) · `buys` (quote_ref uniq, cost_bps, deposit_address, status)
On-chain vault = truth for plan + balance.

## Worker
`pollFunding` 5 s · `scheduleBuys` 60 s · `pollBuys` 10 s · `expireQuotes` 60 s · alert on low keeper gas

## Demo & dry-run
`pnpm demo` = zero secrets, PGlite, seeded vault + history, fast-forward 30 days with one `skipped_cost`. Never moves funds.

## Never
Add an admin withdraw path · use an unverified quote · show unconfirmed statuses · commit secrets · deploy, sign with real keys, send funds, post, push or submit without the human's explicit OK · finish a contribution without updating `ROADMAP.md`

## Env
`NEAR_RPC_URL FACTORY_ACCOUNT_ID USDC_CONTRACT_ID KEEPER_ACCOUNT_ID KEEPER_PRIVATE_KEY ONECLICK_BASE_URL ONECLICK_JWT DATABASE_URL SESSION_SECRET PUBLIC_APP_URL`
