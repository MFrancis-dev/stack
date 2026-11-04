# Project structure — Stack

> Where every file goes. **Scaffolded 2026-11-04**: every file below exists as a stub (or drafted data model / contract state). Build features inside these files; update this file when the layout changes.
> **Every contribution updates `ROADMAP.md`** (AGENTS.md §0).

## 1. Top level

```
stack/
├─ AGENTS.md                     # rules for every coding agent (source of truth)
├─ CLAUDE.md                     # Claude Code entry; imports AGENTS, ROADMAP, ESSENTIALS
├─ ROADMAP.md                    # remaining work to 100% readiness — updated on EVERY contribution
├─ PRD.md · ARCHITECTURE.md · ARCHITECTURE_ESSENTIALS.md · project_structure.md
├─ README.md                     # judges + AI screeners; keeper trust assumption; names sister project Settle
├─ LICENSE                       # MIT
├─ .github/                       # pull_request_template.md (ROADMAP + hackathon-rule checklist), ISSUE_TEMPLATE/roadmap-task.md
├─ .env.example · .gitignore
├─ package.json                  # scripts: dev, worker, demo, test, e2e, lint, typecheck, db:*, contracts:* (exact versions, ESM)
├─ pnpm-workspace.yaml · pnpm-lock.yaml   # pnpm 11 settings (allowBuilds) + lockfile — commit both
├─ tsconfig.json · next.config.ts · postcss.config.mjs (Tailwind v4) · eslint.config.mjs · .prettierrc · vitest.config.ts · drizzle.config.ts
├─ middleware.ts
├─ contracts/                    # Rust smart contracts
├─ app/ · components/ · lib/ · worker/
├─ drizzle/                      # generated migrations — never hand-edit
├─ e2e/ · scripts/ · public/
```

Import direction (never the other way):
```
app/, worker/ ──► lib/server ──► lib/db, lib/oneclick, lib/near ──► lib/core
```

## 2. `contracts/`
```
contracts/
├─ Cargo.toml                    # workspace: factory, vault, mock-ft, tests
├─ rust-toolchain.toml
├─ factory/src/
│  ├─ lib.rs                     # state, set_vault_code, create_vault_for, views, daily cap, events
│  ├─ deploy.rs                  # sub-account + vault code deploy, on_vault_deployed
│  ├─ storage.rs                 # USDC storage_deposit, on_vault_registered, retry_registration
│  └─ tests.rs                   # unit tests
├─ vault/src/
│  ├─ lib.rs                     # state, new, get_state
│  ├─ plan.rs                    # set_plan, resume, pause
│  ├─ buy.rs                     # execute_buy + callback + deposit-address registration
│  ├─ owner.rs                   # withdraw, recover_token
│  ├─ receive.rs                 # ft_on_transfer
│  ├─ events.rs                  # NEP-297
│  ├─ ft.rs                      # NEP-141 / NEP-145 ext interface
│  └─ tests.rs                   # unit tests (rules, guards, callbacks)
├─ mock-ft/src/lib.rs            # test-only NEP-141 + NEP-145 token standing in for USDC
├─ tests/src/                    # near-workspaces
│  ├─ setup.rs                   # builds wasm (compile_project), mock USDC + factory + alice's vault
│  ├─ invariants.rs              # I1–I7 + private callbacks
│  └─ buy.rs · owner.rs · factory.rs · recover.rs
└─ README.md                     # build, test, method list
```
Unit tests next to code (`#[cfg(test)]`); cross-contract tests in `contracts/tests/`. Built wasm in `target/`, not committed.

## 3. `app/`
```
app/
├─ layout.tsx · page.tsx · globals.css      # landing: what Stack is, demo + sign in
├─ (dashboard)/
│  ├─ dashboard/page.tsx                    # balance, next buy, totals, where-is-my-money
│  ├─ fund/page.tsx                         # fund from any chain
│  ├─ plan/page.tsx                         # plan form + cost preview + pause/resume
│  ├─ history/page.tsx                      # deposits, buys, skips, withdrawals
│  └─ settings/page.tsx                     # withdraw, recover tokens
├─ demo/page.tsx
└─ api/
   ├─ session/route.ts · onboard/route.ts · vault/route.ts · tokens/route.ts
   ├─ fund/quote/route.ts · fund/[id]/submit-tx/route.ts · fund/[id]/status/route.ts
   ├─ plan/preview/route.ts · buys/route.ts · export.csv/route.ts
   └─ demo/[action]/route.ts                # fast-forward, reset
```

## 4. `components/`
```
components/
├─ ui/          # shadcn/ui
├─ fund/        # TokenPicker, AmountInput, DepositPanel, FundStatus
├─ plan/        # PlanForm (address typed twice, chain name), CostPreview, PauseButton
├─ history/     # BuyTable, SkipReason, TxLinks
├─ vault/       # BalanceCard, NextBuy, WhereIsMyMoney, WithdrawForm
└─ wallet/      # WalletProvider, SignInButton, OwnerTx (builds set_plan/resume/withdraw txs)
```

## 5. `lib/`
```
lib/
├─ core/        # pure: assets.ts (KD-6 ids), money.ts, status.ts, cost.ts (cost_bps), planMatch.ts, address.ts (checksums), adapters.ts, schemas.ts
├─ oneclick/    # client.ts, tokens.ts, quote.ts (funding + buy, verify), status.ts, demo.ts, __fixtures__/
├─ near/        # rpc.ts, nep413.ts, vault.ts (bindings), factory.ts, keeper.ts (server only), events.ts, demo.ts
├─ db/          # schema.ts, client.ts (PGlite/Postgres), queries/, seed-demo.ts
└─ server/      # SERVER ONLY: env.ts, session.ts, adapters.ts, rateLimit.ts
```

## 6. `worker/`
```
worker/index.ts · pollFunding.ts (5 s) · scheduleBuys.ts (60 s) · pollBuys.ts (10 s) · expireQuotes.ts (60 s) · alerts.ts
```

## 7. `e2e/`, `scripts/`
```
e2e/demo-journey.spec.ts                       # PRD §8
scripts/build-contracts.sh · scripts/seed-demo.ts · scripts/check-env.ts
```

## 8. Where does X go?
| Adding… | Put it in |
|---|---|
| Contract method | `contracts/vault/src/<area>.rs` + `contracts/tests/src/<area>.rs` |
| Contract binding | `lib/near/vault.ts` / `factory.ts` |
| Money / cost math | `lib/core/money.ts` / `cost.ts` + tests |
| Status / mapping | `lib/core/status.ts` |
| 1Click call | `lib/oneclick/` |
| Table or column | `lib/db/schema.ts` → `pnpm db:generate` |
| Page | `app/(dashboard)/…` |
| Background job | `worker/` |
| Secret / config | `.env` + `.env.example` + `lib/server/env.ts` |
| Demo behaviour | `lib/*/demo.ts`, `lib/db/seed-demo.ts` |

## 9. Naming
Rust `snake_case`; events `snake_case`; TS `camelCase.ts`; components `PascalCase.tsx`; routes `kebab-case`; DB `snake_case` plural, `_at` timestamps; env `SCREAMING_SNAKE_CASE`.

## 10. Never commit
`.env*` (except `.env.example`), `target/`, `node_modules/`, `.next/`, local DB files, `coverage/`, `playwright-report/`, keys.
