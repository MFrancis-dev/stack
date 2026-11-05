# Submission (K11.6, K11.7)

One attempt per repository: `POST https://nearhackathon.com/api/applications`, or the form at https://nearhackathon.com/#apply. Open 2026-11-01 to 2026-11-14 23:59 UTC. Re-read https://nearhackathon.com/HACKATHON.md first (K11.5). **Never commit the filled payload: it contains personal data.**

## What the human decides (never guessed or filled in by an agent)

| Field | Rule | Value |
|---|---|---|
| projectName | 2–80 chars | suggested: `Stack` |
| leadName | 2–80 chars | human |
| email | max 160, ≤ 2 submissions per email | human |
| size | `1`, `2 - 4`, `4 - 6`, `6 - 8` or `8+` | human |
| tracks | every track it fits | suggested: `["defi"]` |
| nearAddress | prize payout account on NEAR (named or 64-char implicit), created by the team in a wallet | human |
| projectUrl | public repo, unique | `https://github.com/MFrancis-dev/stack` |
| demoUrl | the human's public demo post on X | human, after K11.4 |
| idea | 20–2000 chars: problem, product, how NEAR fits | draft below, human approves |
| consent | `true` only after the human agrees to: "I agree that the organizers may use these details to review our submission and contact us about this hackathon." | human |

`requestId`: generate once with `node -e 'console.log(crypto.randomUUID())'` and reuse it on any retry. Do not add other fields (`website` is a spam trap).

## Draft `idea` (about 1,050 characters)

Saving into Bitcoin or Ether every week usually means a centralized exchange that can freeze withdrawals, funds stuck on the wrong chain, and small buys that lose a lot to fixed fees: a $10 BTC buy costs about 15%, a $100 buy about 1.6%. Stack is a personal savings vault on NEAR. You fund it once from almost any token on any chain; NEAR Intents (1Click) converts it to USDC in your vault. On your schedule the vault buys BTC, ETH or NEAR through NEAR Intents and the coins go straight to an address you own on their native chain. Before every buy Stack checks a live quote, and if the fees are above your limit that week is skipped and nothing is spent. The rules live in your vault's Rust contract: only you can withdraw or change where coins go, at most one buy per period, never more than your amount, and pause is always one tap. The backend keeper can only trigger buys within those limits. Try it with no wallet or funds at https://stack-savings.vercel.app/demo; the README has "do X, see Y" steps and the trust assumption.

## Order of steps
1. K11.5: re-read the live HACKATHON.md; check nothing changed.
2. Human publishes the demo post (K11.4) and gives the link.
3. Agent builds the payload from the human's answers and prints the full JSON.
4. Human says yes → send once → expect **201**; record the date and `requestId` in ROADMAP (not the payload).
5. Mistakes later → https://nearhackathon.com/request-changes (never resubmit).
