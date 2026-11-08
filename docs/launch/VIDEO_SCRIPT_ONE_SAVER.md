# Demo video script: "One saver, one month" (K11.1)

An alternative to [`VIDEO_SCRIPT.md`](VIDEO_SCRIPT.md). It tells one saver's story instead of explaining features. About 85 seconds, recorded on the hosted demo at https://stack-savings.vercel.app.

| Time | On screen | Voiceover |
|---|---|---|
| 0:00–0:10 | Landing page, coins dropping in | "Meet a saver who puts $100 into Bitcoin every week. On an exchange, someone else holds those coins. On small buys, fees quietly take a share." |
| 0:10–0:15 | Stay on the headline "Savings on a schedule" | "Stack is a personal savings vault on NEAR that does the buying for you." |
| 0:15–0:30 | Scroll to **Fees, checked every week**, drag from $100 to $30, then back | "Before every buy, Stack checks the fees. $100 of Bitcoin costs about 1.75%, so it goes ahead. At $30, fees pass the 3% limit, so that week is skipped and nothing is spent." |
| 0:30–0:38 | Press **Try it with example data**, then **Open the demo** | "This demo uses example data, so you don't need a wallet or any money." |
| 0:38–0:46 | Overview: the stack and $996.70 | "Here's a saver four weeks in. Three buys went to their own Bitcoin address. One week was skipped." |
| 0:46–1:00 | **Add funds**: SOL on Solana, amount 2, **Preview** | "Need to top up? Pay from what you already hold, like SOL on Solana. NEAR Intents converts it into dollars in your vault, with no bridge and no exchange account." |
| 1:00–1:10 | **Fast-forward 30 days**, then **History**, pointing at the skipped row | "A month later, the plan kept buying on its own. When fees spiked, it skipped the week and said why." |
| 1:10–1:20 | Press **Pause**, then go back to the landing page | "The limits live in your vault's contract on NEAR. One buy per period, never above your amount, and only you can withdraw." |
| 1:20–1:25 | Show the site address and GitHub link | "Stack. Built at NEAR HACKATHON. Try the demo and tell me what fee limit you'd set." |

## Before you record

- **Refund address:** the Add funds preview needs a Solana refund address. Paste this example before recording so the scene doesn't stall: `4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T`.
- **Fresh data:** press **Start over** in the demo banner, so the dates are recent.
- **Fee numbers:** say "about", because live prices move. If NEAR Intents is reachable, the Add funds preview can differ a little from take to take.

## Keep these lines as written

- **"This demo uses example data":** the contracts aren't deployed yet, so judges shouldn't think they're watching real money move.
- **"Only you can withdraw":** this is what the vault contract's rules enforce, and tests cover it. Avoid "nobody can freeze it", because the money in the vault is USDC, which its issuer can freeze.
