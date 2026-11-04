# PRD — Stack

> Working name. **"Save into BTC, ETH or NEAR on autopilot — from any chain, into an address you own."**
> NEAR HACKATHON · Track **01 Unstoppable DeFi** (`defi`) · Deadline 2026-11-14 23:59 UTC
> Sister project (separate repo, separate submission): **Settle** — track 08 (`realworld`). See §13.
> Every contribution updates `ROADMAP.md` (see `AGENTS.md`).

---

## 1. What we are building

Stack is a cross-chain **dollar-cost-averaging (DCA) vault**.

1. The user signs in with a NEAR wallet; Stack creates their **personal vault** (a NEAR contract account only they control).
2. They fund it with **any token from any chain** supported by NEAR Intents; it arrives in the vault as USDC.
3. They set a plan: target asset (BTC, ETH or NEAR), **their own address** on that chain, amount per buy, schedule, and a maximum cost (slippage + fees).
4. On schedule, the vault buys through NEAR Intents (1Click API) and the asset lands **directly in the user's own address**. No exchange account, no custodian, nobody can switch it off.
5. If a buy would cost more than the user's limit, it is skipped and recorded. Every step shows where the money is.

One sentence for judges: **"Fund from anything → buys on schedule within your cost limit → coins land in your own wallet on their native chain."**

---

## 2. The problem

- Savers in high-inflation countries (Nigeria, Argentina, Turkey, Egypt, Pakistan…) watch local currency lose value; the usual way to save into BTC/ETH is a centralized exchange that can freeze withdrawals, collapse, or block their country.
- Funds sit on the wrong chain; moving them means bridges, wrapped tokens and several wallets.
- Hidden slippage and fees eat small, regular buys — especially fixed network fees on BTC payouts.
- Mid-swap, users can't see where their money is; failures leave funds stuck.

---

## 3. Who it's for

| Persona | Description | Need |
|---|---|---|
| **Tunde, salaried engineer (Lagos)** | Gets paid monthly; wants 20% into BTC automatically. | Set-and-forget saving into his own BTC wallet. |
| **Lucía, freelancer (Buenos Aires)** | Holds USDC on Base and some SOL. | Turn idle stablecoins into ETH weekly without an exchange. |
| **Multi-chain holder** | Assets on 3–4 chains. | One place to fund from anywhere and accumulate one asset. |

Not for: traders wanting leverage, perps, lending or yield (v1).

---

## 4. Goals and non-goals

### Goals
- G1. Fund the vault from any token/chain supported by 1Click.
- G2. Scheduled buys deliver the target asset to the user's **own** address on its native chain.
- G3. On-chain limits make the vault safe even if Stack's server is compromised: funds leave only to the owner or to a bounded scheduled buy.
- G4. A hard cost limit: buys over the limit are skipped, never executed.
- G5. Full transparency: every deposit, buy, skip and withdrawal with links.
- G6. A judge can try it in under 3 minutes with no funds (dry-run + demo mode).

### Non-goals
- Invoicing or receiving client payments (that is **Settle**, a separate project).
- Leverage, perps, lending, yield.
- Fiat on/off-ramp.
- Price prediction or trading strategies beyond fixed schedules (v1).

---

## 5. User stories

- US-1. Sign in with my NEAR wallet; my vault is created for free.
- US-2. Fund my vault from any token on any chain: pick token, amount, refund address; get a deposit address; see it arrive as USDC.
- US-3. Set my plan: target asset, my address on that chain (typed twice, chain named), amount per buy, interval, max cost %.
- US-4. Before saving the plan, see the expected cost % for that buy size (small BTC buys are mostly fees).
- US-5. Start, pause and resume. Pausing is always one click.
- US-6. See balance, next buy time, and every buy: amount in, amount out, price, cost %, links; skipped buys with the reason.
- US-7. Withdraw any amount of USDC to my NEAR account at any time.
- US-8. Recover any other token someone sent to my vault.
- US-9. Export a CSV with the USD value of each buy (for tax).
- US-10. As a judge, open demo mode, preview a real buy quote (dry-run), fast-forward a month of buys including a skipped one.

---

## 6. Functional requirements

### 6.1 Vault
- FR-1. Sign-in via NEP-413 signed message.
- FR-2. Stack creates one vault per user via a factory contract; app pays gas + storage. New vault: **paused, no target, no destination**.
- FR-3. Only the owner can: set the plan, resume, change the schedule, withdraw, recover tokens (all with a full wallet signature). Pause is a plain owner call.
- FR-4. The vault rejects nothing silently: stray tokens can be recovered by the owner.

### 6.2 Funding
- FR-5. Fund via 1Click: `EXACT_INPUT` any asset → USDC on NEAR, recipient = vault, refund to the user's origin address.
- FR-6. Or a direct USDC transfer on NEAR.
- FR-7. Verify quote signatures; statuses: awaiting, detected, processing, credited, underpaid, refunded, failed, expired.

### 6.3 Scheduled buys
- FR-8. Plan fields: target asset (from 1Click token list: BTC, ETH, NEAR in MVP), destination address, amount per buy (USDC), interval (daily / weekly / custom), max cost (bps).
- FR-9. Scheduler, per due vault: quote `EXACT_INPUT` USDC → target, recipient = destination, refund = vault; verify signature; check the quote matches the on-chain plan; compute cost from the quote's USD values; skip if over the limit.
- FR-10. On-chain the vault enforces: keeper-only trigger, at most one buy per interval, at most `amount_per_run`, never while paused.
- FR-11. Track each buy to `success | refunded | failed`; refunds return to the vault.
- FR-12. If the balance is below the buy amount, buy the remainder only if it passes the cost check.

### 6.4 Transparency
- FR-13. Dashboard: vault balance, next buy, total bought, average price, total cost paid.
- FR-14. "Where is my money" panel for any in-flight deposit or buy.
- FR-15. CSV: date (UTC), type, amount in, asset out, amount out, USD value, cost %, status, links.

### 6.5 Demo and dry-run
- FR-16. Dry-run quotes for funding and buys.
- FR-17. Demo mode: fictional vault, fast-forward 30 days (including a skipped buy), no secrets, no external DB.

---

## 7. Non-functional requirements
- **Safety first**: no admin path to user funds; bounded keeper; instant pause.
- **Honesty**: never show unconfirmed statuses.
- **Secrets** in env vars only.
- **Plain language**; mobile-friendly.

---

## 8. Success criteria (judging)
1. `pnpm demo` on a fresh clone → vault dashboard with history.
2. Fund preview: "SOL on Solana → USDC in vault" real dry-run quote.
3. Plan screen shows the cost % for $10 vs $100 BTC buys.
4. Fast-forward → buys recorded, one skipped for cost.
5. Read the contract: funds can only go to the owner or a bounded buy.
6. CSV opens in a spreadsheet.
Plus a real deposit and buy in the demo video.

---

## 9. Scope

**MVP:** factory + vault contracts with all invariants tested · onboarding · funding via 1Click + direct · plan setup · scheduler with cost guard · status tracking · dashboard · withdraw · recover tokens · CSV · demo + dry-run · README.

**Stretch:** vault controls its own BTC address via **Chain Signatures** (organizer-suggested) · in-contract quote signature check · multiple targets (e.g. 70% BTC / 30% ETH) · "buy more when price drops X%" rule · withdraw to any chain · owner-approved contract upgrades.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Keeper key stolen → buys redirected | Bounded to one `amount_per_run` per interval per vault; owner pause; off-chain signature + plan match; documented in README |
| Contract bug locks funds | Small contract, every invariant tested, `withdraw` always available, failure callbacks restore state |
| Deposit address not registered on USDC → every buy fails | Register before transfer 🔍 |
| Small BTC buys mostly fees | Cost shown at setup; cost guard skips |
| Factory drained by vault spam | Session required, one vault per account, daily cap |
| Two projects, ten days | ROADMAP cut line; contract first |

---

## 11. Hard questions

**What would break?** deposit addresses not storage-registered · keeper compromise (bounded) · vault creation cost without global contracts · a stuck callback · fees on small buys · the AI screener can't run it without secrets · funding quotes expiring on slow chains.

**Edge cases:** destination address typo (permanent loss) · NEAR target needs the owner registered on `wrap.near` · user withdraws while a buy is in flight (transfer fails cleanly, buy retried next interval) · stray tokens sent to the vault · funding underpaid from an exchange · 1Click no route · paused with a buy in flight · plan changed mid-interval.

**Overengineering to avoid:** per-vault accounting of "savings vs spending" (everything in the vault is savings) · locks (no shared balances to race on) · refund bookkeeping (refunds simply return to the vault) · monorepo · queues · reconcile jobs.

Details: `ARCHITECTURE.md` §11.

---

## 12. Open questions
- Q1. Does 1Click storage-register NEAR deposit addresses?
- Q2. Global contracts available for cheap vault deploys?
- Q3. Quote USD field names for the cost check.
- Q4. `/v0/status` enum.
- ~~Q5. Owner-approved upgrade path: MVP or stretch?~~ Decided (KD-5): no upgrades; vaults are immutable.

---

## 13. Relationship to Settle (hackathon rule Q-015)
Stack and Settle are **independent projects** by the same team: separate repositories, separate codebases (no shared packages), separate demos and submissions. Each README names the other. Stack has no invoicing; Settle has no savings.

## 14. Hackathon deliverables
Public repo + README ("do X → see Y"), MIT LICENSE, libraries listed, README names Settle · demo post on X (@NEARProtocol, #NEARHackathon) · submission with track `defi`.
